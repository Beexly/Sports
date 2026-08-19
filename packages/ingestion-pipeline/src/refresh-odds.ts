/**
 * refreshOdds — trigger-agnostic odds-refresh core.
 *
 * This is the single, reusable implementation of the per-cycle odds refresh
 * loop. It is intentionally decoupled from any HTTP trigger (Vercel cron route,
 * admin route, long-running worker) so every execution path runs IDENTICAL
 * logic and can never drift.
 *
 * Behavior is a 1:1 extraction of the loop previously inlined in
 * `apps/web/app/api/cron/refresh-odds/route.ts`:
 *
 *   1. Resolve the sports to process:
 *        - an explicit `sport` key → just that supported sport (or none)
 *        - otherwise → `getInSeasonSports()` (cost control on the free tier)
 *   2. For each sport, call `processSport(...)` with the same signature and
 *      readiness gates the route used.
 *   3. A per-sport failure is caught and recorded WITHOUT aborting the rest of
 *      the loop (preserves the route's resilience).
 *   4. Pause ~750ms between sports to avoid bursting the upstream API quota.
 *
 * It deliberately performs NO auth and NO readiness-gate short-circuiting — the
 * caller (route) owns those concerns so its status codes / gate responses stay
 * exactly as they are today. This function only owns the loop.
 *
 * Lives in `@sports/ingestion-pipeline` because that package already depends on
 * `@sports/data-ingestion` (sport list) and `@sports/prediction-engine`
 * (readiness gates) and `processSport`, so there is no new dependency and no
 * import cycle (data-ingestion → types only; prediction-engine → types only).
 */

import { createHash } from "node:crypto";
import { SUPPORTED_SPORTS, getInSeasonSports, resolveRundownApiKey, resolveOddsApiKey } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport } from "./process-sport.js";
import { freezeSlateCommitments, type SlateFreezeResult } from "./freeze-slate-commitments.js";

/** Production SHA-256 HashFn for the proof spine — matches process-sport.ts. */
function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Per-sport outcome — mirrors the route's `sportResults` entry shape. */
export interface RefreshOddsSportResult {
  readonly sport: string;
  readonly ok: boolean;
  readonly error?: string;
  readonly oddsInserted?: number;
  readonly provider?: string;
  readonly eventsCount?: number;
  readonly games?: number;
  readonly picks?: number;
  readonly note?: string;
}

export interface RefreshOddsResult {
  /** True only when every processed sport succeeded. */
  readonly ok: boolean;
  /** Wall-clock duration of the whole loop, in ms. */
  readonly elapsedMs: number;
  /** Count of sports that succeeded. */
  readonly okCount: number;
  /** Count of sports processed this cycle. */
  readonly totalCount: number;
  /** Per-sport outcomes, in processing order. */
  readonly results: RefreshOddsSportResult[];
  /**
   * Slate-commitment freeze outcomes (COMMIT/SKIP + reason per sport + day).
   * Surfaced so a structurally never-committing slate class is VISIBLE in the
   * cron response instead of scrolling past in logs (hostile-review fix —
   * silently discarded results are how the primetime gap would have hidden).
   */
  readonly freeze: SlateFreezeResult[];
}

/** Error thrown when an explicit `sport` key matches no supported sport. */
export class UnsupportedSportError extends Error {
  readonly sport: string;
  readonly supportedSports: string[];
  constructor(sport: string) {
    super(`Unsupported sport: ${sport}`);
    this.name = "UnsupportedSportError";
    this.sport = sport;
    this.supportedSports = SUPPORTED_SPORTS.map((s) => s.key);
  }
}

/** Inter-sport pause to avoid bursting the upstream API quota. Matches the route. */
const INTER_SPORT_PAUSE_MS = 750;

export interface RefreshOddsOptions {
  /** Optional explicit sport key. When omitted, refreshes in-season sports. */
  readonly sport?: string;
}

/**
 * Runs one full odds-refresh cycle.
 *
 * Soft-fail only when ODDS_PROVIDER=offline. Free paths:
 *   1) THE_ODDS_API_KEY (+ aliases)
 *   2) Rundown free dual-path
 *   3) ESPN public odds (zero keys) — tertiary, never invents
 * @throws {UnsupportedSportError} if `opts.sport` matches no supported sport.
 */
export async function refreshOdds(
  opts: RefreshOddsOptions = {},
): Promise<RefreshOddsResult> {
  const apiKey = resolveOddsApiKey();
  const startedAt = Date.now();

  // Soft-fail only when ODDS_PROVIDER=offline forces refuse.
  // ESPN free path always available — never invent quotes; soft-fail empty.
  const rundownKey = resolveRundownApiKey();
  if (process.env["ODDS_PROVIDER"]?.trim().toLowerCase() === "offline") {
    return {
      ok: false,
      elapsedMs: Date.now() - startedAt,
      okCount: 0,
      totalCount: 0,
      results: [{ sport: "_", ok: false, error: "ODDS_PROVIDER=offline — refusing to invent quotes" }],
      freeze: [],
    };
  }
  // processSport accepts empty Odds key → Rundown → ESPN public free path.
  const processKey =
    apiKey || (rundownKey ? "rundown-free-path" : "espn-free-path");
  const rundownOnly = !apiKey && Boolean(rundownKey);
  // Free Rundown: longer inter-sport gap to avoid 429 cascading across sports.
  // ESPN-only path: moderate gap (scoreboard+N odds calls per sport).
  const interSportPauseMs = rundownOnly
    ? Math.max(INTER_SPORT_PAUSE_MS, 2000)
    : !apiKey
      ? Math.max(INTER_SPORT_PAUSE_MS, 1500)
      : INTER_SPORT_PAUSE_MS;
  let skipRundownSports = false;

  const gates = getReadinessGates();
  const requestedSport = opts.sport ?? null;

  // Default to in-season sports only — conserves The Odds API free-tier credits
  // (500/mo across all sports). Override with ODDS_REFRESH_ALL_SPORTS=true, or
  // request a specific sport explicitly.
  const sportsToProcess = requestedSport
    ? SUPPORTED_SPORTS.filter((sport) => sport.key === requestedSport)
    : getInSeasonSports();

  if (requestedSport && sportsToProcess.length === 0) {
    throw new UnsupportedSportError(requestedSport);
  }

  const results: RefreshOddsSportResult[] = [];

  for (const sport of sportsToProcess) {
    if (skipRundownSports && rundownOnly) {
      // Still try ESPN when Rundown 429 cascade — do not skip tertiary free path.
      try {
        const res = await processSport(
          sport,
          "espn-free-path",
          gates,
          "[cron:refresh-odds]",
        );
        results.push(
          res.status === "success"
            ? {
                sport: sport.key,
                ok: true,
                oddsInserted: res.oddsInserted ?? 0,
                provider: res.provider,
                eventsCount: res.eventsCount,
                games: res.games,
                picks: res.picks,
                note:
                  (res.note ?? "") +
                  " (rundown 429 cascade → ESPN free path)",
              }
            : {
                sport: sport.key,
                ok: false,
                error: res.error ?? "ingestion failed",
                oddsInserted: res.oddsInserted ?? 0,
                provider: res.provider,
                eventsCount: res.eventsCount,
                note: res.note,
              },
        );
      } catch (err) {
        results.push({
          sport: sport.key,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      await new Promise((r) => setTimeout(r, interSportPauseMs));
      continue;
    }
    try {
      // processSport NEVER throws on a provider/normalization failure — it
      // catches internally and RESOLVES { status: "failed", error }. Inspect
      // the returned status so a failed sport is recorded as ok:false (and the
      // Healthchecks success ping cannot fire falsely on a silent failure).
      const res = await processSport(sport, processKey, gates, "[cron:refresh-odds]");
      const note = res.note ?? "";
      if (
        rundownOnly &&
        (note.includes("429") || note.includes("rate_limited") || res.provider === "therundown-empty")
      ) {
        // Only cascade-skip when the empty note is rate-limit, not honest empty board.
        if (note.includes("429") || note.includes("rate_limited")) {
          skipRundownSports = true;
        }
      }
      results.push(
        res.status === "success"
          ? {
              sport: sport.key,
              ok: true,
              oddsInserted: res.oddsInserted ?? 0,
              provider: res.provider,
              eventsCount: res.eventsCount,
              games: res.games,
              picks: res.picks,
              note: res.note,
            }
          : {
              sport: sport.key,
              ok: false,
              error: res.error ?? "ingestion failed",
              oddsInserted: res.oddsInserted ?? 0,
              provider: res.provider,
              eventsCount: res.eventsCount,
              note: res.note,
            },
      );
    } catch (err) {
      results.push({
        sport: sport.key,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Brief pause to avoid bursting the upstream API quota.
    await new Promise((r) => setTimeout(r, interSportPauseMs));
  }

  // Freeze slate commitments (commit-reveal) for the sports just processed —
  // one immutable pre-kickoff Merkle root per sport + UTC day. Strictly
  // non-fatal: the odds refresh's outcome must never hinge on the freeze pass
  // (freezeSlateCommitments also catches per-sport failures internally).
  let freeze: SlateFreezeResult[] = [];
  try {
    freeze = await freezeSlateCommitments(
      sportsToProcess.map((sport) => sport.key),
      new Date(),
      sha256Hex,
      "[cron:refresh-odds]",
    );
  } catch (freezeErr) {
    console.warn(
      `[cron:refresh-odds] slate commitment freeze pass failed: ` +
        `${freezeErr instanceof Error ? freezeErr.message : freezeErr}`,
    );
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = results.filter((r) => r.ok).length;

  return {
    ok: okCount === results.length,
    elapsedMs,
    okCount,
    totalCount: results.length,
    results,
    freeze,
  };
}
