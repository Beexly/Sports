/**
 * Ensemble learning bridge — wires residual GBM + logit-pool into the
 * live evaluation path.
 *
 * logitPoolTest is the honest "does the model add value over the market?"
 * gate: it fits the stacking coefficient on out-of-fold model probs vs
 * de-vigged market probs and returns FIRE_NOTHING when the 95% CI includes
 * zero. residual GBM trains a residual learner on market-prob errors.
 *
 * Fail-closed: missing/short series abstain. Never invents an edge.
 */

import {
  logitPoolTest,
  trainResidualGbm,
  type LogitPoolResult,
  type ResidualGbmModel,
  type ResidualGbmRow,
  type ResidualGbmOptions,
} from "@sports/prediction-engine";

export type LogitPoolEval =
  | { readonly ok: true; readonly data: LogitPoolResult }
  | { readonly ok: false; readonly reason: string };

/**
 * Honest model-vs-market stacking gate. Requires out-of-fold model probs —
 * in-sample probs would leak and inflate the verdict.
 */
export function evalLogitPool(input: {
  readonly modelProbs: readonly number[];
  readonly marketProbs: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
}): LogitPoolEval {
  const { modelProbs, marketProbs, outcomes } = input;
  if (
    !Array.isArray(modelProbs) ||
    !Array.isArray(marketProbs) ||
    !Array.isArray(outcomes) ||
    modelProbs.length === 0 ||
    modelProbs.length !== marketProbs.length ||
    modelProbs.length !== outcomes.length
  ) {
    return {
      ok: false,
      reason: "modelProbs/marketProbs/outcomes must be non-empty and aligned",
    };
  }
  for (let i = 0; i < modelProbs.length; i++) {
    const p = modelProbs[i];
    const q = marketProbs[i];
    if (p == null || q == null || !Number.isFinite(p) || !Number.isFinite(q) || p <= 0 || p >= 1 || q <= 0 || q >= 1) {
      return {
        ok: false,
        reason: `row ${i}: probs must be finite in (0,1) — not imputed`,
      };
    }
    const y = outcomes[i];
    if (y !== 0 && y !== 1) {
      return { ok: false, reason: `row ${i}: outcome must be 0|1` };
    }
  }
  try {
    const data = logitPoolTest({ modelProbs, marketProbs, outcomes });
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type ResidualGbmTrain =
  | { readonly ok: true; readonly model: ResidualGbmModel }
  | { readonly ok: false; readonly reason: string };

/**
 * Train a residual GBM on market-prob errors. Market features are OFF by
 * default (allowMarketFeatures=false) so the learner cannot just copy the
 * market — it must find residual structure in the non-market signals.
 */
export function trainResidualModel(
  rows: readonly ResidualGbmRow[],
  opts?: ResidualGbmOptions,
): ResidualGbmTrain {
  if (!Array.isArray(rows) || rows.length < 10) {
    return { ok: false, reason: "need ≥10 rows to train a residual model" };
  }
  try {
    const model = trainResidualGbm(rows, opts);
    return { ok: true, model };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Ship gate for the ensemble: FIRE only when the logit-pool CI excludes
 * zero in the model's favour AND the sample is non-trivial.
 */
export function logitPoolShipGate(result: LogitPoolResult): {
  readonly ship: boolean;
  readonly verdict: string;
  readonly beta: number;
  readonly ci95: readonly [number, number];
} {
  const nOk = result.verdict !== "FIRE_NOTHING" || !result.includesZero;
  const ship = !result.includesZero && result.beta > 0 && nOk;
  return {
    ship,
    verdict: ship ? "FIRE" : result.verdict,
    beta: result.beta,
    ci95: result.ci95 as [number, number],
  };
}

export { logitPoolTest, trainResidualGbm };
export type { LogitPoolResult, ResidualGbmModel, ResidualGbmRow, ResidualGbmOptions };
