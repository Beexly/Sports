/**
 * E-value sensitivity for unmeasured confounding (estimand-first SOP).
 *
 * Every causal claim ships with "how strong would unmeasured confounding
 * need to be to kill this result". For an observed risk ratio RR >= 1:
 *   E = RR + sqrt(RR * (RR - 1))
 * for RR < 1, invert first (use 1/RR). Also reported for the confidence
 * limit closest to the null (the "E-value for the CI"). A large E-value
 * means only strong unmeasured confounding could explain the effect away.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2505.11841v2 — Framing Causal Questions in Sports
 * Analytics (Rosenbaum-bounds / E-value sensitivity reporting).
 *
 * ACCEPTANCE GATE: adopt the estimand-first protocol if the QB-injury
 * replication passes its balance gate (all SMDs < 10%) with a stable ATT.
 */

/** E-value for an observed risk ratio (RR > 0). */
export function eValue(rr: number): number {
  if (!(rr > 0) || !Number.isFinite(rr)) throw new Error("e-value: rr must be finite and > 0");
  const r = rr >= 1 ? rr : 1 / rr;
  return r + Math.sqrt(r * (r - 1));
}

/**
 * E-value for the confidence bound closest to the null.
 * @param lo lower CI limit, @param hi upper CI limit (on the RR scale).
 */
export function eValueForCi(lo: number, hi: number): number {
  if (!(lo > 0 && hi > 0) || lo > hi) throw new Error("e-value: need 0 < lo <= hi");
  // Bound closest to the null (RR = 1).
  const bound = hi < 1 ? hi : lo > 1 ? lo : 1;
  return eValue(bound);
}

/**
 * Minimum confounding strength summary: returns the E-values for the point
 * estimate and the CI, plus whether the CI excludes the null.
 */
export function confoundingReport(
  rr: number,
  ciLo: number,
  ciHi: number,
): { ePoint: number; eCi: number; ciExcludesNull: boolean } {
  const ePoint = eValue(rr);
  const eCi = eValueForCi(ciLo, ciHi);
  return { ePoint, eCi, ciExcludesNull: ciLo > 1 || ciHi < 1 };
}
