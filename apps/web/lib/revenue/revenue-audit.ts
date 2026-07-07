import type { RevenueOffer, RevenuePartner, RevenueSurface } from "./partner-types";
import { evaluateOfferEligibility } from "./offer-eligibility";
import { scorePartnerRisk } from "./partner-risk-engine";

export interface RevenueAuditInput {
  readonly partners: readonly RevenuePartner[];
  readonly offers: readonly RevenueOffer[];
  readonly surface: RevenueSurface;
  readonly userState?: string;
  readonly now?: Date;
}

export interface RevenueAuditSummary {
  readonly partnerCount: number;
  readonly offerCount: number;
  readonly approvedOfferCount: number;
  readonly blockedOfferCount: number;
  readonly highRiskPartnerCount: number;
  readonly blockers: readonly string[];
}

export function auditRevenueSurface(input: RevenueAuditInput): RevenueAuditSummary {
  const blockers: string[] = [];
  let approvedOfferCount = 0;
  let blockedOfferCount = 0;

  const offersByPartner = new Map<string, RevenueOffer[]>();
  for (const offer of input.offers) {
    const bucket = offersByPartner.get(offer.partnerId);
    if (bucket) {
      bucket.push(offer);
    } else {
      offersByPartner.set(offer.partnerId, [offer]);
    }
  }

  for (const offer of input.offers) {
    const partner = input.partners.find((candidate) => candidate.id === offer.partnerId);
    if (!partner) {
      blockedOfferCount++;
      blockers.push(`${offer.id}: missing partner`);
      continue;
    }
    const decision = evaluateOfferEligibility({ ...input, offer, partner });
    if (decision.ok) {
      approvedOfferCount++;
    } else {
      blockedOfferCount++;
      blockers.push(`${offer.id}: ${decision.blockers.map((blocker) => blocker.code).join(",")}`);
    }
  }

  let highRiskPartnerCount = 0;
  for (const partner of input.partners) {
    const partnerOffers = offersByPartner.get(partner.id) ?? [];
    const { tier } = scorePartnerRisk(partner, partnerOffers);
    if (tier === "HIGH" || tier === "BLOCKED") {
      highRiskPartnerCount++;
    }
  }

  return {
    approvedOfferCount,
    blockedOfferCount,
    blockers,
    highRiskPartnerCount,
    offerCount: input.offers.length,
    partnerCount: input.partners.length,
  };
}
