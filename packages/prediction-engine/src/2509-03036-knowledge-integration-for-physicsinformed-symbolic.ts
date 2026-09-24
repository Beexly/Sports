/**
 * arXiv:2509.03036 — Knowledge Integration for Physics-informed Symbolic Regression Using Pre-trained Large Language Models
 *
 * LLM-judge term for the PySR loss: equations are scored on bound-consistency (outputs respect
 * probability/points bounds), football realism (no perverse signs on known effects), and simplicity — so
 * the Pareto front is dominated by domain-valid equations.
 *
 * Improvement: GSE adds an LLM-judge term to its PySR symbolic regression loss, scoring equations on bound-consistency, football realism, and simplicity so the Pareto front is dominated by domain-valid equations.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if LLM-term runs achieve >=80% domain-validity on the Pareto front (vs <=50% without) AND validation Brier degrades by <=5% relative AND per-generation wall-clock overhead <2x.
 */

/** Domain-validity rubric scores for one equation (each 0..1). */
export interface JudgeScores {
  /** Outputs respect known bounds (e.g. probs in [0,1]). */
  boundConsistency: number;
  /** Signs on known effects are football-plausible. */
  footballRealism: number;
  /** Simplicity (fewer terms / shallower trees score higher). */
  simplicity: number;
}

/** Weighted judge score in [0,1]. */
export function judgeScore(
  s: JudgeScores,
  w: { bound: number; realism: number; simplicity: number } = { bound: 0.4, realism: 0.4, simplicity: 0.2 },
): number {
  for (const v of [s.boundConsistency, s.footballRealism, s.simplicity]) {
    if (v < 0 || v > 1) throw new Error("judgeScore: scores in [0,1]");
  }
  const z = w.bound + w.realism + w.simplicity;
  return (w.bound * s.boundConsistency + w.realism * s.footballRealism + w.simplicity * s.simplicity) / z;
}

/**
 * Judge-augmented loss: loss = fitLoss - lambda * judgeScore.
 * Higher judge score lowers the loss (Pareto push toward domain validity).
 */
export function judgeAugmentedLoss(fitLoss: number, judge: JudgeScores, lambda: number): number {
  if (lambda < 0) throw new Error("judgeAugmentedLoss: lambda >= 0");
  return fitLoss - lambda * judgeScore(judge);
}

/** Domain-validity indicator for the Pareto-front audit (>= 0.8 = valid). */
export function isDomainValid(s: JudgeScores): boolean {
  return judgeScore(s) >= 0.8;
}
