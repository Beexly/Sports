/**
 * Predictiveness backtest — the PROVE layer.
 *
 * Does the process grade actually forecast future production, or is it just a
 * pretty restatement of the past? We answer it the only honest way: a split-half
 * backtest on real nflverse weekly data. Build the process grade on the FIRST
 * half of the season, then measure how well it ranks each player's SECOND-half
 * production — and compare that to the obvious baseline (past production
 * predicting future production). If the grade adds rank-correlation LIFT over raw
 * past points, it carries real forward signal; if it doesn't, we say so plainly.
 *
 * We also score the buy-low / sell-high CALLS: of the players the first half
 * flagged buy-low (process ≫ production), how many actually rose in the second
 * half? Of the sell-highs, how many fell? Reported against the 50% coin-flip line.
 *
 * Real nflverse data, in-sample split — and honest that it is in-sample. The
 * correlations are within-position (a QB is judged vs QBs), pooled on normalized
 * percentiles for the overall read. Not a projection, not a pick.
 */

import { assertIngestible, decodeDatasetText, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";
import { buildPlayerModel, type ModelPosition, type PlayerProfile, type ProcessSignal } from "./player-model";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const POSITIONS: readonly ModelPosition[] = ["QB", "RB", "WR", "TE"];
const MIN_HALF_GAMES = 3; // games required in EACH half for a stable per-game read
const MIN_PAIRS = 6; // below this a correlation is noise; report null instead

export interface PredictivenessSplit {
  readonly position: ModelPosition;
  readonly n: number;
  /** Spearman rank corr: first-half PROCESS GRADE → second-half production. */
  readonly gradeCorr: number | null;
  /** Spearman rank corr: first-half PRODUCTION → second-half production (baseline). */
  readonly baselineCorr: number | null;
  /** gradeCorr − baselineCorr: the forward signal the grade adds over the past. */
  readonly lift: number | null;
  readonly buyLowN: number;
  readonly buyLowHitRate: number | null; // fraction of buy-lows whose per-game rose
  readonly sellHighN: number;
  readonly sellHighHitRate: number | null; // fraction of sell-highs whose per-game fell
}

export interface PredictivenessProof {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly trainWeeks: readonly number[];
  readonly testWeeks: readonly number[];
  readonly sampleSize: number;
  readonly overall: PredictivenessSplit;
  readonly byPosition: readonly PredictivenessSplit[];
  readonly verdict: string;
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function round(v: number | null, d = 2): number | null {
  if (v == null) return null;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}

/** Pearson correlation; null when undefined (too few points or zero variance). */
function pearson(a: readonly number[], b: readonly number[]): number | null {
  const n = a.length;
  if (n < MIN_PAIRS || b.length !== n) return null;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]! - ma;
    const y = b[i]! - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

/** Spearman = Pearson on ranks. We rank via the shared percentile helper. */
function rankCorr(a: readonly number[], b: readonly number[]): number | null {
  if (a.length < MIN_PAIRS) return null;
  return pearson(percentileRanks(a), percentileRanks(b));
}

interface Pair {
  position: ModelPosition;
  trainGrade: number; // 0-100 within-position process grade (first half)
  trainProdPct: number; // 0-100 within-position production pct (first half)
  trainFppg: number; // raw first-half per-game
  testFppg: number; // raw second-half per-game
  testProdPct: number; // 0-100 within-position production pct (second half)
  signal: ProcessSignal;
}

function summarize(position: ModelPosition, pairs: readonly Pair[]): PredictivenessSplit {
  const gradeCorr = rankCorr(pairs.map((p) => p.trainGrade), pairs.map((p) => p.testProdPct));
  const baselineCorr = rankCorr(pairs.map((p) => p.trainProdPct), pairs.map((p) => p.testProdPct));
  const lift = gradeCorr != null && baselineCorr != null ? gradeCorr - baselineCorr : null;
  const buys = pairs.filter((p) => p.signal === "buy-low");
  const sells = pairs.filter((p) => p.signal === "sell-high");
  const buyHits = buys.filter((p) => p.testFppg > p.trainFppg).length;
  const sellHits = sells.filter((p) => p.testFppg < p.trainFppg).length;
  return {
    position,
    n: pairs.length,
    gradeCorr: round(gradeCorr),
    baselineCorr: round(baselineCorr),
    lift: round(lift),
    buyLowN: buys.length,
    buyLowHitRate: buys.length ? round(buyHits / buys.length) : null,
    sellHighN: sells.length,
    sellHighHitRate: sells.length ? round(sellHits / sells.length) : null,
  };
}

function verdictFor(overall: PredictivenessSplit): string {
  if (overall.gradeCorr == null) return "Not enough paired players to make a confident claim — the board reports the sample honestly.";
  const lift = overall.lift;
  const grade = overall.gradeCorr;
  const liftStr = lift == null ? "" : lift > 0 ? ` and adds ${lift.toFixed(2)} of rank-correlation lift over past production alone` : ` (no lift over past production this split)`;
  return `First-half process grade ranks second-half production at ρ≈${grade.toFixed(2)}${liftStr}. In-sample, single-season — a directional proof, not a guarantee.`;
}

/** Run the split-half backtest. Pure (records + season in, proof out). */
export function buildPredictiveness(records: readonly CsvRecord[], activeSeason: number): Omit<PredictivenessProof, "generatedAt" | "status" | "sourceUrl" | "error"> {
  const reg = records.filter((r) => r["season"] === String(activeSeason) && r["season_type"] === "REG");
  const weeks = [...new Set(reg.map((r) => num(r["week"])).filter((w) => w > 0))].sort((a, b) => a - b);
  const empty = {
    season: activeSeason,
    trainWeeks: [] as number[],
    testWeeks: [] as number[],
    sampleSize: 0,
    overall: summarize("QB", []),
    byPosition: [] as PredictivenessSplit[],
    verdict: "Not enough weeks to split a season — the board stays honest and empty.",
    canPublishProjections: false as const,
    note: "",
  };
  if (weeks.length < 6) return empty;

  const mid = weeks[Math.floor(weeks.length / 2)]!;
  const trainWeeks = weeks.filter((w) => w < mid);
  const testWeeks = weeks.filter((w) => w >= mid);
  if (trainWeeks.length < 2 || testWeeks.length < 2) return empty;
  const trainSet = new Set(trainWeeks);
  const testSet = new Set(testWeeks);

  // First half: the REAL process grade, uncapped so the sample isn't biased to leaders.
  const trainRecords = reg.filter((r) => trainSet.has(num(r["week"])));
  const { profiles } = buildPlayerModel(trainRecords, activeSeason, { topPerPos: Infinity });

  // Second half: raw per-game production per player.
  const testAgg = new Map<string, { pts: number; games: number; position: ModelPosition }>();
  for (const r of reg) {
    if (!testSet.has(num(r["week"]))) continue;
    const pos = (r["position"] ?? "").toUpperCase() as ModelPosition;
    if (!POSITIONS.includes(pos)) continue;
    const id = r["player_id"] || r["player_display_name"] || "";
    if (!id) continue;
    const a = testAgg.get(id) ?? { pts: 0, games: 0, position: pos };
    a.pts += num(r["fantasy_points_ppr"]);
    a.games += 1;
    testAgg.set(id, a);
  }

  // Join on player id (same source, same id space) and compute within-position test percentiles.
  const byPosition: PredictivenessSplit[] = [];
  const pooled: Pair[] = [];
  for (const pos of POSITIONS) {
    const joined = profiles
      .filter((p) => p.position === pos && p.games >= MIN_HALF_GAMES)
      .map((p) => {
        const t = testAgg.get(p.playerId);
        if (!t || t.games < MIN_HALF_GAMES) return null;
        return { p, testFppg: t.pts / t.games };
      })
      .filter((x): x is { p: PlayerProfile; testFppg: number } => x !== null);
    if (joined.length === 0) continue;
    const testPcts = percentileRanks(joined.map((j) => j.testFppg));
    const pairs: Pair[] = joined.map((j, i) => ({
      position: pos,
      trainGrade: j.p.processGrade,
      trainProdPct: j.p.productionPct,
      trainFppg: j.p.fppg,
      testFppg: j.testFppg,
      testProdPct: testPcts[i] ?? 0,
      signal: j.p.signal,
    }));
    pooled.push(...pairs);
    byPosition.push(summarize(pos, pairs));
  }

  const overall = summarize("QB", pooled); // position label unused for the pooled row
  return {
    season: activeSeason,
    trainWeeks,
    testWeeks,
    sampleSize: pooled.length,
    overall,
    byPosition,
    verdict: verdictFor(overall),
    canPublishProjections: false,
    note: "Split-half backtest on real nflverse weekly data: build the process grade on the first half of the season, then measure how it ranks second-half production vs the past-production baseline. Buy-low/sell-high calls are scored against the coin-flip line. In-sample, single-season — directional proof.",
  };
}

export async function loadPredictiveness({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<PredictivenessProof> {
  assertIngestible("nflverse");
  const url = nflverseUrl("player_stats_week", season);
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs, init: { cache: "no-store" } });
    const { records } = parseCsv(await decodeDatasetText(response));
    if (records.length === 0) throw new Error("empty player_stats_week");
    const hasSeason = records.some((r) => r["season"] === String(season) && r["season_type"] === "REG");
    const activeSeason = hasSeason ? season : records.reduce((m, r) => Math.max(m, num(r["season"])), 0);
    const body = buildPredictiveness(records, activeSeason);
    return { generatedAt: new Date().toISOString(), status: "live", sourceUrl: url, error: null, ...body };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      trainWeeks: [],
      testWeeks: [],
      sampleSize: 0,
      overall: summarize("QB", []),
      byPosition: [],
      verdict: "The backtest could not load from nflverse. The board shows an empty state instead of an unverifiable claim.",
      canPublishProjections: false,
      note: "Predictiveness backtest unavailable.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
