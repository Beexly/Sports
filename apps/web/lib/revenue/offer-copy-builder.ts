import type { RevenueOffer, RevenuePartner } from "./partner-types";
import { scanCommercialCopy } from "./banned-copy";

export interface OfferCopyDraft {
  readonly headline: string;
  readonly body: string;
  readonly disclosure: string;
  readonly ok: boolean;
  readonly warnings: readonly string[];
}

export function buildOfferCopyDraft(partner: RevenuePartner, offer: RevenueOffer): OfferCopyDraft {
  const disclosure = offer.disclosureText ?? `${partner.displayName} relationship requires disclosure before publication.`;
  const headline = `${partner.displayName}: ${offer.publicName}`;
  const body = "Partner mention is pending manual review and must stay educational, disclosed, and surface-approved.";
  const scan = scanCommercialCopy(`${headline} ${body} ${disclosure}`);
  return {
    body,
    disclosure,
    headline,
    ok: scan.ok,
    warnings: scan.warnings,
  };
}
