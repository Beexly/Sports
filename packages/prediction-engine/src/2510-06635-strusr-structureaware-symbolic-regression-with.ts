/**
 * arXiv:2510.06635 — StruSR: Structure-Aware Symbolic Regression with Physics-Informed Taylor Guidance
 *
 * Guided symbolic distillation of the neural win-probability head: the network trains with a
 * domain-constraint loss, Taylor expansions at anchor game-states guide the GP, and masking attribution
 * protects high-sensitivity subtrees during distillation.
 *
 * Improvement: GSE distills its neural win-probability model into guided symbolic equations: the network trains with a domain-constraint loss, Taylor expansions at ~200 anchor game-states guide the GP, and masking attribution protects high-sensitivity subtrees.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if the guided-GP equation reaches sensitivity-fidelity correlation >=0.9 with the network (vs <=0.7 for vanilla PySR) at validation Brier within 2% of the network's, AND converges in <=50% of the generations vanilla PySR needs.
 */

/** Sensitivity-fidelity record for one candidate equation. */
export interface FidelityPoint {
  /** Equation's local sensitivity (finite-diff slope at the anchor). */
  eqSensitivity: number;
  /** Network's local sensitivity at the same anchor. */
  netSensitivity: number;
}

/** Pearson correlation between equation and network sensitivities. */
export function sensitivityFidelityCorrelation(pts: readonly FidelityPoint[]): number {
  if (pts.length < 2) throw new Error("sensitivityFidelityCorrelation: need >= 2 anchors");
  const mx = pts.reduce((s, p) => s + p.eqSensitivity, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.netSensitivity, 0) / pts.length;
  let c = 0;
  let vx = 0;
  let vy = 0;
  for (const p of pts) {
    c += (p.eqSensitivity - mx) * (p.netSensitivity - my);
    vx += (p.eqSensitivity - mx) ** 2;
    vy += (p.netSensitivity - my) ** 2;
  }
  return vx < 1e-12 || vy < 1e-12 ? 0 : c / Math.sqrt(vx * vy);
}

/**
 * Anchor Taylor guidance score: mean absolute error between the equation's
 * first-order Taylor prediction and the network's value at anchor states.
 * Lower = better guidance fit.
 */
export function anchorTaylorError(
  anchors: readonly { netValue: number; eqValue: number; eqSlope: number; netSlope: number; dx: number }[],
): number {
  if (anchors.length === 0) throw new Error("anchorTaylorError: no anchors");
  const errs = anchors.map((a) => {
    const taylor = a.eqValue + a.eqSlope * a.dx;
    const netTaylor = a.netValue + a.netSlope * a.dx;
    return Math.abs(taylor - netTaylor);
  });
  return errs.reduce((s, e) => s + e, 0) / errs.length;
}

/** Masking attribution: protect subtrees with sensitivity above the cutoff. */
export function protectedSubtrees(sensitivities: readonly number[], cutoff: number): boolean[] {
  return sensitivities.map((s) => s >= cutoff);
}
