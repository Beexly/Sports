import type { RevenueOffer, RevenuePartner, RevenueSurface } from "./partner-types";
import { hasExpired, isHighRiskOffer } from "./partner-types";
import { reviewDisclosure } from "./disclosure-policy";
import { reviewResponsibleGaming } from "./responsible-gaming-policy";

export type OfferEligibilityBlockerCode =
  | "PARTNER_MISMATCH"
  | "PARTNER_NOT_APPROVED"
  | "PARTNER_EXPIRED"
  | "OFFER_NOT_APPROVED"
  | "OFFER_EXPIRED"
  | "SURFACE_NOT_ALLOWED"
  | "MISSING_TERMS_URL"
  | "MISSING_DISCLOSURE"
  | "MISSING_RESPONSIBLE_GAMING"
  | "UNKNOWN_STATE"
  | "STATE_NOT_ELIGIBLE"
  | "STATE_RESTRICTED";

export interface OfferEligibilityBlocker {
  readonly code: OfferEligibilityBlockerCode;
  readonly message: string;
}

export interface OfferEligibilityInput {
  readonly partner: RevenuePartner;
  readonly offer: RevenueOffer;
  readonly surface: RevenueSurface;
  readonly userState?: string;
  readonly now?: Date;
}

export interface OfferEligibilityDecision {
  readonly ok: boolean;
  readonly highRisk: boolean;
  readonly blockers: readonly OfferEligibilityBlocker[];
}

export function evaluateOfferEligibility(input: OfferEligibilityInput): OfferEligibilityDecision {
  const now = input.now ?? new Date();
  const blockers: OfferEligibilityBlocker[] = [];
  const highRisk = isHighRiskOffer(input.offer);

  if (input.partner.id !== input.offer.partnerId) {
    blockers.push(blocker("PARTNER_MISMATCH", "Offer partnerId does not match the supplied partner."));
  }
  if (input.partner.approvalStatus !== "approved") {
    blockers.push(blocker("PARTNER_NOT_APPROVED", "Partner approval must be approved before any offer can appear."));
  }
  if (hasExpired(input.partner.expiresAt, now)) {
    blockers.push(blocker("PARTNER_EXPIRED", "Partner approval has expired."));
  }
  if (input.offer.approvalStatus !== "approved") {
    blockers.push(blocker("OFFER_NOT_APPROVED", "Offer approval must be approved separately from partner approval."));
  }
  if (hasExpired(input.offer.expiresAt, now)) {
    blockers.push(blocker("OFFER_EXPIRED", "Offer approval or availability has expired."));
  }
  if (!input.partner.allowedSurfaces.includes(input.surface) || !input.offer.allowedSurfaces.includes(input.surface)) {
    blockers.push(blocker("SURFACE_NOT_ALLOWED", `Partner and offer must both allow ${input.surface}.`));
  }
  if (highRisk && !input.offer.termsUrl) {
    blockers.push(blocker("MISSING_TERMS_URL", "High-risk offers require a terms URL."));
  }

  const disclosure = reviewDisclosure({
    disclosureText: input.offer.disclosureText,
    offer: input.offer,
    partner: input.partner,
    surface: input.surface,
  });
  if (!disclosure.ok) {
    blockers.push(blocker("MISSING_DISCLOSURE", disclosure.reasons.join(" ")));
  }

  const responsibleGaming = reviewResponsibleGaming({ offer: input.offer, userState: input.userState });
  for (const reason of responsibleGaming.reasons) {
    blockers.push(blocker(classifyResponsibleGamingReason(reason), reason));
  }

  return { blockers, highRisk, ok: blockers.length === 0 };
}

function blocker(code: OfferEligibilityBlockerCode, message: string): OfferEligibilityBlocker {
  return { code, message };
}

function classifyResponsibleGamingReason(reason: string): OfferEligibilityBlockerCode {
  if (reason.includes("unknown")) return "UNKNOWN_STATE";
  if (reason.includes("restricted")) return "STATE_RESTRICTED";
  if (reason.includes("eligible")) return "STATE_NOT_ELIGIBLE";
  return "MISSING_RESPONSIBLE_GAMING";
}
