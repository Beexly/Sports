/**
 * Deep quantile regression for NFL totals — arXiv 2402.06062v1
 * ("Deep Quantile Regression for Uncertainty Estimation in...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: train a quantile network (or gradient-boosted quantile
 * ensemble) on game-context features (pace, offensive/defensive efficiency,
 * weather, rest, injuries, officiating crew tendencies) to output the joint
 * quantile function of total points; derive the over/under probability by
 * interpolating the tau grid at the market line: P(under) = F(line),
 * P(over) = 1 - F(line); keep the spread/ML head untouched. Model training
 * stays offline; this module is the serving-time math: quantile-grid
 * interpolation, over/under derivation, pinball loss, and monotone repair.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff on the 2025 holdout the
 * quantile totals beat the Gaussian baseline on NLL/Brier of realized
 * totals AND CRPS, with realized-score histograms matching predictive
 * quantiles (calibration-curve slope within [0.9, 1.1]).
 */

/** Pinball (quantile) loss for one observation. */
export function pinballLoss(y: number, q: number, tau: number): number {
  const t = Math.min(Math.max(tau, 0), 1);
  const d = y - q;
  return d >= 0 ? t * d : (t - 1) * d;
}

/**
 * PAVA isotonic (nondecreasing) repair of a quantile grid: quantile
 * crossings are a classic failure mode of multi-output quantile nets.
 */
export function monotoneQuantiles(qs: readonly number[]): number[] {
  const n = qs.length;
  if (n === 0) return [];
  // Pool adjacent violators on block means.
  const blocks: Array<{ sum: number; count: number }> = [];
  for (const q of qs) {
    blocks.push({ sum: q, count: 1 });
    while (blocks.length >= 2) {
      const b = blocks[blocks.length - 1]!;
      const a = blocks[blocks.length - 2]!;
      if (a.sum / a.count <= b.sum / b.count) break;
      blocks.pop();
      blocks[blocks.length - 1] = {
        sum: a.sum + b.sum,
        count: a.count + b.count,
      };
    }
  }
  const out: number[] = [];
  for (const b of blocks) {
    for (let i = 0; i < b.count; i++) out.push(b.sum / b.count);
  }
  return out;
}

/**
 * Interpolated CDF value at x from a (tau, quantile) grid. Linear
 * interpolation between bracketing quantiles; clamps outside the grid.
 */
export function quantileInterpolatedCdf(
  tauGrid: readonly number[],
  quantileGrid: readonly number[],
  x: number,
): number {
  const n = tauGrid.length;
  if (n === 0 || quantileGrid.length !== n) return Number.NaN;
  if (x <= quantileGrid[0]!) return 0;
  if (x >= quantileGrid[n - 1]!) return 1;
  for (let i = 0; i < n - 1; i++) {
    const q0 = quantileGrid[i]!;
    const q1 = quantileGrid[i + 1]!;
    if (x >= q0 && x <= q1) {
      const w = q1 === q0 ? 0 : (x - q0) / (q1 - q0);
      return tauGrid[i]! + w * (tauGrid[i + 1]! - tauGrid[i]!);
    }
  }
  return Number.NaN;
}

/** Over/under probabilities from the interpolated predictive CDF. */
export function overUnderProbs(
  tauGrid: readonly number[],
  quantileGrid: readonly number[],
  line: number,
): { readonly under: number; readonly over: number } {
  const under = quantileInterpolatedCdf(tauGrid, quantileGrid, line);
  return { under, over: 1 - under };
}

/** CRPS of the quantile-grid forecast at observation y (grid average). */
export function quantileGridCrps(
  tauGrid: readonly number[],
  quantileGrid: readonly number[],
  y: number,
): number {
  const n = tauGrid.length;
  if (n === 0 || quantileGrid.length !== n) return Number.NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += pinballLoss(y, quantileGrid[i]!, tauGrid[i]!);
  }
  return (2 * s) / n;
}
