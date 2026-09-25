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
