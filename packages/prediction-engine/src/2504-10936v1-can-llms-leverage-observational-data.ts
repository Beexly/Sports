/**
 * arXiv:2504.10936v1 — Can LLMs Leverage Observational Data? Towards Data-Driven Causal Discovery with LLMs
 *
 * Closed-loop LLM causal discovery: the LLM proposes edges from data, PC conditional-independence tests and
 * a probe battery accept/reject them, rejections return as prompt constraints. Disabled: needs the LLM
 * layer; the statistical machinery (partial correlation, PC skeleton, probe scoring) ships as pure code.
 *
 * Improvement: Build closed-loop LLM causal discovery: the LLM proposes edges from data, PC conditional-independence tests and a probe battery accept/reject them, and rejections are fed back into the prompt as constraints ("V3 does NOT cause V7; propose alternatives"), so the model stops re-proposing statistically-dead edges — with anonymized-label controls separating reasoning gains from memorization.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the LLM proposal layer if: (a) anonymized-label LLM F1 ≥ PC F1 on synthetic; (b) LLM priors reduce NOTEARS SHD on synthetic by ≥10% or raise probe hit rate by ≥0.05; (c) per-edge cost stays under $0.50 at 35 vars. Reject if (a) fails.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Partial correlation of x,y given z (the PC test statistic core). */
export function partialCorrelation(
  x: readonly number[],
  y: readonly number[],
  z: readonly number[],
): number {
  const corr = (a: readonly number[], b: readonly number[]): number => {
    const n = a.length;
    const ma = a.reduce((s, v) => s + v, 0) / n;
    const mb = b.reduce((s, v) => s + v, 0) / n;
    let cab = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < n; i++) {
      cab += ((a[i] ?? 0) - ma) * ((b[i] ?? 0) - mb);
      va += ((a[i] ?? 0) - ma) ** 2;
      vb += ((b[i] ?? 0) - mb) ** 2;
    }
    return va < 1e-12 || vb < 1e-12 ? 0 : cab / Math.sqrt(va * vb);
  };
  if (x.length !== y.length || x.length !== z.length || x.length < 3) {
    throw new Error("partialCorrelation: need >= 3 aligned observations");
  }
  const rxy = corr(x, y);
  const rxz = corr(x, z);
  const ryz = corr(y, z);
  const denom = Math.sqrt(Math.max(1e-12, (1 - rxz * rxz) * (1 - ryz * ryz)));
  return (rxy - rxz * ryz) / denom;
}

/** Fisher z-test p-value surrogate for H0: partial corr = 0 (two-sided). */
export function pcTestPValue(r: number, n: number, condSize: number): number {
  const dof = n - condSize - 3;
  if (dof <= 0) throw new Error("pcTestPValue: insufficient degrees of freedom");
  const rc = Math.min(0.999999, Math.max(-0.999999, r));
  const z = 0.5 * Math.log((1 + rc) / (1 - rc)) * Math.sqrt(dof);
  // two-sided normal tail via erf approximation
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-z * z);
  const Phi = 0.5 * (1 + Math.sign(z) * erf);
  return 2 * (1 - Phi);
}

/** Accept/reject a proposed edge: reject when PC finds conditional independence. */
export function probeEdge(
  x: readonly number[],
  y: readonly number[],
  z: readonly number[],
  alpha = 0.05,
): { partialCorr: number; pValue: number; accepted: boolean } {
  const r = partialCorrelation(x, y, z);
  const p = pcTestPValue(r, x.length, 1);
  return { partialCorr: r, pValue: p, accepted: p < alpha };
}
