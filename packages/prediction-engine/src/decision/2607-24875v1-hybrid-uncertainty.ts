// ============================================================
// Hybrid-uncertainty pick scoring (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2607.24875v1 — "FinAbstain: Uncertainty-Calibrated Multimodal RAG for Selective Financial Forecasting"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: uncertainty-calibrated selective forecasting — every
 * candidate is scored with a hybrid uncertainty U combining evidence
 * disagreement, source contradiction, run disagreement, data
 * completeness, entropy, and calibration gap, with weights fitted on
 * validation picks. Post only when U ≤ θ; route high-U picks to review
 * or abstention.
 *
 * IMPROVEMENT (from ledger): Score every candidate pick with the hybrid uncertainty U (evidence disagreement, source contradiction, run disagreement, data completeness, entropy, calibration gap) fitted on 2023-2024 validation picks, and post only when U <= theta, routing high-U picks to review or abstention.
 *
 * ACCEPTANCE GATE: ADOPT if 2025 held-out shows the hybrid U beats temperature-scaling-only and MC-Dropout-only baselines on selective hit rate at 80% coverage by >=1 pp with positive fitted weights on disagreement/contradiction terms (w_D, w_C > 0). REJECT if w_D/w_C fit at ~0.
 */

export interface UncertaintyComponents {
  /** Evidence disagreement across sources. */
  evidenceDisagreement: number;
  /** Source contradiction score. */
  sourceContradiction: number;
  /** Run-to-run disagreement. */
  runDisagreement: number;
  /** Data completeness (0 = complete, 1 = fully missing). */
  dataIncompleteness: number;
  /** Predictive entropy. */
  entropy: number;
  /** Calibration gap. */
  calibrationGap: number;
}

export interface UncertaintyWeights {
  wD: number;
  wC: number;
  wR: number;
  wI: number;
  wE: number;
  wG: number;
}

/** Hybrid uncertainty U: weighted sum of the six components. */
export function hybridUncertainty(c: UncertaintyComponents, w: UncertaintyWeights): number {
  return (
    w.wD * c.evidenceDisagreement +
    w.wC * c.sourceContradiction +
    w.wR * c.runDisagreement +
    w.wI * c.dataIncompleteness +
    w.wE * c.entropy +
    w.wG * c.calibrationGap
  );
}

/** Post iff U ≤ θ; otherwise route to review/abstention. */
export function uncertaintyPostDecision(u: number, theta: number): boolean {
  return u <= theta;
}

/**
 * Selective hit rate at a target coverage: post the lowest-U picks up to
 * the coverage fraction.
 */
export function selectiveHitRate(
  uncertainties: number[],
  correct: (0 | 1)[],
  coverage: number,
): number {
  const n = uncertainties.length;
  const k = Math.max(1, Math.round(n * coverage));
  const selected = uncertainties
    .map((u, i) => [u, i] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .slice(0, k);
  return selected.reduce((s, [, i]) => s + correct[i]!, 0) / k;
}

export interface HybridGate {
  hybridHitRate: number;
  tempScalingHitRate: number;
  mcDropoutHitRate: number;
  liftVsBestPp: number;
  weightsPositive: boolean;
  passes: boolean;
}

/**
 * Acceptance-gate helper: hybrid U beats both baselines on selective hit
 * rate at 80% coverage by ≥1pp with w_D, w_C > 0.
 */
export function hybridGatePasses(
  hybridHitRate: number,
  tempScalingHitRate: number,
  mcDropoutHitRate: number,
  wD: number,
  wC: number,
): HybridGate {
  const bestBaseline = Math.max(tempScalingHitRate, mcDropoutHitRate);
  const liftVsBestPp = (hybridHitRate - bestBaseline) * 100;
  const weightsPositive = wD > 0 && wC > 0;
  return {
    hybridHitRate,
    tempScalingHitRate,
    mcDropoutHitRate,
    liftVsBestPp,
    weightsPositive,
    passes: liftVsBestPp >= 1 && weightsPositive,
  };
}
