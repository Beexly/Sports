import type { RevenueOffer, RevenuePartner, RevenueSurface } from "./partner-types";
import { isHighRiskOffer } from "./partner-types";

export interface DisclosureReviewInput {
  readonly partner: RevenuePartner;
  readonly offer?: RevenueOffer;
  readonly surface: RevenueSurface;
  readonly disclosureText?: string;
}

export interface DisclosureReview {
  readonly ok: boolean;
  readonly required: boolean;
  readonly reasons: readonly string[];
}

export function requiresDisclosure(partner: RevenuePartner, offer?: RevenueOffer): boolean {
  return partner.disclosureRequired || Boolean(offer) || (offer ? isHighRiskOffer(offer) : false);
}

export function reviewDisclosure(input: DisclosureReviewInput): DisclosureReview {
  const required = requiresDisclosure(input.partner, input.offer);
  const reasons: string[] = [];
  const text = input.disclosureText ?? input.offer?.disclosureText;

  if (required && !hasUsableDisclosure(text)) {
    reasons.push("Disclosure is required and must be clear near the partner or offer mention.");
  }
  if (input.offer && !input.offer.allowedSurfaces.includes(input.surface)) {
    reasons.push(`Offer is not approved for ${input.surface}.`);
  }
  if (!input.partner.allowedSurfaces.includes(input.surface)) {
    reasons.push(`Partner is not approved for ${input.surface}.`);
  }

  return { ok: reasons.length === 0, reasons, required };
}

function hasUsableDisclosure(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.includes("sponsor") || normalized.includes("affiliate") || normalized.includes("commission") || normalized.includes("paid");
}
