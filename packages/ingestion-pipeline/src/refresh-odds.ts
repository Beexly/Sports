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

import { SUPPORTED_SPORTS, getInSeasonSports } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport } from "./process-sport.js";

/** Per-sport outcome — mirrors the route's `sportResults` entry shape. */
export interface RefreshOddsSportResult {
  readonly sport: string;
  readonly ok: boolean;
  readonly error?: string;
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
 * @throws {Error} if `THE_ODDS_API_KEY` is not configured.
 * @throws {UnsupportedSportError} if `opts.sport` matches no supported sport.
 */
export async function refreshOdds(
  opts: RefreshOddsOptions = {},
): Promise<RefreshOddsResult> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    throw new Error("THE_ODDS_API_KEY not configured");
  }

  const startedAt = Date.now();
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
    try {
      await processSport(sport, apiKey, gates, "[cron:refresh-odds]");
      results.push({ sport: sport.key, ok: true });
    } catch (err) {
      results.push({
        sport: sport.key,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Brief pause to avoid bursting the upstream API quota.
    await new Promise((r) => setTimeout(r, INTER_SPORT_PAUSE_MS));
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = results.filter((r) => r.ok).length;

  return {
    ok: okCount === results.length,
    elapsedMs,
    okCount,
    totalCount: results.length,
    results,
  };
}
