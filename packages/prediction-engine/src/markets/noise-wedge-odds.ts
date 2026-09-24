/**
 * Fair odds for noisy probabilities (arXiv 1811.12516).
 *
 * Structural, non-behavioral theory of the favorite-longshot bias: when the
 * engine's win probability P_C is noisy, fair quotes must include a noise
 * wedge m. Estimate epsilon from the ensemble's own dispersion (std of member
 * win probabilities around the mean, normalized by min(1-P_C, P_C)), then
 * solve for the wedge m numerically (the paper's Appendix I procedure) at the
 * event's (P_C, epsilon). Quote 1/(P_C - m) for P_C > 0.5 (favorite) and
 * 1/(P_C + m) for P_C < 0.5 (longshot) when comparing GSE's price to market
 * odds for value detection.
 *
 * Noise model used for the numeric solve: the true probability is
 * P = P_C + e with e ~ Normal(0, sigma), sigma = epsilon * min(P_C, 1-P_C),
 * truncated to [0, 1]. The wedge is the one-sided tail quantile of the noise
 * at the configured tail level: the quote is set so the noise can push the
 * true probability past the quote only with the tolerated tail probability.
 *
 * ACCEPTANCE GATE: adapt if the empirical epsilon (ensemble dispersion)
 * correlates with realized favorite-longshot bias in GSE's log — events with
 * higher epsilon show a larger gap between market odds and realized
 * frequencies on longshots. Reject the adjustment if epsilon shows no
 * relationship to realized bias.
 *
 * Research-only module. Not wired into any live pricing path.
 */

export interface NoiseWedgeOpts {
  /** Tail probability tolerated past the wedge (default 0.16, ~one sigma). */
  tail?: number;
}

/** Inverse standard normal CDF (Acklam's approximation). */
function horner(c: readonly number[], x: number): number {
  let r = 0;
  for (const ci of c) r = r * x + (ci as number);
  return r;
}

function normInv(p: number): number {
  const c = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const cc = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  if (c < plow) {
    q = Math.sqrt(-2 * Math.log(c));
    return horner(cc, q) / (horner(d, q) * q + 1);
  }
  if (c > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - c));
    return -horner(cc, q) / (horner(d, q) * q + 1);
  }
  q = c - 0.5;
  const r = q * q;
  return horner(a, r) * q / (horner(b, r) * r + 1);
}

/**
 * Estimate epsilon: dispersion (std) of ensemble member win probabilities
 * around the mean, normalized by min(1 - P_C, P_C).
 */
export function estimateEpsilon(memberProbs: readonly number[]): number {
  if (memberProbs.length < 2) throw new Error("estimateEpsilon: need >= 2 members");
  const mean = memberProbs.reduce((a, p) => a + p, 0) / memberProbs.length;
  const sd = Math.sqrt(
    memberProbs.reduce((a, p) => a + (p - mean) ** 2, 0) / (memberProbs.length - 1),
  );
  const denom = Math.min(mean, 1 - mean);
  if (denom <= 1e-12) throw new Error("estimateEpsilon: degenerate mean at boundary");
  return sd / denom;
}

/**
 * Solve for the noise wedge m at (P_C, epsilon): the one-sided tail quantile
 * of the truncated-normal noise, via bisection on the tail equation.
 */
export function noiseWedge(pc: number, epsilon: number, opts: NoiseWedgeOpts = {}): number {
  if (pc <= 0 || pc >= 1) throw new Error("noiseWedge: pc must be in (0,1)");
  if (epsilon < 0) throw new Error("noiseWedge: epsilon must be >= 0");
  if (epsilon < 1e-12) return 0;
  const tail = opts.tail ?? 0.16;
  if (tail <= 0 || tail >= 0.5) throw new Error("noiseWedge: tail must be in (0, 0.5)");
  const sigma = epsilon * Math.min(pc, 1 - pc);
  const cap = Math.min(pc, 1 - pc) * (1 - 1e-9);
  // Bisection: find m with P(noise > m | truncation) = tail.
  // Truncated normal on [-pc, 1-pc]: tail(m) = (Phi(-m/s) - Phi((-pc)/s)) / (Phi((1-pc)/s) - Phi(-pc/s)).
  const phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));
  let lo = 0;
  let hi = cap;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    const num = phi(-m / sigma) - phi(-pc / sigma);
    const den = phi((1 - pc) / sigma) - phi(-pc / sigma);
    const t = num / Math.max(1e-300, den);
    if (t > tail) lo = m;
    else hi = m;
  }
  return Math.min(cap, (lo + hi) / 2);
}

function erf(x: number): number {
  // Abramowitz-Stegun 7.1.26.
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
    0.284496736) * t + 0.254829592) * t;
  const y = 1 - poly * Math.exp(-ax * ax);
  return s * y;
}

/**
 * Noise-adjusted fair decimal odds: 1/(P_C - m) for favorites (P_C > 0.5),
 * 1/(P_C + m) for longshots (P_C < 0.5). Use instead of raw 1/P_C when
 * comparing GSE's price to market odds for value detection.
 */
export function fairOddsNoisy(
  pc: number,
  memberProbs: readonly number[],
  opts: NoiseWedgeOpts = {},
): { odds: number; wedge: number; epsilon: number } {
  const epsilon = estimateEpsilon(memberProbs);
  const wedge = noiseWedge(pc, epsilon, opts);
  const q = pc > 0.5 ? pc - wedge : pc + wedge;
  return { odds: 1 / q, wedge, epsilon };
}

/**
 * Longshot filter helper: the paper's prescription to skip high-epsilon
 * longshots — returns true when the event should be filtered out.
 */
export function longshotFilter(pc: number, epsilon: number, epsMax: number): boolean {
  return pc < 0.5 && epsilon > epsMax;
}

// Re-export for tests that need the quantile directly.
export { normInv };
