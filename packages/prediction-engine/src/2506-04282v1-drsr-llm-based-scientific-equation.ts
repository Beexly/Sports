/**
 * arXiv:2506.04282v1 — DrSR: LLM based Scientific Equation Discovery with Dual Reasoning from Data and Experience
 *
 * DrSR dual-reasoning loop for symbolic regression: insight extraction pi_data summarizes what the search
 * is learning about the data, idea generation proposes new search directions from experience, and an
 * analyst-in-the-loop audit surfaces the insights weekly. Disabled: the insight/idea modules need the LLM;
 *
 * Improvement: Add the DrSR dual-reasoning loop (insight extraction π_data + idea generation from experience) to GSE-SR and run an analyst-in-the-loop insight audit: present π_data's structured insights to a human analyst weekly as "what the machine thinks it's learning about football," turning the module into a discovery communication channel whose insights (e.g., "pressure rate residuals spike in dome games") may surface real football hypotheses even when the equations disappoint.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT dual reasoning if full DrSR-style beats plain GSE-SR by ≥15% OOD NMSE on 2024–2025 AND valid-program rate ≥90% (vs whatever plain achieves); REJECT if the insight/idea modules add cost without ≥15% gain.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** A structured insight extracted from search history. */
export interface SearchInsight {
  text: string;
  /** Supporting evidence: residual pattern description. */
  evidence: string;
  confidence: number; // 0..1
}

/** One entry of search experience (equation -> score). */
export interface ExperienceEntry {
  skeleton: string;
  score: number;
}

/**
 * Rank experience by score and return the top-k skeletons as the idea
 * generator's working set (exploitation), plus count distinct skeletons
 * (the diversity diagnostic from the gate).
 */
export function ideaWorkingSet(
  experience: readonly ExperienceEntry[],
  k: number,
): { top: ExperienceEntry[]; distinctSkeletons: number } {
  const sorted = [...experience].sort((a, b) => b.score - a.score);
  const distinct = new Set(experience.map((e) => e.skeleton)).size;
  return { top: sorted.slice(0, Math.max(0, k)), distinctSkeletons: distinct };
}

/** Format an insight for the weekly analyst audit. */
export function auditLine(insight: SearchInsight): string {
  return `[conf=${insight.confidence.toFixed(2)}] ${insight.text} | evidence: ${insight.evidence}`;
}

/** Filter insights to the audit-worthy set (confidence floor). */
export function auditWorthy(insights: readonly SearchInsight[], floor = 0.6): SearchInsight[] {
  return insights.filter((i) => i.confidence >= floor);
}
