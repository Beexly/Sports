/**
 * Live Neon odds de-vig loader (WP-3).
 *
 * Replaces the retired hardcoded `marketAnchorProb = 0.5238` anchor (which was
 * just the RAW implied probability of a standard -110 line, margin included)
 * with live Shin de-vig fair probabilities read from public.games + public.odds.
 *
 * Contract (gate T-08):
 *   - shinDevig(prices: number[]) -> number[]   American odds in, fair probs out.
 *   - loadWeek10Devig() -> Promise<Array<{ gameId, market, fairProbs }>>
 *     reads the LIVE database for the remaining (non-FINAL) Week 10 games.
 *
 * Shin's method models a proportion z of informed money and recovers fair
 * probabilities that correct the favourite–longshot bias proportional de-vig
 * leaves behind. Reference: H.S. Shin (1992/1993). Pure math, no I/O.
 *
 * Market families: every family present in public.odds is de-vigged. The
 * current OddsMarket enum carries H2H / SPREADS / TOTALS; the price extraction
 * is table-driven so additional families (quarters/halves/props) are picked up
 * automatically if rows ever exist for them.
 *
 * READ-ONLY. Never prints or returns connection material.
 */
import { withNeonClient, sanitizeDbError } from "./neon-client.js";

/** NFL sport id in public.games (GSE Neon). */
export const NFL_SPORT_ID = "cmpg6t7v900031heri45v3d8s";

// ---------------------------------------------------------------------------
// Pure de-vig math
// ---------------------------------------------------------------------------

/** American odds -> raw implied probability (margin included). */
export function americanToImplied(price: number): number {
  if (!Number.isFinite(price) || price === 0) return 0;
  if (price < 0) return -price / (-price + 100);
  return 100 / (price + 100);
}

function shinProbsForZ(raw: readonly number[], booksum: number, z: number): number[] {
  const denom = 2 * (1 - z);
  return raw.map((pi) => {
    const term = Math.sqrt(z * z + (4 * (1 - z) * (pi * pi)) / booksum);
    return (term - z) / denom;
  });
}

/**
 * Shin de-vig of raw implied probabilities. Returns fair probabilities that
 * sum to exactly 1 (the last outcome absorbs floating-point residue).
 * A margin-free or under-round book is proportionally normalized with z = 0.
 */
export function shinFromImplied(rawImplied: readonly number[]): number[] {
  const n = rawImplied.length;
  if (n === 0) return [];
  const raw = rawImplied.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const booksum = raw.reduce((a, b) => a + b, 0);
  if (booksum <= 0) return raw.map(() => 0);
  if (booksum <= 1 + 1e-9) {
    const probs = raw.map((p) => p / booksum);
    return closeSum(probs);
  }
  // At z = 0 the recovered sum is sqrt(booksum) > 1; it falls as z rises.
  let lo = 0;
  let hi = 0.5;
  let z = 0;
  for (let i = 0; i < 80; i++) {
    z = (lo + hi) / 2;
    const sum = shinProbsForZ(raw, booksum, z).reduce((a, p) => a + p, 0);
    if (sum > 1) lo = z;
    else hi = z;
  }
  const probs = shinProbsForZ(raw, booksum, z);
  const total = probs.reduce((a, p) => a + p, 0);
  const normalized = total > 0 ? probs.map((p) => p / total) : probs;
  return closeSum(normalized);
}

/** Force the probability vector to sum to exactly 1 (last element absorbs). */
function closeSum(probs: readonly number[]): number[] {
  if (probs.length === 0) return [];
  const out = probs.slice();
  const head = out.slice(0, -1).reduce((a, p) => a + p, 0);
  out[out.length - 1] = Math.max(0, 1 - head);
  return out;
}

/**
 * Shin de-vig directly from American prices.
 * [-110, -110] -> [0.5, 0.5]; [-150, 130] -> favourite strictly higher.
 * The retired 0.5238 anchor is the RAW -110 implied prob — de-vigged fair
 * probabilities never reproduce it for a balanced book.
 */
export function shinDevig(prices: number[]): number[] {
  return shinFromImplied(prices.map(americanToImplied));
}

// ---------------------------------------------------------------------------
// NFL week window (UTC)
// ---------------------------------------------------------------------------

/**
 * UTC window for an NFL regular-season week. Week 1 opens on the first
 * Thursday on or after Sep 8 (same calendar rule as lib/intelligence-core/
 * db-loaders). US evening games spill into the next UTC day, so the window
 * closes 24h after the following week's Thursday — this captures TNF/MNF
 * UTC timestamps without admitting the next week's slate.
 */
export function nflWeekWindowUtc(season: number, week: number): { start: Date; end: Date } {
  const sep8 = Date.UTC(season, 8, 8);
  const openDow = new Date(sep8).getUTCDay();
  const daysToThursday = (4 - openDow + 7) % 7;
  const week1Thursday = sep8 + daysToThursday * 86_400_000;
  const start = new Date(week1Thursday + (week - 1) * 7 * 86_400_000);
  const end = new Date(week1Thursday + week * 7 * 86_400_000 + 86_400_000);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Live loader
// ---------------------------------------------------------------------------

export interface DevigMarketRow {
  readonly gameId: string;
  /** OddsMarket family: H2H | SPREADS | TOTALS (or any future family). */
  readonly market: string;
  /** Fair probabilities, outcome order per family (see PRICE_COLUMNS). Sum = 1. */
  readonly fairProbs: number[];
  /** Outcome labels aligned with fairProbs. */
  readonly outcomes: string[];
  /** Bookmakers contributing to the consensus. */
  readonly bookmakers: number;
  /** Mean Shin insider share z across bookmakers. */
  readonly meanZ: number;
  /** Latest odds fetchedAt contributing to this consensus. */
  readonly asOf: string | null;
  readonly homeTeamName?: string;
  readonly awayTeamName?: string;
  readonly commenceTime?: string;
}

/**
 * Price columns per market family, in outcome order. Table-driven so new
 * families (quarters/halves/props) only need a row here once they exist.
 */
const PRICE_COLUMNS: Record<string, { cols: string[]; outcomes: string[] }> = {
  H2H: { cols: ["homePrice", "awayPrice"], outcomes: ["home", "away"] },
  SPREADS: { cols: ["homeSpreadPrice", "awaySpreadPrice"], outcomes: ["home_spread", "away_spread"] },
  TOTALS: { cols: ["overPrice", "underPrice"], outcomes: ["over", "under"] },
};

interface OddsSnapshotRow {
  gameId: string;
  market: string;
  bookmaker: string;
  fetchedAt: Date | string | null;
  [column: string]: unknown;
}

/**
 * Consensus Shin de-vig for one market from the latest snapshot per bookmaker.
 * Each bookmaker is de-vigged independently, then fair probs are averaged and
 * renormalized. Bookmakers missing a price for the family are skipped.
 */
export function consensusDevig(
  snapshots: readonly OddsSnapshotRow[],
): { fairProbs: number[]; outcomes: string[]; bookmakers: number; meanZ: number; asOf: string | null } | null {
  if (snapshots.length === 0) return null;
  const market = snapshots[0]!.market;
  const spec = PRICE_COLUMNS[market];
  if (!spec) return null;

  const perBook: number[][] = [];
  const zs: number[] = [];
  let latest: number | null = null;
  for (const row of snapshots) {
    const prices = spec.cols.map((c) => Number(row[c]));
    if (prices.some((p) => !Number.isFinite(p) || p === 0)) continue;
    const implied = prices.map(americanToImplied);
    const fair = shinFromImplied(implied);
    if (fair.length !== spec.cols.length || fair.some((p) => !(p > 0 && p < 1))) continue;
    perBook.push(fair);
    // Recover z for telemetry via the booksum identity (cheap re-solve).
    zs.push(estimateZ(implied));
    const t = row.fetchedAt ? new Date(row.fetchedAt).getTime() : NaN;
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }
  if (perBook.length === 0) return null;

  const mean = spec.cols.map((_, i) => perBook.reduce((a, p) => a + (p[i] ?? 0), 0) / perBook.length);
  const total = mean.reduce((a, p) => a + p, 0);
  const fairProbs = closeSum(total > 0 ? mean.map((p) => p / total) : mean);
  return {
    fairProbs,
    outcomes: spec.outcomes,
    bookmakers: perBook.length,
    meanZ: zs.length ? zs.reduce((a, z) => a + z, 0) / zs.length : 0,
    asOf: latest !== null ? new Date(latest).toISOString() : null,
  };
}

/** Estimate the Shin insider share z for telemetry (bisection, same solver). */
function estimateZ(raw: readonly number[]): number {
  const booksum = raw.reduce((a, b) => a + b, 0);
  if (booksum <= 1 + 1e-9) return 0;
  let lo = 0;
  let hi = 0.5;
  let z = 0;
  for (let i = 0; i < 60; i++) {
    z = (lo + hi) / 2;
    const sum = shinProbsForZ(raw, booksum, z).reduce((a, p) => a + p, 0);
    if (sum > 1) lo = z;
    else hi = z;
  }
  return z;
}

export interface LoadWeek10DevigOptions {
  readonly season?: number;
  readonly week?: number;
  /** Include FINAL games too (default false = the REMAINING slate). */
  readonly includeFinal?: boolean;
}

/**
 * Load live Shin de-vig consensus for every market family of every remaining
 * Week 10 game, straight from public.games + public.odds. No hardcoded
 * anchors: a game/market with no usable odds rows is omitted, never filled
 * with a fabricated probability.
 */
export async function loadWeek10Devig(
  options: LoadWeek10DevigOptions = {},
): Promise<DevigMarketRow[]> {
  const season = options.season ?? 2026;
  const week = options.week ?? 10;
  const { start, end } = nflWeekWindowUtc(season, week);
  try {
    return await withNeonClient(async (client) => {
      const games = await client.query(
        `SELECT id, "homeTeamName", "awayTeamName", "commenceTime", status::text AS status
           FROM public.games
          WHERE "sportId" = $1
            AND "commenceTime" >= $2
            AND "commenceTime" < $3
            AND ($4::boolean OR status IN ('SCHEDULED', 'LIVE'))
          ORDER BY "commenceTime"`,
        [NFL_SPORT_ID, start.toISOString(), end.toISOString(), options.includeFinal === true],
      );
      if (games.rows.length === 0) return [];
      const gameIds = games.rows.map((g: { id: string }) => g.id);
      const meta = new Map<string, { homeTeamName: string; awayTeamName: string; commenceTime: string }>(
        games.rows.map((g: { id: string; homeTeamName: string; awayTeamName: string; commenceTime: Date }) => [
          g.id,
          {
            homeTeamName: g.homeTeamName,
            awayTeamName: g.awayTeamName,
            commenceTime: new Date(g.commenceTime).toISOString(),
          },
        ]),
      );

      // Latest snapshot per (game, market, bookmaker).
      const odds = await client.query(
        `SELECT DISTINCT ON ("gameId", market, bookmaker)
                "gameId", market::text AS market, bookmaker,
                "homePrice", "awayPrice", "drawPrice",
                "homeSpreadPrice", "awaySpreadPrice",
                "overPrice", "underPrice", "fetchedAt"
           FROM public.odds
          WHERE "gameId" = ANY($1::text[])
          ORDER BY "gameId", market, bookmaker, "fetchedAt" DESC`,
        [gameIds],
      );

      const grouped = new Map<string, OddsSnapshotRow[]>();
      for (const row of odds.rows as OddsSnapshotRow[]) {
        const key = `${row.gameId}::${row.market}`;
        const bucket = grouped.get(key);
        if (bucket) bucket.push(row);
        else grouped.set(key, [row]);
      }

      const out: DevigMarketRow[] = [];
      for (const [key, snapshots] of grouped) {
        const [gameId, market] = key.split("::") as [string, string];
        const consensus = consensusDevig(snapshots);
        if (!consensus) continue;
        const m = meta.get(gameId);
        out.push({
          gameId,
          market,
          fairProbs: consensus.fairProbs,
          outcomes: consensus.outcomes,
          bookmakers: consensus.bookmakers,
          meanZ: consensus.meanZ,
          asOf: consensus.asOf,
          ...(m ?? {}),
        });
      }
      out.sort((a, b) => a.gameId.localeCompare(b.gameId) || a.market.localeCompare(b.market));
      return out;
    });
  } catch (error) {
    throw new Error(`loadWeek10Devig failed: ${sanitizeDbError(error)}`);
  }
}