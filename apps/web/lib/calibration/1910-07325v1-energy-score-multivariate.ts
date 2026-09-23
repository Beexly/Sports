/**
 * arXiv 1910.07325v1: Multivariate Forecasting Evaluation: On Sensitive and Strictly Proper Scoring Rules.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Energy score as GSE's multivariate engine-variant selection metric for joint forecasts (weekly slate margin vectors, DFS player-stat vectors, spread+total joints), with a DM-test A/B protocol and the M >= 1,024 ensemble-size audit bar (rank-adjustment (22) applied when copulas differ across variants).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adopt the energy score as GSE's multivariate engine-variant selection metric for joint forecasts (weekly slate margin vectors, DFS player-stat vectors, spread+total joints) with a DM-test A/B protocol, audit reported ensemble sizes against the M>=1,024 bar, and apply the rank-adjustment (22) whenever comparing copula structures across variants with different marginals.
 *
 * ACCEPTANCE GATE:
 * 1,024 -- adopt the energy score as GSE's multivariate variant-selection metric only after verifying that engine ensembles use M >= 1,024 simulated paths per forecast (the paper's empirical stability threshold: below it, DM statistics had not converged for 3 of 7 settings).
 *
 * No ENABLED flag: pure scoring/evaluation metric for offline variant selection.
 */


function euclid(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * Energy score: E||X - y|| - 0.5 * E||X - X'|| over the M ensemble members.
 * Strictly proper for multivariate distributions; lower is better.
 */
export function energyScore(
  ensemble: readonly (readonly number[])[],
  obs: readonly number[],
): number {
  const m = ensemble.length;
  if (m === 0) return NaN;
  const term1 = ensemble.reduce((a, x) => a + euclid(x, obs), 0) / m;
  let term2 = 0;
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      term2 += euclid(ensemble[i], ensemble[j]);
      count++;
    }
  }
  term2 = count > 0 ? term2 / count : 0;
  return term1 - 0.5 * term2;
}

/** Mean energy score over a set of forecast/observation pairs. */
export function meanEnergyScore(
  ensembles: readonly (readonly (readonly number[])[])[],
  observations: readonly (readonly number[])[],
): number {
  const n = ensembles.length;
  if (n === 0) return NaN;
  return (
    ensembles.reduce((a, e, i) => a + energyScore(e, observations[i]), 0) / n
  );
}

export interface DMResult {
  readonly meanDiff: number;
  readonly tStat: number;
}

/**
 * Diebold-Mariano test on per-observation score differences (A - B).
 * |t| > 1.96 rejects equal predictive ability at 5%.
 */
export function dieboldMariano(
  lossesA: readonly number[],
  lossesB: readonly number[],
): DMResult {
  const n = lossesA.length;
  const diffs = lossesA.map((a, i) => a - lossesB[i]);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
  const variance =
    diffs.reduce((a, d) => a + (d - meanDiff) * (d - meanDiff), 0) / n;
  const tStat = variance > 0 ? meanDiff / Math.sqrt(variance / n) : 0;
  return { meanDiff, tStat };
}

/**
 * Ensemble-size audit: the paper's empirical stability threshold is M >= 1,024
 * simulated paths per forecast (DM statistics had not converged below it).
 */
export function ensembleSizeAudit(
  m: number,
  minM = 1024,
): { ok: boolean; m: number; minM: number } {
  return { ok: m >= minM, m, minM };
}

/**
 * Rank adjustment (paper eq. 22): when comparing copula structures across variants
 * with different marginals, rank-transform each margin before scoring so the
 * energy-score difference isolates dependence structure.
 */
export function rankTransformMargin(
  values: readonly number[],
): number[] {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const ranks = new Array(values.length).fill(0);
  order.forEach((idx, pos) => {
    ranks[idx] = (pos + 1) / (values.length + 1);
  });
  return ranks;
}
