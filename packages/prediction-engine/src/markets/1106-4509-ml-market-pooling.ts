/**
 * arXiv 1106.4509: Machine Learning Markets
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Prediction-market equilibrium as an ensemble combiner: instead of fixed
averaging, pool sub-model probabilities through a fittable mixture<->product
family (one interpolation parameter alpha per market type; alpha=0 is the
linear mixture, alpha=1 the log-product pool), and let each sub-model's
wealth grow multiplicatively with its realized log score so equilibrium
weights self-tune to the historically accurate models.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * As ensemble-honesty infrastructure, replace fixed sub-model averaging with the paper's fittable mixture<->product pooling family (p_comb proportional to product_i p_i^{w_i} vs sum_i w_i p_i, one interpolation parameter per market type) and give each sub-model a wealth updated by its realized log score so the equilibrium weights self-tune -- reading the fitted pool as the market equilibrium under the implicit utility assumption.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT is confirmed if the fitted mixture<->product interpolation beats GSE's current combination by >=1.5% log-loss on the 2025 holdout with the fitted parameter stable across folds (std < 0.15).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: markets | verdict: ADAPT | doctrine: BASELINE
 */
export const ENABLED = false; // Gate needs 2025 holdout comparison vs current combination.

export type ProbVector = number[];

function normalize(v: number[]): number[] {
  const s = v.reduce((a, b) => a + b, 0);
  if (!(s > 0)) throw new Error("cannot normalize non-positive vector");
  return v.map((x) => x / s);
}

/** Linear mixture pool: sum_i w_i p_i. */
export function mixturePool(members: ProbVector[], weights: number[]): ProbVector {
  const w = normalize(weights);
  const k = members[0]!.length;
  const out = new Array<number>(k).fill(0);
  for (let m = 0; m < members.length; m++) {
    for (let c = 0; c < k; c++) out[c]! += w[m]! * members[m]![c]!;
  }
  return normalize(out);
}

/** Log-product pool: p_c proportional to prod_i p_ic^{w_i}. */
export function productPool(members: ProbVector[], weights: number[], eps = 1e-12): ProbVector {
  const w = normalize(weights);
  const k = members[0]!.length;
  const out: number[] = [];
  for (let c = 0; c < k; c++) {
    let logp = 0;
    for (let m = 0; m < members.length; m++) {
      logp += w[m]! * Math.log(Math.max(members[m]![c]!, eps));
    }
    out.push(Math.exp(logp));
  }
  return normalize(out);
}

/**
 * Fittable mixture<->product family. alpha = 0 is the mixture, alpha = 1 the
 * product pool; interior values geometrically interpolate the two.
 */
export function interpolatedPool(members: ProbVector[], weights: number[], alpha: number): ProbVector {
  if (alpha <= 0) return mixturePool(members, weights);
  if (alpha >= 1) return productPool(members, weights);
  const mix = mixturePool(members, weights);
  const prod = productPool(members, weights);
  return normalize(mix.map((m, c) => Math.pow(m, 1 - alpha) * Math.pow(prod[c]!, alpha)));
}

/**
 * Wealth update: w_i <- w_i * p_i(realized outcome)^eta, renormalized.
 * Repeated play concentrates wealth on historically accurate sub-models.
 */
export function updateWealth(wealth: number[], memberOutcomeProbs: number[], eta = 1): number[] {
  return normalize(
    wealth.map((w, i) => w * Math.pow(Math.max(memberOutcomeProbs[i]!, 1e-12), eta)),
  );
}

export function logLoss(prob: ProbVector, outcome: number): number {
  return -Math.log(Math.max(prob[outcome]!, 1e-12));
}

export interface AlphaFit {
  alpha: number;
  avgLogLoss: number;
}

/** Grid-search the interpolation parameter minimizing mean log-loss. */
export function fitAlpha(
  memberProbs: ProbVector[][],
  outcomes: number[],
  weights: number[],
  grid = 21,
): AlphaFit {
  let best: AlphaFit = { alpha: 0, avgLogLoss: Infinity };
  for (let g = 0; g < grid; g++) {
    const alpha = g / (grid - 1);
    let tot = 0;
    for (let e = 0; e < memberProbs.length; e++) {
      tot += logLoss(interpolatedPool(memberProbs[e]!, weights, alpha), outcomes[e]!);
    }
    const avg = tot / memberProbs.length;
    if (avg < best.avgLogLoss) best = { alpha, avgLogLoss: avg };
  }
  return best;
}
