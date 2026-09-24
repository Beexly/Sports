/**
 * arXiv:2409.01874 — Partial Membership Models for Soft Clustering of Multivariate Football Player Performance Data
 *
 * Bayesian partial-membership soft clustering for hybrid-role players: fractional role memberships with
 * archetype anchoring (not blended mixtures), a negative-binomial overdispersion layer, and a random-walk
 * temporal prior on memberships across season windows.
 *
 * Improvement: Adopt Bayesian partial-membership soft clustering for GSE's hybrid-role player representations (fractional role memberships with archetype anchoring instead of blended mixture components), upgrading the paper's independent Poissons with a negative-binomial overdispersion layer and a random-walk temporal prior on memberships across season windows.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Gate (ADAPT): WAICm 99/100 correct-K recovery; PM yields true archetypes where MM maxes at 0.686 membership. Improvement success = WAICm improvement ≥ 2% on the same Serie A data and archetype stability (same 4 archetypes) with runtime ≤ 12 h.
 */

/** Fractional membership vector over K archetypes (sums to 1). */
export type Membership = number[];

/** Project a raw score vector onto the simplex (archetype anchoring). */
export function projectToSimplex(v: readonly number[]): Membership {
  const n = v.length;
  if (n === 0) throw new Error("projectToSimplex: empty vector");
  const sorted = [...v].sort((a, b) => b - a);
  let rho = 0;
  let csum = 0;
  for (let i = 0; i < n; i++) {
    csum += sorted[i]!;
    if ((sorted[i] ?? 0) + (1 - csum) / (i + 1) > 0) rho = i + 1;
    else break;
  }
  const theta = (sorted.slice(0, rho).reduce((s, x) => s + x, 0) - 1) / Math.max(1, rho);
  return v.map((x) => Math.max(0, x - theta));
}

/**
 * Negative-binomial log-pmf (overdispersed counts): mean mu, dispersion r.
 * Parameterized via p = r / (r + mu).
 */
export function negBinomLogPmf(k: number, mu: number, r: number): number {
  if (k < 0 || !Number.isInteger(k)) throw new Error("negBinomLogPmf: k >= 0 integer");
  if (mu <= 0 || r <= 0) throw new Error("negBinomLogPmf: mu, r > 0");
  const p = r / (r + mu);
  // log C(k+r-1, k) via lgamma
  const lgamma = (x: number): number => {
    // Lanczos approximation
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    let xx = x - 1;
    let a = c[0]!;
    for (let i = 1; i < 9; i++) a += c[i]! / (xx + i);
    const t = xx + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(a);
  };
  return lgamma(k + r) - lgamma(k + 1) - lgamma(r) + r * Math.log(p) + k * Math.log(1 - p);
}

/**
 * Random-walk temporal prior log-density for a membership trajectory:
 * sum_t -||m_t - m_{t-1}||^2 / (2 sigma2).
 */
export function randomWalkPriorLogDens(traj: readonly Membership[], sigma2: number): number {
  if (sigma2 <= 0) throw new Error("randomWalkPriorLogDens: sigma2 > 0");
  let lp = 0;
  for (let t = 1; t < traj.length; t++) {
    const a = traj[t - 1]!;
    const b = traj[t]!;
    for (let k = 0; k < a.length; k++) {
      const d = (b[k] ?? 0) - (a[k] ?? 0);
      lp -= (d * d) / (2 * sigma2);
    }
  }
  return lp;
}

/** Archetype stability: fraction of windows where the argmax archetype matches. */
export function archetypeStability(traj: readonly Membership[]): number {
  if (traj.length === 0) return NaN;
  const modes = traj.map((m) => m.indexOf(Math.max(...m)));
  const first = modes[0]!;
  return modes.filter((x) => x === first).length / modes.length;
}
