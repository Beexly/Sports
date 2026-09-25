/**
 * Edge-lab computation bridge — wires schedule features, logistic trainer,
 * standings math, and binomial coverage stats into the live pipeline surface.
 *
 * Fail-closed on missing inputs. Nothing is imputed. Missing data → null.
 */

import {
  buildScheduleFeatureRows,
  logisticTrainer,
  standingsFacts,
  wilsonLowerBound,
  statsWilsonInterval,
  clopperPearsonLowerBound,
  binomialCoverage,
  type EdgeLabGameRow,
  type AsOfFeatureStore,
  type ScheduleFeatureResult,
  type LogisticOptions,
  type LabeledExample,
  type Predictor,
  type Trainer,
  type TeamStandingRow,
  type StandingsFacts,
  type WilsonInterval,
  type BinomialCoverage,
} from "@sports/prediction-engine";

export type ScheduleFeatureEval =
  | { readonly ok: true; readonly data: ScheduleFeatureResult }
  | { readonly ok: false; readonly reason: string };

/**
 * Build schedule feature rows from as-of game history. Fail-closed on
 * empty games or missing store. Skipped rows are counted, never invented.
 */
export function evalScheduleFeatures(
  games: readonly EdgeLabGameRow[] | null | undefined,
  store: AsOfFeatureStore | null | undefined,
): ScheduleFeatureEval {
  if (!Array.isArray(games) || games.length === 0) {
    return { ok: false, reason: "schedule games empty — not imputed" };
  }
  if (store == null) {
    return { ok: false, reason: "as-of feature store missing — not imputed" };
  }
  try {
    return { ok: true, data: buildScheduleFeatureRows(games, store) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type LogisticTrainEval =
  | { readonly ok: true; readonly predict: Predictor; readonly n: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Fit the edge-lab logistic trainer on labeled examples. Fail-closed on
 * empty featureKeys or missing examples. Empty train returns prior 0.5
 * only when the trainer itself does — the bridge records n=0 honestly.
 */
export function evalLogisticTrain(
  opts: LogisticOptions | null | undefined,
  train: readonly LabeledExample[] | null | undefined,
): LogisticTrainEval {
  if (
    opts == null ||
    !Array.isArray(opts.featureKeys) ||
    opts.featureKeys.length === 0
  ) {
    return { ok: false, reason: "logistic featureKeys empty — not imputed" };
  }
  if (!Array.isArray(train)) {
    return { ok: false, reason: "logistic train rows missing — not imputed" };
  }
  try {
    const trainer: Trainer = logisticTrainer(opts);
    const predict = trainer(train);
    return { ok: true, predict, n: train.length };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type StandingsEval =
  | { readonly ok: true; readonly facts: readonly StandingsFacts[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Standings facts from team rows. Fail-closed on empty rows.
 */
export function evalStandingsFacts(
  rows: readonly TeamStandingRow[] | null | undefined,
): StandingsEval {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, reason: "standings rows empty — not imputed" };
  }
  try {
    return { ok: true, facts: standingsFacts(rows) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type BinomialCoverageEval =
  | { readonly ok: true; readonly data: BinomialCoverage; readonly wilson: WilsonInterval }
  | { readonly ok: false; readonly reason: string };

/**
 * Binomial coverage + Wilson interval for fired/eligible counts.
 * Fail-closed on non-finite or out-of-range counts. Never invents n.
 */
export function evalBinomialCoverage(
  fired: number,
  eligible: number,
): BinomialCoverageEval {
  if (
    !Number.isFinite(fired) ||
    !Number.isFinite(eligible) ||
    fired < 0 ||
    eligible <= 0 ||
    fired > eligible
  ) {
    return {
      ok: false,
      reason: "require 0 <= fired <= eligible, eligible > 0 — not imputed",
    };
  }
  try {
    const data = binomialCoverage(fired, eligible);
    const wilson = statsWilsonInterval(fired, eligible);
    return { ok: true, data, wilson };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type WilsonBoundEval =
  | { readonly ok: true; readonly lower: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Wilson lower bound (default one-sided 95%). Fail-closed on bad counts.
 */
export function evalWilsonLowerBound(
  successes: number,
  n: number,
  z?: number,
): WilsonBoundEval {
  if (!Number.isFinite(successes) || !Number.isFinite(n) || n <= 0 || successes < 0 || successes > n) {
    return { ok: false, reason: "require 0 <= successes <= n, n > 0 — not imputed" };
  }
  try {
    return { ok: true, lower: wilsonLowerBound(successes, n, z) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type ClopperPearsonEval =
  | { readonly ok: true; readonly lower: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Clopper-Pearson lower bound. Fail-closed on bad counts.
 */
export function evalClopperPearsonLowerBound(
  successes: number,
  n: number,
  alpha?: number,
): ClopperPearsonEval {
  if (!Number.isFinite(successes) || !Number.isFinite(n) || n <= 0 || successes < 0 || successes > n) {
    return { ok: false, reason: "require 0 <= successes <= n, n > 0 — not imputed" };
  }
  try {
    return { ok: true, lower: clopperPearsonLowerBound(successes, n, alpha) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ── Honest ceiling / recompute / market scanners ─────────────────────────

import {
  collectCeilingDefects,
  recomputeLedger,
  scanKalshiVsBooks,
  scanKaunitzOutliers,
  consensusMarketQ,
  detectRegimeShift,
  fairSkillBrier,
  meanFairSkillBrier,
  fitGroupedClimatology,
  scoreAgainstClimatology,
  type PerformanceClaimInput,
  type LedgerEntry,
  type RecomputeReport,
  type KalshiTwoWay,
  type NamedBookTwoWay,
  type KalshiBookResult,
  type KalshiBookDenied,
  type KaunitzBookQuote,
  type KaunitzScan,
  type LabeledQ,
  type ConsensusQ,
  type WeeklyPerformance,
  type ChangePointFlag,
  type ChangePointOptions,
  type ClimTrainRow,
  type GroupedClimatology,
} from "@sports/prediction-engine";

export type CeilingEval =
  | { readonly ok: true; readonly defects: readonly string[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Honest-ceiling claim check. ok:true with empty defects = claim is within
 * ceiling. ok:true with defects = claim is refused. Fail-closed on bad input.
 */
export function evalHonestCeiling(
  input: PerformanceClaimInput | null | undefined,
): CeilingEval {
  if (input == null) {
    return { ok: false, reason: "performance claim missing — not imputed" };
  }
  try {
    return { ok: true, defects: collectCeilingDefects(input) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type RecomputeEval =
  | { readonly ok: true; readonly report: RecomputeReport }
  | { readonly ok: false; readonly reason: string };

/**
 * Recompute a claim ledger against stored outcomes. Fail-closed on empty.
 */
export function evalRecomputeLedger(
  entries: readonly LedgerEntry[] | null | undefined,
): RecomputeEval {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, reason: "ledger entries empty — not imputed" };
  }
  try {
    return { ok: true, report: recomputeLedger(entries) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type KalshiBookEval =
  | { readonly ok: true; readonly data: KalshiBookResult | KalshiBookDenied }
  | { readonly ok: false; readonly reason: string };

/**
 * Kalshi-vs-books divergence scan. Fail-closed on missing two-way quote.
 */
export function evalKalshiBookDivergence(
  kalshi: KalshiTwoWay | null | undefined,
  books: readonly NamedBookTwoWay[] | null | undefined,
  opts?: { readonly tau?: number; readonly maxSpread?: number },
): KalshiBookEval {
  if (!Array.isArray(books)) {
    return { ok: false, reason: "books array missing — not imputed" };
  }
  try {
    return { ok: true, data: scanKalshiVsBooks(kalshi, books, opts) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type KaunitzEval =
  | { readonly ok: true; readonly data: KaunitzScan }
  | { readonly ok: false; readonly reason: string };

/**
 * Kaunitz outlier scan across book quotes. Fail-closed on empty field.
 */
export function evalKaunitzOutliers(
  quotes: readonly KaunitzBookQuote[] | null | undefined,
  opts?: { readonly tau?: number },
): KaunitzEval {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return { ok: false, reason: "kaunitz quotes empty — not imputed" };
  }
  try {
    return { ok: true, data: scanKaunitzOutliers(quotes, opts) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type ConsensusQEval =
  | { readonly ok: true; readonly data: ConsensusQ | null }
  | { readonly ok: false; readonly reason: string };

/**
 * Market consensus Q (weighted logit pool). Fail-closed on invalid sources.
 * ok:true + data:null is an honest empty consensus, not a failure.
 */
export function evalConsensusMarketQ(
  sources: readonly LabeledQ[] | null | undefined,
): ConsensusQEval {
  if (!Array.isArray(sources)) {
    return { ok: false, reason: "consensus sources missing — not imputed" };
  }
  try {
    return { ok: true, data: consensusMarketQ(sources) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type RegimeShiftEval =
  | { readonly ok: true; readonly flag: ChangePointFlag }
  | { readonly ok: false; readonly reason: string };

/**
 * NFL weekly change-point / regime detector. Fail-closed on empty team
 * or weekly series.
 */
export function evalRegimeShift(
  team: string | null | undefined,
  weekly: readonly WeeklyPerformance[] | null | undefined,
  opts?: ChangePointOptions,
): RegimeShiftEval {
  if (typeof team !== "string" || team.length === 0) {
    return { ok: false, reason: "team missing — not imputed" };
  }
  if (!Array.isArray(weekly)) {
    return { ok: false, reason: "weekly performances missing — not imputed" };
  }
  try {
    return { ok: true, flag: detectRegimeShift(team, weekly, opts) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type FairSkillEval =
  | { readonly ok: true; readonly fairSkill: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Fair-skill Brier score. Fail-closed on non-finite inputs or nOutcomes < 2.
 */
export function evalFairSkillBrier(
  originalBrS: number,
  nOutcomes: number,
): FairSkillEval {
  if (!Number.isFinite(originalBrS) || !Number.isFinite(nOutcomes) || nOutcomes < 2) {
    return { ok: false, reason: "originalBrS finite and nOutcomes >= 2 required — not imputed" };
  }
  try {
    return { ok: true, fairSkill: fairSkillBrier(originalBrS, nOutcomes) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type ClimatologyEval =
  | {
      readonly ok: true;
      readonly model: GroupedClimatology;
      readonly skill: number | null;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * Fit grouped climatology and score a holdout against it.
 * Fail-closed on empty train rows.
 */
export function evalGroupedClimatology(
  train: readonly ClimTrainRow[] | null | undefined,
  holdout?: readonly { readonly p: number; readonly y: 0 | 1 }[],
): ClimatologyEval {
  if (!Array.isArray(train) || train.length === 0) {
    return { ok: false, reason: "climatology train rows empty — not imputed" };
  }
  try {
    const model = fitGroupedClimatology(train);
    let skill: number | null = null;
    if (Array.isArray(holdout) && holdout.length > 0) {
      skill = scoreAgainstClimatology(model, holdout as never);
    }
    return { ok: true, model, skill };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
