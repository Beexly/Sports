/**
 * EU AI Act use-case tier HINT generator.
 *
 * This is a heuristic — a rough first pass meant to prompt the right
 * conversation, NEVER a substitute for legal review. That is why
 * `needsCounsel` is `true` on every single branch below, including the ones
 * that look "obviously low risk." Do not remove or conditionally weaken that
 * — an incorrect self-serve tier determination is exactly the failure mode
 * this function exists to prevent, not enable.
 *
 * See docs/governance/EU_AI_ACT_EVIDENCE_PACK.md: no AI Act conformity
 * assessment or scoping determination has been made by counsel for any
 * Galaxy Sports Edge feature. This function does not change that.
 */

export type AiActTierHint = "unacceptable" | "high" | "limited" | "minimal" | "unknown";

export function hintTier(useCase: {
  consumerPicks?: boolean;
  employment?: boolean;
  credit?: boolean;
  biometrics?: boolean;
  chatbotDisclosure?: boolean;
}): { tier: AiActTierHint; needsCounsel: boolean; notes: string[] } {
  const notes: string[] = [];
  if (useCase.biometrics || useCase.employment || useCase.credit) {
    return { tier: "high", needsCounsel: true, notes: ["Annex III-like themes possible"] };
  }
  if (useCase.chatbotDisclosure) {
    notes.push("transparency obligations may apply");
    return { tier: "limited", needsCounsel: true, notes };
  }
  if (useCase.consumerPicks) {
    return { tier: "minimal", needsCounsel: true, notes: ["Do not assume; jurisdiction-specific"] };
  }
  return { tier: "unknown", needsCounsel: true, notes: ["Classify before EU marketing claims"] };
}
