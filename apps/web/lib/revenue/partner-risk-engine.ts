import type { RevenueOffer, RevenuePartner } from "./partner-types";
import { isHighRiskOffer, isHighRiskPartnerCategory } from "./partner-types";

export type PartnerRiskTier = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

export interface PartnerRiskResult {
  readonly score: number;
  readonly tier: PartnerRiskTier;
  readonly reasons: readonly string[];
}

export function scorePartnerRisk(partner: RevenuePartner, offers: readonly RevenueOffer[] = []): PartnerRiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (partner.approvalStatus !== "approved") {
    score += 40;
    reasons.push("Partner is not approved.");
  }
  if (isHighRiskPartnerCategory(partner.category)) {
    score += 35;
    reasons.push("Partner category is regulated or contest-like.");
  }
  if (partner.disclosureRequired) {
    score += 8;
    reasons.push("Disclosure is required on every mention.");
  }
  if (offers.some(isHighRiskOffer)) {
    score += 25;
    reasons.push("At least one offer is high-risk.");
  }
  if (offers.some((offer) => offer.approvalStatus !== "approved")) {
    score += 18;
    reasons.push("At least one offer is not approved.");
  }

  const clamped = Math.min(100, score);
  return { reasons, score: clamped, tier: tierForScore(clamped) };
}

function tierForScore(score: number): PartnerRiskTier {
  if (score >= 80) return "BLOCKED";
  if (score >= 55) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}
