// ============================================================
// Correlation-aware Kelly under temporal correlation (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (significant autocorrelation in >=1 major market AND >=3% log-growth lift)
 * to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2003.02743 — "A Generalization of the Classical Kelly Betting Formula to the Case of Temporal Correlation"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: when sequential bet outcomes are temporally correlated
 * (memory-1/memory-m Markov dependence), the classical Kelly fraction is
 * wrong; the paper derives the generalized optimal fraction as the
 * classical fraction scaled by a correlation adjustment (the K_n/(2p−1)
 * factor), estimated from a state-space model fit on a rolling window.
 *
 * IMPROVEMENT (from ledger): Add correlation-aware Kelly sizing: test for
 * lag-1 autocorrelation of per-pick realized edge by team/market on backtest
 * data; where significant, fit the paper's memory-1/memory-m state-space
 * model per team/market on a rolling window and scale the Kelly fraction by
 * the K_n/(2p-1) adjustment factor behind the existing fractional cap; fall
 * back to classical Kelly when autocorrelation is not significant at 95%.
 *
 * ACCEPTANCE GATE: ADOPT correlation-aware sizing if the autocorrelation is
 * statistically significant in at least one major market AND the sizing
 * beats baseline realized log growth by >= 3% on the held-out window.
 */

export interface AutocorrTest {
  rho: number;
  n: number;
  significant: boolean;
}

/** Lag-1 autocorrelation of a realized-edge series. */
export function lag1Autocorrelation(series: number[]): number {
  const n = series.length;
  if (n < 3) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let t = 0; t < n; t++) {
    den += (series[t]! - mean) * (series[t]! - mean);
    if (t > 0) num += (series[t]! - mean) * (series[t - 1]! - mean);
  }
  return den > 0 ? num / den : 0;
}

/** Two-sided 95% significance for lag-1 autocorrelation (|rho| > 1.96/sqrt(n)). */
export function autocorrSignificant95(rho: number, n: number): boolean {
  if (n < 3) return false;
  return Math.abs(rho) > 1.96 / Math.sqrt(n);
}

/** Full lag-1 test on a per-team/market realized-edge series. */
export function testLag1(series: number[]): AutocorrTest {
  const rho = lag1Autocorrelation(series);
  return { rho, n: series.length, significant: autocorrSignificant95(rho, series.length) };
}

/**
 * Memory-1 state-space fit on a rolling window: estimate the win-stay
 * probability p11 = P(win|win) and win-shift p01 = P(win|loss) from the
 * binary outcome history. The stationary win prob and persistence feed the
 * K_n adjustment.
 */
export function fitMemoryOne(outcomes: boolean[]): { p11: number; p01: number; pStationary: number } {
  let n11 = 0;
  let n1 = 0;
  let n01 = 0;
  let n0 = 0;
  for (let t = 1; t < outcomes.length; t++) {
    if (outcomes[t - 1]) {
      n1++;
      if (outcomes[t]) n11++;
    } else {
      n0++;
      if (outcomes[t]) n01++;
    }
  }
  const p11 = n1 > 0 ? n11 / n1 : 0.5;
  const p01 = n0 > 0 ? n01 / n0 : 0.5;
  const pStationary = p01 + p11 < 2 && p01 + p11 > 0 ? p01 / (1 - p11 + p01) : 0.5;
  return { p11, p01, pStationary };
}

/**
 * The paper's K_n/(2p−1) adjustment factor for the memory-1 model.
 *
 * Closed form from the paper's theorem: K_n = 2{E(H_n)/n} − 1 with
 *   E(H_n)/n = λ_n·p_0 + (1−λ_n)·p_∞,
 *   p_0 = ω_0 + ω_1·x_{−1}          (startup head probability given last outcome)
 *   p_∞ = (ω_0 − ω_1)/(1 − 2ω_1)    (steady-state head probability)
 *   λ_n = (1 − (2ω_1)^n) / (n·(1 − 2ω_1))
 * where ω_0 = (p11+p01)/2 and ω_1 = (p11−p01)/2 map the (p11, p01)
 * Markov parametrization onto the paper's Pr(X_k=1|X_{k−1}) = ω_0+ω_1·X_{k−1}.
 *
 * Defaults follow the paper's simulation setup: a single next bet (n = 1,
 * so λ_1 = 1 and K_1 = 2·p_0 − 1) conditioned on the last outcome being a
 * win (x_{−1} = +1). Positive persistence (p11 > p01, ω_1 > 0) then scales
 * the fraction up; negative persistence scales it down. Bounded to
 * [0.25, 4] for sanity.
 */
export function temporalAdjustmentFactor(
  p11: number,
  p01: number,
  p: number,
  horizonN = 1,
  lastWin = true,
): number {
  const omega0 = (p11 + p01) / 2;
  // Hyperdiamond constraint |ω_1| < 0.5 keeps every conditional probability in (0,1).
  const omega1 = Math.min(Math.max((p11 - p01) / 2, -0.5 + 1e-9), 0.5 - 1e-9);
  const xMinus1 = lastWin ? 1 : -1;
  const p0 = omega0 + omega1 * xMinus1;
  const n = Math.max(1, Math.floor(horizonN));
  const twoW1 = 2 * omega1;
  const lambdaN = (1 - Math.pow(twoW1, n)) / (n * (1 - twoW1));
  const pInf = (omega0 - omega1) / (1 - twoW1);
  const effP = lambdaN * p0 + (1 - lambdaN) * pInf;
  const kn = 2 * effP - 1;
  const denom = 2 * p - 1;
  if (Math.abs(denom) < 1e-9) return 1;
  const factor = kn / denom;
  return Math.min(Math.max(factor, 0.25), 4);
}

/**
 * Correlation-aware Kelly fraction: classical Kelly scaled by the temporal
 * adjustment behind the fractional cap; falls back to classical Kelly when
 * autocorrelation is not significant at 95%.
 */
export function correlationAwareKellyFraction(
  pHat: number,
  decimalOdds: number,
  outcomes: boolean[],
  realizedEdge: number[],
  fractionalCap = 0.25,
): { fraction: number; adjusted: boolean; rho: number } {
  const b = decimalOdds - 1;
  const classical = b > 0 ? Math.min(Math.max(pHat / b - (1 - pHat), 0), 1) : 0;
  const { rho, significant } = testLag1(realizedEdge);
  if (!significant) {
    return { fraction: Math.min(classical * fractionalCap, fractionalCap), adjusted: false, rho };
  }
  const { p11, p01 } = fitMemoryOne(outcomes);
  const adj = temporalAdjustmentFactor(p11, p01, pHat);
  return { fraction: Math.min(classical * adj, fractionalCap), adjusted: true, rho };
}

/** Gate helper: significant in >=1 major market AND >=3% log-growth lift. */
export function temporalKellyGatePasses(anyMarketSignificant: boolean, growthLift: number): boolean {
  return anyMarketSignificant && growthLift >= 0.03;
}
