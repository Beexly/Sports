/**
 * MLB Stats API (statsapi.mlb.com) — free, unauthenticated official feed.
 *
 * Used as independent-signal INPUTS only:
 *  - Season standings win% → logistic fair value (never a book line)
 *  - Completed schedule scores → densify TeamGameLog when matched to Game rows
 *
 * Never invents wins/losses/scores.
 * Attribution: MLB Stats API public endpoints.
 *
 * FAIL-CLOSED CONTRACT (changed): these readers used to `return []` on any HTTP
 * error, timeout, or parse failure. That made "MLB published no standings" and
 * "statsapi.mlb.com returned 500" the SAME value, and the only production
 * consumer — `tryMlbStandingsFairValue` in
 * packages/ingestion-pipeline/src/build-independent-fair-values.ts — writes
 * whatever it gets into a 30-minute in-process cache BEFORE inspecting it:
 *
 *     const rows = await fetchMlbStandings({ season });
 *     mlbStandingsCache = { season, at: nowMs, rows };   // caches the [] too
 *     if (mlbStandingsCache.rows.length === 0) return null;
 *
 * So one transient 500 poisoned that cache with an empty table and silently
 * suppressed every MLB independent fair value for the next 30 minutes of
 * refresh cycles, with nothing logged and no run marked unhealthy. Throwing
 * instead means the caller's own `catch { return null }` runs, the cache is
 * never written, and the very next cycle retries. An outage must look like an
 * outage, never like an empty league.
 */

import { normalizeComparableText } from "./team-text-match.js";

const MLB_STATS_BASE = "https://statsapi.mlb.com/api/v1";

/**
 * Per-request ceiling. Every other upstream client in this package caps its
 * calls (12–15s); these two did not, so a hung statsapi.mlb.com held the
 * caller open until the platform killed the function — the job then reports
 * nothing at all, which is the quietest possible failure.
 */
const MLB_STATSAPI_TIMEOUT_MS = 12_000;

export class MlbStatsApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MlbStatsApiError";
  }
}

export type MlbStandingRow = {
  readonly teamId: number;
  readonly name: string;
  readonly abbreviation: string;
  readonly wins: number;
  readonly losses: number;
  readonly winPct: number;
};

export type MlbCompletedGame = {
  readonly gamePk: number;
  readonly commenceTime: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number;
  readonly awayScore: number;
};

type Loose = Record<string, unknown>;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(0.999, Math.max(0.001, x));
}

/**
 * One bounded, status-checked, JSON-decoded GET against statsapi.mlb.com.
 *
 * Throws `MlbStatsApiError` for every way the provider can misbehave — a
 * non-2xx status, a hang past the timeout, a transport error, or a 2xx whose
 * body is not JSON (a proxy/CDN error page). `fetch` does NOT throw on 4xx/5xx,
 * and `res.json()` on a 500 HTML error page throws a bare SyntaxError that
 * reads like a data problem rather than an outage — so both are converted here
 * into one typed, attributable failure.
 */
async function mlbGetJson(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Loose> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new MlbStatsApiError(
        `MLB Stats API request timed out after ${timeoutMs}ms`,
        408,
      );
    }
    throw new MlbStatsApiError(
      `MLB Stats API request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!res.ok) {
    throw new MlbStatsApiError(`MLB Stats API error: HTTP ${res.status}`, res.status);
  }
  try {
    return (await res.json()) as Loose;
  } catch (err) {
    throw new MlbStatsApiError(
      `MLB Stats API returned a non-JSON body (status ${res.status}): ` +
        `${err instanceof Error ? err.message : String(err)}`,
      res.status,
    );
  }
}

/**
 * Load current (or season) MLB standings for both leagues.
 *
 * Returns `[]` ONLY when the provider genuinely published no usable rows.
 * Throws `MlbStatsApiError` when the provider misbehaved — see the fail-closed
 * note at the top of this file for why those two must never share a value.
 */
export async function fetchMlbStandings(
  options?: {
    readonly season?: number;
    readonly fetchImpl?: typeof fetch;
    /** Per-request ceiling (default MLB_STATSAPI_TIMEOUT_MS). Test seam. */
    readonly timeoutMs?: number;
  },
): Promise<MlbStandingRow[]> {
  const season = options?.season ?? new Date().getUTCFullYear();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = Math.max(1, options?.timeoutMs ?? MLB_STATSAPI_TIMEOUT_MS);
  const url =
    `${MLB_STATS_BASE}/standings?leagueId=103,104&season=${season}` +
    `&standingsTypes=regularSeason`;
  const body = await mlbGetJson(url, fetchImpl, timeoutMs);
  const records = (body["records"] as Loose[] | undefined) ?? [];
  const out: MlbStandingRow[] = [];
  for (const div of records) {
    const teamRecords = (div["teamRecords"] as Loose[] | undefined) ?? [];
    for (const tr of teamRecords) {
      const team = (tr["team"] as Loose | undefined) ?? {};
      const name = String(team["name"] ?? "").trim();
      const abbreviation = String(team["abbreviation"] ?? "").trim();
      const teamId = Number(team["id"]);
      const wins = Number(tr["wins"]);
      const losses = Number(tr["losses"]);
      let winPct = Number(tr["winningPercentage"]);
      if (!Number.isFinite(winPct) || winPct <= 0) {
        const denom = wins + losses;
        winPct = denom > 0 ? wins / denom : NaN;
      }
      if (
        !name ||
        !Number.isFinite(teamId) ||
        !Number.isFinite(wins) ||
        !Number.isFinite(losses) ||
        !Number.isFinite(winPct)
      ) {
        continue;
      }
      out.push({
        teamId,
        name,
        abbreviation,
        wins,
        losses,
        winPct: clamp01(winPct),
      });
    }
  }
  return out;
}

/** Map full team name / abbr → winPct. Keys normalized. */
export function buildMlbWinPctLookup(
  rows: readonly MlbStandingRow[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(normalizeComparableText(r.name), r.winPct);
    if (r.abbreviation) {
      m.set(normalizeComparableText(r.abbreviation), r.winPct);
    }
  }
  return m;
}

/**
 * Resolve a GSE team name to standings win%.
 * Exact normalized match first; then token-contains against standings names.
 */
export function lookupMlbWinPct(
  lookup: Map<string, number>,
  teamName: string,
): number | null {
  const key = normalizeComparableText(teamName);
  if (!key) return null;
  const direct = lookup.get(key);
  if (direct != null) return direct;
  // Soft join: standings name contains query or vice versa
  for (const [k, v] of lookup) {
    if (k.length < 3) continue;
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/** YYYY-MM-DD UTC. */
function isoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch completed MLB games for a calendar date (UTC).
 *
 * Returns `[]` ONLY when the date genuinely has no finals. Throws
 * `MlbStatsApiError` when the provider misbehaved — a settlement-adjacent
 * reader must never report "no games finished" because the feed was down.
 */
export async function fetchMlbCompletedGamesForDate(
  dateIso: string,
  options?: {
    readonly fetchImpl?: typeof fetch;
    /** Per-request ceiling (default MLB_STATSAPI_TIMEOUT_MS). Test seam. */
    readonly timeoutMs?: number;
  },
): Promise<MlbCompletedGame[]> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = Math.max(1, options?.timeoutMs ?? MLB_STATSAPI_TIMEOUT_MS);
  const url =
    `${MLB_STATS_BASE}/schedule?sportId=1&date=${encodeURIComponent(dateIso)}` +
    `&hydrate=linescore,team`;
  const body = await mlbGetJson(url, fetchImpl, timeoutMs);
  const dates = (body["dates"] as Loose[] | undefined) ?? [];
  const out: MlbCompletedGame[] = [];
  for (const day of dates) {
    const games = (day["games"] as Loose[] | undefined) ?? [];
    for (const g of games) {
      const status = (g["status"] as Loose | undefined) ?? {};
      const abstract = String(status["abstractGameState"] ?? "");
      if (abstract !== "Final") continue;
      const teams = (g["teams"] as Loose | undefined) ?? {};
      const home = (teams["home"] as Loose | undefined) ?? {};
      const away = (teams["away"] as Loose | undefined) ?? {};
      const homeTeam = String(
        ((home["team"] as Loose | undefined)?.["name"] as string | undefined) ??
          "",
      ).trim();
      const awayTeam = String(
        ((away["team"] as Loose | undefined)?.["name"] as string | undefined) ??
          "",
      ).trim();
      const homeScore = Number(home["score"]);
      const awayScore = Number(away["score"]);
      const gamePk = Number(g["gamePk"]);
      const commenceTime = String(
        g["gameDate"] ?? `${dateIso}T00:00:00Z`,
      );
      if (
        !homeTeam ||
        !awayTeam ||
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore) ||
        !Number.isFinite(gamePk)
      ) {
        continue;
      }
      out.push({
        gamePk,
        commenceTime,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
      });
    }
  }
  return out;
}

/**
 * Pull completed games for the last `lookbackDays` (default 3).
 *
 * A failed day PROPAGATES rather than being skipped: silently returning the
 * days that happened to succeed would hand the caller a truncated window that
 * is indistinguishable from a genuinely quiet stretch.
 */
export async function fetchMlbRecentCompletedGames(
  options?: {
    readonly lookbackDays?: number;
    readonly now?: () => Date;
    readonly fetchImpl?: typeof fetch;
    readonly timeoutMs?: number;
  },
): Promise<MlbCompletedGame[]> {
  const lookback = Math.min(14, Math.max(1, options?.lookbackDays ?? 3));
  const now = options?.now ?? (() => new Date());
  const out: MlbCompletedGame[] = [];
  const seen = new Set<number>();
  for (let i = 1; i <= lookback; i++) {
    const d = new Date(now().getTime());
    d.setUTCDate(d.getUTCDate() - i);
    const day = await fetchMlbCompletedGamesForDate(isoDateUtc(d), {
      fetchImpl: options?.fetchImpl,
      timeoutMs: options?.timeoutMs,
    });
    for (const g of day) {
      if (seen.has(g.gamePk)) continue;
      seen.add(g.gamePk);
      out.push(g);
    }
  }
  return out;
}
