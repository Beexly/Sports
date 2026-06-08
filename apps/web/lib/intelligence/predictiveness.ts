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
const MIN_SEASON_GAMES = 6; // games required in EACH full season for the year-over-year test
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
  /** Out-of-sample: grade built on the PRIOR season, tested on this season. The draft-relevant proof. */
  readonly priorSeason: number | null;
  readonly yearOverYear: PredictivenessSplit | null;
  readonly yearOverYearByPosition: readonly PredictivenessSplit[];
  readonly yearOverYearVerdict: string | null;
  /** Stacked multi-year out-of-sample: several consecutive train→test pairs POOLED for statistical power. */
  readonly stacked: PredictivenessSplit | null;
  readonly stackedByPosition: readonly PredictivenessSplit[];
  readonly stackedPairs: ReadonlyArray<readonly [number, number]>;
  readonly stackedVerdict: string | null;
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
  if (overall.gradeCorr == null) return "Not enough sample to make a confident claim yet. We report it honestly rather than overstate.";
  const lift = overall.lift;
  const liftStr = lift == null ? "" : lift > 0 ? " — and it beats betting on past production alone" : " — though it doesn't beat past production on this slice";
  return `The grade forecasts what comes next${liftStr}. A directional read, not a guarantee.`;
}

function yoyVerdictFor(overall: PredictivenessSplit, trainSeason: number, testSeason: number): string {
  if (overall.gradeCorr == null) return `Not enough carried over from ${trainSeason} to ${testSeason} for a confident read.`;
  const lift = overall.lift;
  const liftStr = lift == null ? "" : lift > 0 ? ", and it beats betting on the prior year alone" : ", though it doesn't beat the prior year on this pair";
  return `The ${trainSeason} grade forecasts ${testSeason}${liftStr}. The real draft test — graded a year ahead.`;
}

function stackedVerdictFor(overall: PredictivenessSplit, pairs: ReadonlyArray<readonly [number, number]>): string {
  const pairCount = pairs.length;
  const seasonLabel = pairs.map(([, test]) => test).join(", ");
  if (overall.gradeCorr == null) {
    return `Not enough sample across ${seasonLabel} for a confident multi-year read.`;
  }
  const lift = overall.lift;
  const liftStr =
    lift == null
      ? ""
      : lift > 0
        ? ", and it beats betting on the prior year alone"
        : ", though it doesn't beat the prior year over this pool";
  return `Across ${pairCount === 1 ? "one season" : `${pairCount} seasons`} (${seasonLabel}), the prior-year grade forecasts the year that follows${liftStr}. Our strongest evidence — years of out-of-sample results.`;
}

/**
 * Join a TRAIN set (process grade) to a TEST set (production) by player id and
 * build the per-position + pooled splits. The two sets are already REG-filtered;
 * the test set can be later weeks of the same season (in-sample) or a whole
 * different season (out-of-sample). Pure.
 */
function buildPairs(
  trainRecords: readonly CsvRecord[],
  trainSeason: number,
  testRecords: readonly CsvRecord[],
  minTrainGames: number,
  minTestGames: number,
): { pooled: Pair[]; byPosition: PredictivenessSplit[] } {
  const { profiles } = buildPlayerModel(trainRecords, trainSeason, { topPerPos: Infinity });

  const testAgg = new Map<string, { pts: number; games: number }>();
  for (const r of testRecords) {
    const pos = (r["position"] ?? "").toUpperCase() as ModelPosition;
    if (!POSITIONS.includes(pos)) continue;
    const id = r["player_id"] || r["player_display_name"] || "";
    if (!id) continue;
    const a = testAgg.get(id) ?? { pts: 0, games: 0 };
    a.pts += num(r["fantasy_points_ppr"]);
    a.games += 1;
    testAgg.set(id, a);
  }

  const byPosition: PredictivenessSplit[] = [];
  const pooled: Pair[] = [];
  for (const pos of POSITIONS) {
    const joined = profiles
      .filter((p) => p.position === pos && p.games >= minTrainGames)
      .map((p) => {
        const t = testAgg.get(p.playerId);
        if (!t || t.games < minTestGames) return null;
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
  return { pooled, byPosition };
}

/** Out-of-sample backtest: grade built on `trainSeason`, tested on `testSeason`. Pure. */
export function buildSeasonOverSeason(
  records: readonly CsvRecord[],
  trainSeason: number,
  testSeason: number,
): { overall: PredictivenessSplit; byPosition: PredictivenessSplit[]; n: number } {
  const trainRecords = records.filter((r) => r["season"] === String(trainSeason) && r["season_type"] === "REG");
  const testRecords = records.filter((r) => r["season"] === String(testSeason) && r["season_type"] === "REG");
  if (trainRecords.length === 0 || testRecords.length === 0) {
    return { overall: summarize("QB", []), byPosition: [], n: 0 };
  }
  const { pooled, byPosition } = buildPairs(trainRecords, trainSeason, testRecords, MIN_SEASON_GAMES, MIN_SEASON_GAMES);
  return { overall: summarize("QB", pooled), byPosition, n: pooled.length };
}

/**
 * STACKED multi-year out-of-sample backtest: run the full-season train→test join for
 * each [train, test] pair and POOL all pairs' Pair[] together for statistical power.
 *
 * Pooling is valid across seasons because buildPairs already normalizes everything
 * per-call WITHIN its own pair: trainGrade and trainProdPct are 0-100 within-position
 * percentiles, testProdPct is a within-position percentile of that pair's test season,
 * and the buy/sell hit-rate compares raw fppg INSIDE the same pair (testFppg vs
 * trainFppg). summarize only reads those per-pair-normalized fields, so concatenating
 * Pair[] across pairs and summarizing once keeps every comparison on a common scale —
 * we never re-percentile across pooled pairs. Pure.
 */
export function buildStackedSeasonOverSeason(
  records: readonly CsvRecord[],
  pairs: ReadonlyArray<readonly [number, number]>,
): { overall: PredictivenessSplit; byPosition: PredictivenessSplit[]; n: number; pairs: Array<[number, number]> } {
  const pooled: Pair[] = [];
  const byPosPool: Record<ModelPosition, Pair[]> = { QB: [], RB: [], WR: [], TE: [] };
  const usedPairs: Array<[number, number]> = [];

  for (const [trainSeason, testSeason] of pairs) {
    const trainRecords = records.filter((r) => r["season"] === String(trainSeason) && r["season_type"] === "REG");
    const testRecords = records.filter((r) => r["season"] === String(testSeason) && r["season_type"] === "REG");
    if (trainRecords.length === 0 || testRecords.length === 0) continue;
    const { pooled: pairPooled } = buildPairs(trainRecords, trainSeason, testRecords, MIN_SEASON_GAMES, MIN_SEASON_GAMES);
    if (pairPooled.length === 0) continue;
    pooled.push(...pairPooled);
    for (const p of pairPooled) byPosPool[p.position].push(p);
    usedPairs.push([trainSeason, testSeason]);
  }

  const byPosition: PredictivenessSplit[] = [];
  for (const pos of POSITIONS) {
    if (byPosPool[pos].length === 0) continue;
    byPosition.push(summarize(pos, byPosPool[pos]));
  }
  return { overall: summarize("QB", pooled), byPosition, n: pooled.length, pairs: usedPairs };
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
    verdict: "Not enough of the season has played out to grade it yet. We stay honest and empty.",
    priorSeason: null,
    yearOverYear: null,
    yearOverYearByPosition: [] as PredictivenessSplit[],
    yearOverYearVerdict: null,
    stacked: null,
    stackedByPosition: [] as PredictivenessSplit[],
    stackedPairs: [] as Array<[number, number]>,
    stackedVerdict: null,
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

  // First half builds the grade (uncapped so the sample isn't biased to leaders);
  // second half is the production we test it against.
  const trainRecords = reg.filter((r) => trainSet.has(num(r["week"])));
  const testRecords = reg.filter((r) => testSet.has(num(r["week"])));
  const { pooled, byPosition } = buildPairs(trainRecords, activeSeason, testRecords, MIN_HALF_GAMES, MIN_HALF_GAMES);

  const overall = summarize("QB", pooled); // position label unused for the pooled row
  return {
    season: activeSeason,
    trainWeeks,
    testWeeks,
    sampleSize: pooled.length,
    overall,
    byPosition,
    verdict: verdictFor(overall),
    priorSeason: null,
    yearOverYear: null,
    yearOverYearByPosition: [],
    yearOverYearVerdict: null,
    stacked: null,
    stackedByPosition: [],
    stackedPairs: [],
    stackedVerdict: null,
    canPublishProjections: false,
    note: "Does our grade forecast what comes next? We check it against what actually happened — and against the obvious bet of just trusting last year. A directional proof.",
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

    // Out-of-sample: if the prior season is present in the same asset, grade on it
    // and test on the active season — the draft-relevant, across-seasons proof.
    const priorSeason = activeSeason - 1;
    const hasPrior = records.some((r) => r["season"] === String(priorSeason) && r["season_type"] === "REG");
    const yoy = hasPrior ? buildSeasonOverSeason(records, priorSeason, activeSeason) : null;

    // STACKED multi-year: pool the last up-to-3 consecutive transitions ending at the
    // active season — but only the pairs where BOTH seasons actually carry REG rows in
    // this asset, so the pool reflects real data, never an assumed season.
    const seasonHasReg = (s: number): boolean => records.some((r) => r["season"] === String(s) && r["season_type"] === "REG");
    const candidatePairs: Array<[number, number]> = [
      [activeSeason - 3, activeSeason - 2],
      [activeSeason - 2, activeSeason - 1],
      [activeSeason - 1, activeSeason],
    ];
    const stackedInputPairs = candidatePairs.filter(([train, test]) => seasonHasReg(train) && seasonHasReg(test));
    const stacked = stackedInputPairs.length > 0 ? buildStackedSeasonOverSeason(records, stackedInputPairs) : null;
    const hasStacked = stacked != null && stacked.pairs.length > 0 && stacked.n > 0;

    return {
      generatedAt: new Date().toISOString(),
      status: "live",
      sourceUrl: url,
      error: null,
      ...body,
      priorSeason: yoy ? priorSeason : null,
      yearOverYear: yoy ? yoy.overall : null,
      yearOverYearByPosition: yoy ? yoy.byPosition : [],
      yearOverYearVerdict: yoy ? yoyVerdictFor(yoy.overall, priorSeason, activeSeason) : null,
      stacked: hasStacked ? stacked!.overall : null,
      stackedByPosition: hasStacked ? stacked!.byPosition : [],
      stackedPairs: hasStacked ? stacked!.pairs : [],
      stackedVerdict: hasStacked ? stackedVerdictFor(stacked!.overall, stacked!.pairs) : null,
    };
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
      verdict: "This proof is unavailable right now. We show an empty state instead of an unverifiable claim.",
      priorSeason: null,
      yearOverYear: null,
      yearOverYearByPosition: [],
      yearOverYearVerdict: null,
      stacked: null,
      stackedByPosition: [],
      stackedPairs: [],
      stackedVerdict: null,
      canPublishProjections: false,
      note: "This proof is unavailable right now.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
