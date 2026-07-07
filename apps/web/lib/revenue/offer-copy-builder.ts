import type { RevenueOffer, RevenuePartner } from "./partner-types";
import { scanCommercialCopy } from "./banned-copy";

export interface OfferCopyDraft {
  readonly headline: string;
  readonly body: string;
  readonly disclosure: string;
  readonly ok: boolean;
  readonly warnings: readonly string[];
}

// Kept in sync with hasUsableDisclosure() in disclosure-policy.ts: a disclosure
// is only usable if it actually names the commercial relationship. Mirrored here
// (rather than imported) because that helper is module-private; the keyword set
// must match so buildOfferCopyDraft.ok cannot signal publish-readiness while
// emitting a disclosure the disclosure policy would reject.
const DISCLOSURE_KEYWORDS = ["sponsor", "affiliate", "commission", "paid"] as const;

function hasUsableDisclosure(value: string): boolean {
  const normalized = value.toLowerCase();
  return DISCLOSURE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function buildOfferCopyDraft(partner: RevenuePartner, offer: RevenueOffer): OfferCopyDraft {
  const disclosure = offer.disclosureText ?? `${partner.displayName} relationship requires disclosure before publication.`;
  const headline = `${partner.displayName}: ${offer.publicName}`;
  const body = "Partner mention is pending manual review and must stay educational, disclosed, and surface-approved.";
  const scan = scanCommercialCopy(`${headline} ${body} ${disclosure}`);

  // A clean banned-term scan is not publish-readiness on its own: the draft must
  // also carry a disclosure the disclosure policy would accept. A missing offer
  // disclosureText only yields the placeholder above, which names no commercial
  // relationship and would fail reviewDisclosure — so ok must fail closed here.
  const disclosureUsable = hasUsableDisclosure(disclosure);
  const warnings = disclosureUsable
    ? scan.warnings
    : [
        ...scan.warnings,
        "Disclosure is not publish-ready: it must clearly name the sponsor/affiliate/commission/paid relationship before publication.",
      ];

  return {
    body,
    disclosure,
    headline,
    ok: scan.ok && disclosureUsable,
    warnings,
  };
}
