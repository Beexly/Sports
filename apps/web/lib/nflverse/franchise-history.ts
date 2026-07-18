import { assertIngestible, fetchWithFailover, NFLVERSE_BASE, parseCsv, withMirrors } from "@sports/data-ingestion";

/**
 * NFL franchise history — the History Lab's second sport (1999 →).
 *
 * Rolls the nflverse games asset (final scores per game, regular season
 * and playoffs) into per-franchise records: W-L-T, win pct, Super Bowl
 * wins, and the best regular season on record. nflverse coverage starts
 * at 1999 — the surface says so instead of implying a century it
 * doesn't have. No score, no count: unplayed games are skipped.
 */

export interface NflFranchiseRow {
  readonly team: string;
  readonly firstSeason: number;
  readonly lastSeason: number;
  readonly seasons: number;
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly winPct: number;
  readonly superBowlWins: number;
  readonly bestSeason: { readonly year: number; readonly wins: number; readonly losses: number };
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Roll completed games up per team. Pure. */
export function buildNflFranchiseHistory(
  records: readonly CsvRecord[]
): readonly NflFranchiseRow[] {
  interface Acc {
    team: string;
    firstSeason: number;
    lastSeason: number;
    seasonSet: Set<number>;
    wins: number;
    losses: number;
    ties: number;
    superBowlWins: number;
    regBySeason: Map<number, { wins: number; losses: number }>;
  }
  const byTeam = new Map<string, Acc>();

  function acc(team: string, year: number): Acc {
    let a = byTeam.get(team);
    if (!a) {
      a = {
        team,
        firstSeason: year,
        lastSeason: year,
        seasonSet: new Set(),
        wins: 0,
        losses: 0,
        ties: 0,
        superBowlWins: 0,
        regBySeason: new Map(),
      };
      byTeam.set(team, a);
    }
    if (year < a.firstSeason) a.firstSeason = year;
    if (year > a.lastSeason) a.lastSeason = year;
    a.seasonSet.add(year);
    return a;
  }

  for (const r of records) {
    const year = toNumber(r["season"]);
    const homeScore = toNumber(r["home_score"]);
    const awayScore = toNumber(r["away_score"]);
    const home = r["home_team"] ?? "";
    const away = r["away_team"] ?? "";
    if (!year || !home || !away || homeScore === null || awayScore === null) continue;

    const h = acc(home, year);
    const a = acc(away, year);
    const gameType = r["game_type"] ?? "";

    if (homeScore > awayScore) {
      h.wins += 1;
      a.losses += 1;
      if (gameType === "SB") h.superBowlWins += 1;
    } else if (awayScore > homeScore) {
      a.wins += 1;
      h.losses += 1;
      if (gameType === "SB") a.superBowlWins += 1;
    } else {
      h.ties += 1;
      a.ties += 1;
    }

    if (gameType === "REG") {
      for (const [side, won] of [
        [h, homeScore > awayScore],
        [a, awayScore > homeScore],
      ] as const) {
        const season = side.regBySeason.get(year) ?? { wins: 0, losses: 0 };
        if (won) season.wins += 1;
        else if (homeScore !== awayScore) season.losses += 1;
        side.regBySeason.set(year, season);
      }
    }
  }

  return [...byTeam.values()]
    .map((t) => {
      let bestSeason = { year: t.firstSeason, wins: 0, losses: 0 };
      let bestPct = -1;
      for (const [year, s] of t.regBySeason) {
        const decided = s.wins + s.losses;
        const pct = decided > 0 ? s.wins / decided : 0;
        if (pct > bestPct || (pct === bestPct && year < bestSeason.year)) {
          bestPct = pct;
          bestSeason = { year, wins: s.wins, losses: s.losses };
        }
      }
      const decided = t.wins + t.losses;
      return {
        team: t.team,
        firstSeason: t.firstSeason,
        lastSeason: t.lastSeason,
        seasons: t.seasonSet.size,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        winPct: decided > 0 ? Math.round((t.wins / decided) * 1000) / 1000 : 0,
        superBowlWins: t.superBowlWins,
        bestSeason,
      };
    })
    .sort((a, b) => b.wins - a.wins);
}

export interface NflFranchiseHistory {
  readonly status: "live" | "source-error";
  readonly seasonsCovered: { readonly from: number; readonly to: number } | null;
  readonly rows: readonly NflFranchiseRow[];
  readonly error: string | null;
}

let cache: { readonly expiresAt: number; readonly value: NflFranchiseHistory } | null = null;

export function resetNflFranchiseHistoryCacheForTests(): void {
  cache = null;
}

export async function loadNflFranchiseHistory({
  timeoutMs = 20000,
  cacheTtlMs = 24 * 60 * 60 * 1000,
  fetcher = fetch as FetchLike,
}: { timeoutMs?: number; cacheTtlMs?: number; fetcher?: FetchLike } = {}): Promise<NflFranchiseHistory> {
  assertIngestible("nflverse");

  const now = Date.now();
  const live = fetcher === fetch;
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > now) return cache.value;

  const url = `${NFLVERSE_BASE}/games/games.csv`;
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0 || !("season" in (records[0] ?? {}))) {
      throw new Error("nflverse games.csv shape unexpected");
    }

    const rows = buildNflFranchiseHistory(records);
    const seasons = rows.flatMap((r) => [r.firstSeason, r.lastSeason]);
    const value: NflFranchiseHistory = {
      status: "live",
      seasonsCovered:
        seasons.length > 0
          ? { from: Math.min(...seasons), to: Math.max(...seasons) }
          : null,
      rows,
      error: null,
    };
    if (cacheTtlMs > 0 && live) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      status: "source-error",
      seasonsCovered: null,
      rows: [],
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
