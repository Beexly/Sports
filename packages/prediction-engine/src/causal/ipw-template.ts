
export interface BinaryTreatmentData {
  readonly y: readonly number[];
  readonly t: readonly number[];
  readonly ps: readonly number[];
}

/** Standardized mean difference for one covariate (balance gate: |SMD| < 0.1). */
export function smd(x: readonly number[], t: readonly number[]): number {
  const x1 = x.filter((_, i) => (t[i] ?? 0) === 1);
  const x0 = x.filter((_, i) => (t[i] ?? 0) === 0);
  if (x1.length < 2 || x0.length < 2) throw new Error("ipw-template: need >= 2 per arm");
  const m1 = x1.reduce((s, v) => s + v, 0) / x1.length;
  const m0 = x0.reduce((s, v) => s + v, 0) / x0.length;
  const v1 = x1.reduce((s, v) => s + (v - m1) ** 2, 0) / (x1.length - 1);
  const v0 = x0.reduce((s, v) => s + (v - m0) ** 2, 0) / (x0.length - 1);
  const pooled = Math.sqrt((v1 + v0) / 2);
  if (pooled < 1e-12) return 0;
  return (m1 - m0) / pooled;
}

/** Trim extreme propensity scores into [floor, 1-floor]. */
export function trimPs(ps: readonly number[], floor = 0.025): number[] {
  return ps.map((p) => Math.min(Math.max(p, floor), 1 - floor));
}

export interface AttResult {
  readonly att: number;
  readonly se: number;
  readonly ciLower: number;
  readonly ciUpper: number;
}

/** IPW ATT with propensity trimming and a normal-approx 95% CI. */
export function ipwAtt(d: BinaryTreatmentData, trimFloor = 0.025): AttResult {
  const { y, t, ps } = d;
  if (y.length !== t.length || y.length !== ps.length || y.length === 0) {
    throw new Error("ipw-template: aligned non-empty inputs required");
  }
  const psT = trimPs(ps, trimFloor);
  let wSum1 = 0;
  let wSum0 = 0;
  let num1 = 0;
  let num0 = 0;
  for (let i = 0; i < y.length; i++) {
    const ti = t[i] ?? 0;
    const p = psT[i] ?? 0.5;
    const yi = y[i] ?? 0;
    if (ti === 1) {
      wSum1 += 1;
      num1 += yi;
    } else {
      // Odds weighting: reweight controls to the treated covariate distribution.
      const w = p / (1 - p);
      wSum0 += w;
      num0 += w * yi;
    }
  }
  if (wSum1 < 1 || wSum0 < 1e-9) throw new Error("ipw-template: no usable treated units");
  const mu1 = num1 / wSum1;
  const mu0 = num0 / wSum0;
  const att = mu1 - mu0;
  // SE via the weighted-control variance (conservative, documented)
  let v0 = 0;
  for (let i = 0; i < y.length; i++) {
    if ((t[i] ?? 0) === 1) continue;
    const p = psT[i] ?? 0.5;
    const w = p / (1 - p);
    v0 += w * w * ((y[i] ?? 0) - mu0) ** 2;
  }
  const se = Math.sqrt(v0 / (wSum0 * wSum0) + 1e-12);
  return { att, se, ciLower: att - 1.96 * se, ciUpper: att + 1.96 * se };
}

/** Doubly robust ATT: outcome regressions mu1/mu0 plus IPW augmentation. */
export function doublyRobustAtt(
  y: readonly number[],
  t: readonly number[],
  ps: readonly number[],
  mu1: readonly number[],
  mu0: readonly number[],
): number {
  if (y.length !== t.length || y.length !== ps.length || y.length !== mu1.length || y.length !== mu0.length) {
    throw new Error("ipw-template: aligned inputs required");
  }
  const psT = trimPs(ps);
  let total = 0;
  for (let i = 0; i < y.length; i++) {
    const ti = t[i] ?? 0;
    const p = psT[i] ?? 0.5;
    const yi = y[i] ?? 0;
    const m1 = mu1[i] ?? 0;
    const m0 = mu0[i] ?? 0;
    total += m1 - m0 + (ti * (yi - m1)) / p - ((1 - ti) * (yi - m0)) / (1 - p);
  }
  return total / Math.max(y.length, 1);
}
