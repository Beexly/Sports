import type { RevenueOffer } from "./partner-types";
import { isHighRiskOffer, normalizedState } from "./partner-types";

export interface ResponsibleGamingReviewInput {
  readonly offer: RevenueOffer;
  readonly userState?: string;
}

export interface ResponsibleGamingReview {
  readonly ok: boolean;
  readonly required: boolean;
  readonly reasons: readonly string[];
}

export function reviewResponsibleGaming(input: ResponsibleGamingReviewInput): ResponsibleGamingReview {
  const required = isHighRiskOffer(input.offer);
  const reasons: string[] = [];
  if (!required) return { ok: true, reasons, required };

  if (!input.offer.responsibleGamingText || input.offer.responsibleGamingText.trim().length < 12) {
    reasons.push("Responsible-gaming text is required for regulated or contest-like offers.");
  }
  if (!input.offer.minimumAge || input.offer.minimumAge < 21) {
    reasons.push("Minimum age policy must be 21 or higher for regulated offers.");
  }
  const state = normalizedState(input.userState);
  if (!state) {
    reasons.push("User state is unknown; high-risk offers fail closed.");
  } else if (input.offer.restrictedStates?.includes(state)) {
    reasons.push(`Offer is restricted in ${state}.`);
  } else if (!input.offer.eligibleStates || input.offer.eligibleStates.length === 0) {
    reasons.push("Eligible states are missing for high-risk offer.");
  } else if (!input.offer.eligibleStates.includes(state)) {
    reasons.push(`Offer is not eligible in ${state}.`);
  }

  return { ok: reasons.length === 0, reasons, required };
}
