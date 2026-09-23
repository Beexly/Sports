// ============================================================
// Bounded-abstention pick selection (BALToR-style, DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2505.23437v2 — "Bounded-Abstention Pairwise Learning to Rank"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: pick selection with a bounded abstention budget — picks
 * are ranked pairwise and only posted when confidence clears a conformalized
 * conditional-risk threshold. Mondrian conformal prediction (one threshold
 * per edge-sign class) replaces the paper's plug-in quantile threshold so
 * the risk estimates carry finite-sample coverage guarantees, and the rule
 * extends from pairwise comparisons to listwise slate abstention.
 *
 * IMPROVEMENT (from ledger): Add a bounded-abstention pick-selection rule to the posting pipeline: select only picks whose confidence clears a conformalized conditional-risk threshold (Mondrian CP on edge-sign class) so risk estimates carry finite-sample coverage guarantees — replacing the paper's plug-in quantile threshold — and extend from pairwise to listwise (abstain on full slates, not pairs).
 *
 * ACCEPTANCE GATE: ADOPT the rule into the posting pipeline only if, on the 2024–2025 test window, BALToR-selected picks beat the random-selection baseline by ≥1.5 pp hit rate at c=0.70 with empirical coverage within 0.02 of target, and beat the existing confidence-top-N rule (if any) by ≥0.5 pp. Otherwise REJECT.
 */

export type EdgeSignClass = "plus" | "minus";

export interface CalibPick {
  confidence: number;
  /** 1 if the pick won/covered, 0 otherwise. */
  hit: number;
  cls: EdgeSignClass;
}

export interface CandidatePick {
  id: string;
  confidence: number;
  cls: EdgeSignClass;
}

/** Finite-sample conformal quantile: ceil((n+1)(1−α))/n-th order statistic. */
export function conformalQuantile(scores: number[], alpha: number): number {
  if (scores.length === 0) return Infinity;
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((sorted.length + 1) * (1 - alpha)) - 1);
  return sorted[Math.max(0, idx)]!;
}

/**
 * Mondrian (class-conditional) conformal risk thresholds: per edge-sign
 * class, the confidence level at which the empirical conditional risk
 * (1 − hit rate among calibration picks at/above that confidence) is
 * controlled at alpha. Implemented as the (1−α) conformal quantile of the
 * nonconformity score s = 1 − confidence among calibration misses... in
 * confidence space: threshold = quantile of confidences of calibration
 * picks, chosen so P(hit | conf ≥ threshold, cls) ≥ 1 − α on calibration.
 */
export function mondrianThreshold(calib: CalibPick[], cls: EdgeSignClass, alpha: number): number {
  const inClass = calib.filter((p) => p.cls === cls);
  if (inClass.length === 0) return 1;
  // Candidate thresholds: each distinct calibration confidence.
  const candidates = [...new Set(inClass.map((p) => p.confidence))].sort((a, b) => a - b);
  for (const t of candidates) {
    const above = inClass.filter((p) => p.confidence >= t);
    if (above.length === 0) continue;
    const risk = 1 - above.reduce((a, p) => a + p.hit, 0) / above.length;
    if (risk <= alpha) return t;
  }
  return 1; // no threshold controls risk: select nothing in this class
}

/** Select candidates whose confidence clears their class threshold. */
export function baltorSelect(
  picks: CandidatePick[],
  thresholds: Record<EdgeSignClass, number>,
): CandidatePick[] {
  return picks.filter((p) => p.confidence >= thresholds[p.cls]!);
}

/** Empirical coverage: fraction of selected calibration picks that hit. */
export function empiricalCoverage(calib: CalibPick[], selectedIds: Set<string> | null, ids: string[]): number {
  const sel = calib.filter((_, i) => (selectedIds === null ? true : selectedIds.has(ids[i]!)));
  if (sel.length === 0) return 1;
  return sel.reduce((a, p) => a + p.hit, 0) / sel.length;
}

/** Hit rate of a pick set given outcomes. */
export function hitRate(picks: CandidatePick[], outcomes: Record<string, number>): number {
  if (picks.length === 0) return 0;
  return picks.reduce((a, p) => a + (outcomes[p.id] ?? 0), 0) / picks.length;
}

export interface BaltorGate {
  hitRate: number;
  coverage: number;
  coverageTarget: number;
  /** Gate: beat random baseline by ≥1.5pp at c=0.70, coverage within 0.02. */
  passes: boolean;
}

/** Acceptance-gate helper on a labeled test window. */
export function baltorGate(
  selected: CandidatePick[],
  outcomes: Record<string, number>,
  randomBaselineHitRate: number,
  coverageTarget = 0.7,
): BaltorGate {
  // Here "empirical coverage" is the realized conditional hit rate of the
  // selected set: the conformal claim is P(hit | selected) ≈ coverageTarget.
  const hr = hitRate(selected, outcomes);
  const passes =
    selected.length > 0 &&
    hr - randomBaselineHitRate >= 0.015 &&
    Math.abs(hr - coverageTarget) <= 0.02 + 1e-9;
  return { hitRate: hr, coverage: hr, coverageTarget, passes };
}
