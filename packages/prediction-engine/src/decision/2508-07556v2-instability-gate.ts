// ============================================================
// Instability-feature posting gate (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2508.07556v2 — "Uncertainty-Driven Reliability: Selective Prediction and Trustworthy Deployment in Modern Machine Learning"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: uncertainty-driven reliability for selective prediction —
 * per-pick prediction instability (checkpoint disagreement or
 * seeded-bagging disagreement across 10 seeds) is fed as a feature into
 * the posting gate, so picks whose predictions wobbled during training
 * are held back. Instability is measured as the standard deviation of
 * the pick's predicted probability across seeds/checkpoints; the gate
 * selects the least-unstable picks at the target coverage.
 *
 * IMPROVEMENT (from ledger): GSE feeds per-pick prediction instability (checkpoint disagreement or seeded-bagging disagreement across 10 seeds) as a feature into the posting gate, so picks whose predictions wobbled during training are held back.
 *
 * ACCEPTANCE GATE: ADOPT if at c=0.70 on 2024-2025 engine picks, instability-selected picks beat confidence-top-70% selection by >=1.0pp hit rate (or +1.0pp cover rate for spreads), two-sided McNemar p<0.10.
 */

/** Per-pick instability: std of predicted probability across seeds/checkpoints. */
export function instabilityScore(seedProbs: number[]): number {
  const n = seedProbs.length;
  if (n < 2) return 0;
  const m = seedProbs.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(seedProbs.reduce((a, p) => a + (p - m) * (p - m), 0) / n);
}

/**
 * Select the least-unstable picks at coverage c (top (1−c) held back).
 * Returns selected indices.
 */
export function instabilitySelect(instabilities: number[], coverage: number): number[] {
  const n = instabilities.length;
  const k = Math.max(1, Math.round(n * coverage));
  return instabilities
    .map((v, i) => [v, i] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .slice(0, k)
    .map(([, i]) => i)
    .sort((a, b) => a - b);
}

/** Select the top-coverage picks by confidence. Returns selected indices. */
export function confidenceSelect(confidences: number[], coverage: number): number[] {
  const n = confidences.length;
  const k = Math.max(1, Math.round(n * coverage));
  return confidences
    .map((v, i) => [v, i] as [number, number])
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map(([, i]) => i)
    .sort((a, b) => a - b);
}

/** Hit rate of selected picks against binary outcomes. */
export function hitRate(selected: number[], outcomes: (0 | 1)[]): number {
  if (selected.length === 0) return 0;
  return selected.reduce((s, i) => s + outcomes[i]!, 0) / selected.length;
}

export interface McNemarTable {
  bothCorrect: number;
  instabilityOnly: number;
  confidenceOnly: number;
  bothWrong: number;
}

/** Paired outcomes for the two selection rules on the union of selected picks. */
export function mcnemarTable(
  instabilitySelected: number[],
  confidenceSelected: number[],
  outcomes: (0 | 1)[],
): McNemarTable {
  const setA = new Set(instabilitySelected);
  const setB = new Set(confidenceSelected);
  const union = [...new Set([...setA, ...setB])].sort((a, b) => a - b);
  const table: McNemarTable = { bothCorrect: 0, instabilityOnly: 0, confidenceOnly: 0, bothWrong: 0 };
  for (const i of union) {
    const aCorrect = setA.has(i) && outcomes[i] === 1;
    const bCorrect = setB.has(i) && outcomes[i] === 1;
    if (aCorrect && bCorrect) table.bothCorrect++;
    else if (aCorrect) table.instabilityOnly++;
    else if (bCorrect) table.confidenceOnly++;
    else table.bothWrong++;
  }
  return table;
}

/** Two-sided McNemar p-value (chi-square with continuity correction). */
export function mcnemarPValue(table: McNemarTable): number {
  const b = table.instabilityOnly;
  const c = table.confidenceOnly;
  const n = b + c;
  if (n === 0) return 1;
  const chi2 = (Math.abs(b - c) - 1) ** 2 / n;
  // P(ChiSq_1 > chi2) via the normal CDF: chi2_1 = Z^2.
  const z = Math.sqrt(chi2);
  const t = 1 / (1 + 0.2316419 * z);
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return Math.min(1, 2 * (1 - (1 - Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI) * poly)));
}

export interface InstabilityGate {
  instabilityHitRate: number;
  confidenceHitRate: number;
  liftPp: number;
  pValue: number;
  passes: boolean;
}

/**
 * Acceptance-gate helper: instability selection beats confidence-top-c by
 * ≥1.0pp hit rate with two-sided McNemar p < 0.10.
 */
export function instabilityGatePasses(
  instabilities: number[],
  confidences: number[],
  outcomes: (0 | 1)[],
  coverage: number,
): InstabilityGate {
  const selA = instabilitySelect(instabilities, coverage);
  const selB = confidenceSelect(confidences, coverage);
  const instabilityHitRate = hitRate(selA, outcomes);
  const confidenceHitRate = hitRate(selB, outcomes);
  const liftPp = (instabilityHitRate - confidenceHitRate) * 100;
  const pValue = mcnemarPValue(mcnemarTable(selA, selB, outcomes));
  return { instabilityHitRate, confidenceHitRate, liftPp, pValue, passes: liftPp >= 1.0 && pValue < 0.1 };
}
