/**
 * DECISION FIELD RUNTIME — Claim-bounded cards.
 *
 * A DecisionCard is not a sentence; it is a bundle of CLAIMS, each carrying its own proof obligation.
 * The card may never say more than its weakest ESSENTIAL claim permits — a lattice meet over claim
 * ceilings. "The fantasy market is late" is BLOCKED when no fantasy snapshot exists, so a card that
 * leans on it silently downgrades rather than fabricate confirmation. Pure + deterministic.
 */

import {
  type MaxPermittedStrength,
  strengthMin,
} from "./decision-state-stat-contract.js";

export type ClaimType = "ROLE" | "MARKET" | "FANTASY" | "DFS" | "ACTION" | "RISK" | "PROOF";

export type ProofStatus = "PROVEN" | "SUPPORTED" | "INFERRED" | "CONFLICTED" | "BLOCKED";

export interface CardClaim {
  readonly claimId: string;
  readonly plainText: string;
  readonly claimType: ClaimType;
  readonly proofStatus: ProofStatus;
  /** Whether this claim must hold for the card's headline action to be justified. */
  readonly essential: boolean;
}

/** The strongest public expression a claim of a given proof status can license. */
export function claimCeiling(proofStatus: ProofStatus): MaxPermittedStrength {
  switch (proofStatus) {
    case "PROVEN":
      return "PUBLIC_ACTION";
    case "SUPPORTED":
      return "ACTION";
    case "INFERRED":
      return "WAIT";
    case "CONFLICTED":
      return "WATCH";
    case "BLOCKED":
      return "INFO_ONLY";
  }
}

/**
 * The card's strength ceiling from its claims: the weakest essential claim's ceiling. A card with no
 * essential claim cannot make an action — it is INFO_ONLY.
 */
export function cardStrengthFromClaims(claims: readonly CardClaim[]): MaxPermittedStrength {
  const essential = claims.filter((c) => c.essential);
  if (essential.length === 0) return "INFO_ONLY";
  return essential.reduce<MaxPermittedStrength>(
    (acc, c) => strengthMin(acc, claimCeiling(c.proofStatus)),
    "PUBLIC_ACTION",
  );
}

/** Convenience constructor keeping claim ids stable and deterministic. */
export function claim(
  claimId: string,
  claimType: ClaimType,
  plainText: string,
  proofStatus: ProofStatus,
  essential: boolean,
): CardClaim {
  return { claimId, claimType, plainText, proofStatus, essential };
}
