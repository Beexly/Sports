/**
 * MLB Stats API (statsapi.mlb.com) — free, unauthenticated official feed.
 *
 * Used as independent-signal INPUTS only:
 *  - Season standings win% → logistic fair value (never a book line)
 *  - Completed schedule scores → densify TeamGameLog when matched to Game rows
 *
 * Never invents wins/losses/scores. Soft-fails empty on HTTP/parse miss.
 * Attribution: MLB Stats API public endpoints.
 */

import { normalizeComparableText } from "./team-text-match.js";

const MLB_STATS_BASE = "https://statsapi.mlb.com/api/v1";

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
 * Load current (or season) MLB standings for both leagues.
 * Returns [] on soft-fail.
 */
export async function fetchMlbStandings(
  options?: {
    readonly season?: number;
    readonly fetchImpl?: typeof fetch;
  },
): Promise<MlbStandingRow[]> {
  const season = options?.season ?? new Date().getUTCFullYear();
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url =
    `${MLB_STATS_BASE}/standings?leagueId=103,104&season=${season}` +
    `&standingsTypes=regularSeason`;
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as Loose;
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
  } catch {
    return [];
  }
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
 * Soft-fails [].
 */
export async function fetchMlbCompletedGamesForDate(
  dateIso: string,
  options?: { readonly fetchImpl?: typeof fetch },
): Promise<MlbCompletedGame[]> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url =
    `${MLB_STATS_BASE}/schedule?sportId=1&date=${encodeURIComponent(dateIso)}` +
    `&hydrate=linescore,team`;
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as Loose;
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
  } catch {
    return [];
  }
}

/**
 * Pull completed games for the last `lookbackDays` (default 3).
 */
export async function fetchMlbRecentCompletedGames(
  options?: {
    readonly lookbackDays?: number;
    readonly now?: () => Date;
    readonly fetchImpl?: typeof fetch;
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
    });
    for (const g of day) {
      if (seen.has(g.gamePk)) continue;
      seen.add(g.gamePk);
      out.push(g);
    }
  }
  return out;
}
