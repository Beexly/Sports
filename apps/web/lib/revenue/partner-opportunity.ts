import type { RevenueOffer, RevenuePartner, RevenueSurface } from "./partner-types";
import { evaluateOfferEligibility } from "./offer-eligibility";
import { scorePartnerRisk } from "./partner-risk-engine";

export type PartnerOpportunityDecision = "PURSUE" | "REVIEW_FIRST" | "HOLD" | "REJECT";

export interface PartnerOpportunityInput {
  readonly partner: RevenuePartner;
  readonly offers?: readonly RevenueOffer[];
  readonly surface: RevenueSurface;
  readonly userState?: string;
  readonly now?: Date;
}

export interface PartnerOpportunityResult {
  readonly decision: PartnerOpportunityDecision;
  readonly riskScore: number;
  readonly reasons: readonly string[];
}

export function evaluatePartnerOpportunity(input: PartnerOpportunityInput): PartnerOpportunityResult {
  const offers = input.offers ?? [];
  const risk = scorePartnerRisk(input.partner, offers);
  const reasons = [...risk.reasons];
  const offerDecisions = offers.map((offer) =>
    evaluateOfferEligibility({ now: input.now, offer, partner: input.partner, surface: input.surface, userState: input.userState }),
  );

  if (input.partner.approvalStatus === "rejected" || input.partner.approvalStatus === "suspended") {
    return { decision: "REJECT", reasons: [...reasons, "Partner status blocks opportunity."], riskScore: risk.score };
  }
  if (offerDecisions.some((decision) => !decision.ok && decision.highRisk)) {
    return { decision: "REVIEW_FIRST", reasons: [...reasons, "High-risk offer requires review before any placement."], riskScore: risk.score };
  }
  if (input.partner.approvalStatus !== "approved" || offerDecisions.some((decision) => !decision.ok)) {
    return { decision: "HOLD", reasons: [...reasons, "Partner or offer is not ready for placement."], riskScore: risk.score };
  }
  if (risk.tier === "LOW" || risk.tier === "MEDIUM") {
    return { decision: "PURSUE", reasons, riskScore: risk.score };
  }
  return { decision: "REVIEW_FIRST", reasons, riskScore: risk.score };
}
