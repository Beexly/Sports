// ============================================================
// Ornstein-Uhlenbeck line-deviation sizing (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the
 * OU-stability backtest in the acceptance gate to pass, plus a human
 * call (wiring changes published picks).
 */
export const ENABLED = false;

/**
 * arXiv: 0903.2910v1 — "Application of the Kelly Criterion to Ornstein-Uhlenbeck Processes"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the paper derives the Kelly-optimal stake when the
 * price process follows an Ornstein-Uhlenbeck (mean-reverting) diffusion:
 * optimal exposure scales with the deviation from the long-run mean
 * divided by the diffusion variance, with the pull speed b controlling
 * how aggressively deviations are faded.
 *
 * IMPROVEMENT (from ledger): Treat the market line's deviation from GSE's
 * fair price as a mean-reverting Ornstein-Uhlenbeck process: estimate pull
 * speed b and line volatility sigma from line-move history, scale posted
 * stakes by (fair_line - current_line)/sigma^2 clipped to the base Kelly
 * fraction (bet bigger when the line moved against GSE's number), spend
 * calibration budget on sigma first per the sensitivity result, and cap
 * correlated same-game pick clusters at the single-pick Kelly fraction.
 *
 * ACCEPTANCE GATE: ADOPT OU-adjusted sizing if it beats static Kelly on
 * realized log-wealth growth with no worse max drawdown; REJECT if the OU
 * parameter estimates are unstable week-to-week (b_hat sign flips on > 20%
 * of markets).
 */

export interface OuFit {
  /** Pull speed b (per unit time). b > 0 = mean-reverting. */
  b: number;
  /** Long-run mean level m of the deviation process. */
  m: number;
  /** Diffusion volatility sigma (per sqrt(unit time)). */
  sigma: number;
  /** R^2 of the OLS fit (diagnostic). */
  rSquared: number;
  /** Number of transitions used. */
  n: number;
}

/**
 * Fit an OU process dx = b(m - x) dt + sigma dW to an observed deviation
 * series (fair_line - current_line) sampled at spacing dt, via OLS on
 * Δx = a + s·x with b = -s/dt, m = a/(b·dt), sigma from residual variance.
 */
export function fitOuProcess(deviations: number[], dt: number): OuFit {
  const n = deviations.length - 1;
  if (n < 3 || dt <= 0) return { b: 0, m: 0, sigma: 0, rSquared: 0, n: Math.max(n, 0) };
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += deviations[i]!;
    sumY += deviations[i + 1]! - deviations[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = deviations[i]! - meanX;
    const dy = deviations[i + 1]! - deviations[i]! - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx <= 0) return { b: 0, m: meanX, sigma: 0, rSquared: 0, n };
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const b = -slope / dt;
  const m = Math.abs(b) > 1e-12 ? intercept / (b * dt) : meanX;
  let rss = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * deviations[i]!;
    const r = deviations[i + 1]! - deviations[i]! - pred;
    rss += r * r;
  }
  const residualVar = rss / Math.max(n - 2, 1);
  const sigma = Math.sqrt(Math.max(residualVar, 0) / dt);
  const rSquared = syy > 0 ? Math.max(0, Math.min(1, 1 - rss / syy)) : 0;
  return { b, m, sigma, rSquared, n };
}

/**
 * OU-adjusted stake: raw = gain * deviation / sigma^2, clipped to
 * [0, baseKellyFraction]. Positive deviation (line moved against GSE's
 * number) scales the stake up; never negative (no bet the other way).
 * Sensitivity note (paper): calibration budget goes to sigma first —
 * the stake is quadratic in 1/sigma, linear in deviation.
 */
export function ouAdjustedStake(
  deviation: number,
  sigma: number,
  baseKellyFraction: number,
  gain = 1,
): number {
  if (!(sigma > 0) || !(baseKellyFraction > 0)) return 0;
  const raw = (gain * deviation) / (sigma * sigma);
  return Math.min(Math.max(raw, 0), baseKellyFraction);
}

/**
 * Cap a correlated same-game pick cluster at the single-pick Kelly
 * fraction: pro-rata scale-down when the cluster sum exceeds the cap.
 */
export function capClusterStakes(stakes: number[], singlePickCap: number): number[] {
  const total = stakes.reduce((a, s) => a + s, 0);
  if (total <= singlePickCap || total <= 0) return stakes.slice();
  const scale = singlePickCap / total;
  return stakes.map((s) => s * scale);
}

/**
 * Gate diagnostic: fraction of markets where b_hat flipped sign between
 * consecutive weekly fits. Gate rejects when this exceeds 0.20.
 */
export function ouStabilityRejectRate(bHatByWeek: number[][]): number {
  let flips = 0;
  let pairs = 0;
  for (const series of bHatByWeek) {
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1]!;
      const b = series[i]!;
      if (a === 0 || b === 0) continue;
      pairs++;
      if (Math.sign(a) !== Math.sign(b)) flips++;
    }
  }
  return pairs > 0 ? flips / pairs : 0;
}

/** True when the OU sizing layer passes its stability screen (gate input). */
export function ouStabilityGatePasses(bHatByWeek: number[][]): boolean {
  return ouStabilityRejectRate(bHatByWeek) <= 0.2;
}
