/**
 * Evidence band from gp3bayespy (MIT).
 *
 * Source opened: src/gp3bayespy/sensitivity.py.
 * _classify_upper returns pass / review / fail. ModelEvidence says no
 * aggregate pass/fail adequacy verdict is generated. That second rule
 * is the one this engine keeps: a band is not an automatic pass.
 */

export type EvidenceBand = "pass" | "review" | "fail";

export function classifyUpper(
  value: number,
  passThreshold: number,
  reviewThreshold: number,
): EvidenceBand {
  if (!(reviewThreshold >= passThreshold)) {
    throw new Error("review threshold must be at least the pass threshold");
  }
  if (!Number.isFinite(value)) return "review";
  if (value <= passThreshold) return "pass";
  if (value <= reviewThreshold) return "review";
  return "fail";
}

/** Their ModelEvidence sets automatic_model_selection to false. */
export function automaticAdequacyVerdict(): false {
  return false;
}
