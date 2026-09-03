/**
 * Market coverage — which markets the published slate actually carries per
 * sport over the next window, and a clear degradation signal when a market
 * that the product sells is missing while games exist.
 *
 * Why (2026-09-02): the zero-key "signal slate" pipeline is MONEYLINE-only by
 * construction (packages/ingestion-pipeline/src/generate-signal-slate.ts) and
 * ESPN's public odds carry a single bookmaker, which the scorer rejects
 * (MIN_BOOKMAKERS = 2). So if both odds keys fail on a college-football
 * Saturday, CFB TOTAL picks silently drop to zero and the board still reads
 * "healthy". This module makes that state visible on the ops truth surface and
 * the launch checker instead of inventing a line to fill the gap (rule 1: no
 * fake data). Pure classifier + a thin loader.
 */

export const MARKET_COVERAGE_WINDOW_HOURS = 72;

export const MARKET_KEYS = ["MONEYLINE", "SPREAD", "TOTAL"] as const;
export type MarketKey = (typeof MARKET_KEYS)[number];

export type CoverageStatus = "covered" | "none" | "no_games";

export interface SportMarketCoverage {
  readonly sportKey: string;
  readonly games: number;
  readonly picks: Readonly<Record<MarketKey, number>>;
  readonly status: Readonly<Record<MarketKey, CoverageStatus>>;
}

export interface MarketCoverageDegradation {
  readonly sportKey: string;
  readonly market: MarketKey;
  readonly games: number;
  readonly hint: string;
}

export interface MarketCoverageReport {
  readonly windowHours: number;
  readonly from: string;
  readonly to: string;
  readonly sports: readonly SportMarketCoverage[];
  readonly degraded: readonly MarketCoverageDegradation[];
}

export interface MarketCoverageInput {
  readonly games: ReadonlyArray<{ readonly sportKey: string }>;
  readonly picks: ReadonlyArray<{ readonly sportKey: string; readonly pickType: string }>;
}

const FOOTBALL_SPORTS = new Set(["americanfootball_nfl", "americanfootball_ncaaf"]);

function isMarketKey(value: string): value is MarketKey {
  return (MARKET_KEYS as readonly string[]).includes(value);
}

function hintFor(sportKey: string, market: MarketKey): string {
  if (market === "TOTAL" && FOOTBALL_SPORTS.has(sportKey)) {
    return (
      "No TOTAL picks while games are scheduled. Known cause: the zero-key signal slate is " +
      "moneyline-only and ESPN's single-bookmaker odds fail MIN_BOOKMAKERS=2, so totals need " +
      "a live odds feed (THE_ODDS_API_KEY or TheRundown). Check refresh-odds provider status; " +
      "the board is degraded, not broken."
    );
  }
  return `No ${market} picks while ${sportKey} games are scheduled in the window; check the odds feed for this sport.`;
}

export function classifyMarketCoverage(
  input: MarketCoverageInput,
  window: { readonly from: Date; readonly to: Date; readonly windowHours?: number },
): MarketCoverageReport {
  const bySport = new Map<string, { games: number; picks: Record<MarketKey, number> }>();
  const ensure = (sportKey: string) => {
    let row = bySport.get(sportKey);
    if (!row) {
      row = { games: 0, picks: { MONEYLINE: 0, SPREAD: 0, TOTAL: 0 } };
      bySport.set(sportKey, row);
    }
    return row;
  };
  for (const g of input.games) ensure(g.sportKey).games += 1;
  for (const p of input.picks) {
    if (!isMarketKey(p.pickType)) continue;
    ensure(p.sportKey).picks[p.pickType] += 1;
  }

  const sports: SportMarketCoverage[] = [];
  const degraded: MarketCoverageDegradation[] = [];
  for (const [sportKey, row] of [...bySport.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const status = {} as Record<MarketKey, CoverageStatus>;
    for (const market of MARKET_KEYS) {
      const s: CoverageStatus =
        row.games === 0 ? "no_games" : row.picks[market] > 0 ? "covered" : "none";
      status[market] = s;
      if (s === "none") {
        degraded.push({ sportKey, market, games: row.games, hint: hintFor(sportKey, market) });
      }
    }
    sports.push({ sportKey, games: row.games, picks: { ...row.picks }, status });
  }

  return {
    windowHours: window.windowHours ?? MARKET_COVERAGE_WINDOW_HOURS,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    sports,
    degraded,
  };
}

/** Narrow read surface so the loader stays testable without a Prisma client. */
/**
 * Seed/demo picks (modelVersion "v5.0.0-seed") never count as coverage, the
 * same exclusion the public win-rate readers and the board's relation
 * predicate apply. Kept unconditional here (the board applies it only in
 * production) because a monitor that can be turned green by a seed row is
 * worse than none.
 */
const SEED_MODEL_VERSION = "v5.0.0-seed";

export interface MarketCoverageDb {
  game: {
    findMany(args: {
      where: { commenceTime: { gte: Date; lte: Date } };
      select: { sport: { select: { key: true } } };
    }): Promise<Array<{ sport: { key: string } }>>;
  };
  pick: {
    findMany(args: {
      where: {
        // The public board's eligibility (load-gate-slate, board/state):
        // published, non-bootstrap, not a seed row. A pick the board hides
        // must not satisfy coverage.
        isPublished: true;
        isBootstrap: false;
        NOT: { modelVersion: string };
        result: "PENDING";
        game: { commenceTime: { gte: Date; lte: Date } };
      };
      select: { pickType: true; game: { select: { sport: { select: { key: true } } } } };
    }): Promise<Array<{ pickType: string; game: { sport: { key: string } } }>>;
  };
}

export async function loadMarketCoverage(
  db: MarketCoverageDb,
  now: Date = new Date(),
  windowHours: number = MARKET_COVERAGE_WINDOW_HOURS,
): Promise<MarketCoverageReport> {
  const to = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const range = { gte: now, lte: to };
  const [games, picks] = await Promise.all([
    db.game.findMany({ where: { commenceTime: range }, select: { sport: { select: { key: true } } } }),
    db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: SEED_MODEL_VERSION },
        result: "PENDING",
        game: { commenceTime: range },
      },
      select: { pickType: true, game: { select: { sport: { select: { key: true } } } } },
    }),
  ]);
  return classifyMarketCoverage(
    {
      games: games.map((g) => ({ sportKey: g.sport.key })),
      picks: picks.map((p) => ({ sportKey: p.game.sport.key, pickType: p.pickType })),
    },
    { from: now, to, windowHours },
  );
}
