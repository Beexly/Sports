// ============================================================
// STaR-Bets sequential confidence intervals (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real calibration data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2505.22422v2 — "STaR-Bets: Sequential Target-Recalculating Bets for Tighter Confidence Intervals"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: a sequential (anytime-valid) confidence interval for a
 * Bernoulli mean built by inverting the STaR betting test (paper Algorithm
 * 4 / reference implementation): for a candidate mean m, each round bets a
 * target-recalculating fraction
 *   ℓ_t = sqrt(2·max(log(1/δ) − lgW, 0) / ((n−t)·S_t)),
 * clipped to [1/(m−1−ε), 1/(m+ε)], on (X_t − m), where the online variance
 * estimate S_t = min(sg2/t + (m+ε)·n/t², ε + m(1−m)) is capped at the
 * null variance. The null m = μ is rejected once log-wealth reaches
 * log(1/δ) (Ville's inequality), so the non-rejected m values form a valid
 * (1−δ) confidence set that is near-optimal in width (close to randomized
 * Clopper–Pearson) while remaining much tighter than normal approximations
 * at small n.
 *
 * IMPROVEMENT (from ledger): Replace normal-approximation win-rate confidence intervals with STaR-Bets sequential target-recalculating intervals in the calibration lane: compute STaR-Bets vs normal-approx CIs on win-rate per probability decile of GSE's pick history (Neon picks, model v5.2.7), and count miscalibrated deciles each method flags — quantifying how much sample the tighter valid intervals save before a miscalibration is detected.
 *
 * ACCEPTANCE GATE: At n = 256, Bernoulli(0.3), δ = 0.05, over 1,000 reps: STaR-Bets mean CI width must be ≤ 1.1× the randomized Clopper-Pearson mean width (near-optimality, Fig. 2R) with empirical coverage in [0.93, 0.97] (validity, Fig. 3).
 */

/** Log binomial pmf via log-factorials (stable for n up to a few thousand). */
function logBinomPmf(k: number, n: number, p: number): number {
  if (p <= 0) return k === 0 ? 0 : -Infinity;
  if (p >= 1) return k === n ? 0 : -Infinity;
  let l = 0;
  for (let i = 1; i <= k; i++) l += Math.log(n - k + i) - Math.log(i);
  return l + k * Math.log(p) + (n - k) * Math.log(1 - p);
}

/** P(Bin(n,p) >= k): upper tail, log-sum-exp stable. */
export function binomUpperTail(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let maxL = -Infinity;
  const logs: number[] = [];
  for (let j = k; j <= n; j++) {
    const l = logBinomPmf(j, n, p);
    logs.push(l);
    if (l > maxL) maxL = l;
  }
  let s = 0;
  for (const l of logs) s += Math.exp(l - maxL);
  return Math.min(1, Math.exp(maxL) * s);
}

/** P(Bin(n,p) <= k): lower tail. */
export function binomLowerTail(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let maxL = -Infinity;
  const logs: number[] = [];
  for (let j = 0; j <= k; j++) {
    const l = logBinomPmf(j, n, p);
    logs.push(l);
    if (l > maxL) maxL = l;
  }
  let s = 0;
  for (const l of logs) s += Math.exp(l - maxL);
  return Math.min(1, Math.exp(maxL) * s);
}

/** Exact (Clopper–Pearson) two-sided CI for a Bernoulli mean via bisection. */
export function clopperPearsonCI(k: number, n: number, delta = 0.05): [number, number] {
  if (n === 0) return [0, 1];
  const target = delta / 2;
  let lo = 0;
  if (k > 0) {
    let a = 0;
    let b = 1;
    for (let i = 0; i < 64; i++) {
      const m = (a + b) / 2;
      if (binomUpperTail(k, n, m) > target) b = m;
      else a = m;
    }
    lo = (a + b) / 2;
  }
  let hi = 1;
  if (k < n) {
    let a = 0;
    let b = 1;
    for (let i = 0; i < 64; i++) {
      const m = (a + b) / 2;
      if (binomLowerTail(k, n, m) > target) a = m;
      else b = m;
    }
    hi = (a + b) / 2;
  }
  return [lo, hi];
}

/** Inverse standard normal CDF (Acklam's approximation, ~1e-9 accuracy). */
function normalQuantile(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= phigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
  );
}

/** Wald (normal-approximation) CI for a Bernoulli mean. */
export function normalApproxCI(k: number, n: number, delta = 0.05): [number, number] {
  if (n === 0) return [0, 1];
  const z = normalQuantile(1 - delta / 2);
  const p = k / n;
  const se = Math.sqrt(Math.max(p * (1 - p), 1e-12) / n);
  return [Math.max(0, p - z * se), Math.min(1, p + z * se)];
}

/**
 * STaR betting test (paper Algorithm 4 / reference implementation): final
 * log-wealth betting against the candidate mean m. Rejects when it reaches
 * log(1/δ). The per-round bet recalculates from the remaining target
 * log-wealth and the online variance estimate S_t capped at the null
 * variance m(1−m).
 */
export function starLogWealth(xs: number[], m: number, delta = 0.05): number {
  const n = xs.length;
  const target = Math.log(1 / delta);
  const eps = 0.0001;
  let sg2 = 0;
  let lgW = 0;
  for (let ti = 0; ti < n; ti++) {
    const t = ti + eps; // 0.0001-avoidance matches the reference code
    const S = Math.min(sg2 / t + ((m + eps) * n) / (t * t), eps + m * (1 - m));
    const remaining = n - t;
    let lmbd = Math.sqrt((2 * Math.max(target - lgW, 0)) / Math.max(remaining * S, 1e-300));
    lmbd = Math.min(Math.max(lmbd, 1 / (m - 1 - eps)), 1 / (m + eps));
    const x = xs[ti]!;
    lgW += Math.log(Math.max(1 + lmbd * (x - m), 1e-300));
    sg2 += (x - m) * (x - m);
  }
  return lgW;
}

/** STaR test decision: reject the candidate mean m at level δ. */
export function starTestRejects(xs: number[], m: number, delta = 0.05): boolean {
  return starLogWealth(xs, m, delta) >= Math.log(1 / delta);
}

/**
 * STaR one-sided lower bound: min non-rejected m on a fine grid, minus one
 * grid step (reference implementation's grid correction). Grid evaluation
 * avoids any monotonicity assumption on the rejection region.
 */
export function starLowerBound(xs: number[], delta = 0.05, gridSize = 2000): number {
  const n = xs.length;
  if (n === 0) return 0;
  const target = Math.log(1 / delta);
  const step = 1 / gridSize;
  for (let g = 0; g <= gridSize; g++) {
    const m = g * step;
    if (starLogWealth(xs, m, delta) < target) {
      return Math.max(0, m - step);
    }
  }
  return 1;
}

/**
 * STaR-Bets interval: [lower(X; δ/2), 1 − lower(1−X; δ/2)] (paper's GitHub
 * convention for the upper bound, Bonferroni-split for two-sided 1−δ).
 * Anytime-valid by Ville's inequality on the betting wealth martingale.
 */
export function starBetsCI(xs: number[], delta = 0.05): [number, number] {
  const n = xs.length;
  if (n === 0) return [0, 1];
  const half = delta / 2;
  const lo = starLowerBound(xs, half);
  const hi = 1 - starLowerBound(xs.map((x) => 1 - x), half);
  return [lo, hi];
}

/** CI width helper. */
export function ciWidth(ci: [number, number]): number {
  return ci[1] - ci[0];
}

/**
 * Near-optimality check from the acceptance gate: STaR-Bets mean width must
 * be ≤ 1.1× the (randomized) Clopper–Pearson mean width at the given config.
 * Deterministic on a fixed sample; the full gate runs 1,000 reps offline.
 */
export function starNearOptimal(
  xs: number[],
  delta = 0.05,
  ratioTol = 1.1,
): { starWidth: number; cpWidth: number; passes: boolean } {
  const k = xs.filter((x) => x === 1).length;
  const starWidth = ciWidth(starBetsCI(xs, delta));
  const cpWidth = ciWidth(clopperPearsonCI(k, xs.length, delta));
  return { starWidth, cpWidth, passes: starWidth <= ratioTol * cpWidth };
}
