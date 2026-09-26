import { reviewDisclosure } from "@/lib/revenue/disclosure-policy";
import { isRevenueSurface, type RevenueSurface } from "@/lib/revenue/partner-types";

import { block, pass, type FenceInput, type FencePlugin } from "./fence-types";
import { readMetadataOffer, readMetadataPartner } from "./revenue-metadata";

const FENCE_ID = "affiliate-disclosure";

export const affiliateDisclosureFence: FencePlugin = {
  description: "Requires clear sponsor or affiliate disclosure near partner and offer mentions.",
  evaluate(input) {
    const partner = readMetadataPartner(input);
    const offer = readMetadataOffer(input);
    const surface = metadataSurface(input) ?? "newsletter";
    const text = input.text ?? "";

    // Malformed partner/offer metadata fails closed rather than degrading to
    // the keyword heuristic below, which only inspects free text and would
    // clear a partner mention whose structured metadata could not be reviewed.
    if (partner.kind === "invalid" || offer.kind === "invalid") {
      return block(
        FENCE_ID,
        ["Partner or offer metadata is malformed and cannot be reviewed for disclosure."],
        ["Correct the RevenuePartner/RevenueOffer metadata (category, approvalStatus, allowedSurfaces) before use."],
      );
    }

    const offerValue = offer.kind === "ok" ? offer.value : undefined;
    const disclosureText = metadataString(input, "disclosureText") ?? offerValue?.disclosureText ?? text;

    if (partner.kind === "ok") {
      const review = reviewDisclosure({ disclosureText, offer: offerValue, partner: partner.value, surface });
      if (review.ok) return pass(FENCE_ID);
      return block(FENCE_ID, review.reasons, ["Place a clear sponsor, affiliate, commission, or paid disclosure near the offer."]);
    }

    if (/\b(sponsor|sponsored|affiliate|commission|promo code|partner offer)\b/i.test(text) && !/\b(disclosure|sponsored|affiliate|commission|paid)\b/i.test(text)) {
      return block(
        FENCE_ID,
        ["Partner or affiliate language appears without a clear disclosure marker."],
        ["Add nearby disclosure text before draft approval."],
      );
    }

    return pass(FENCE_ID);
  },
  id: FENCE_ID,
};

function metadataString(input: FenceInput, key: string): string | undefined {
  const value = input.metadata[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Reads `metadata.surface`, falling back to the caller's default when absent or
 * not a RevenueSurface member. The local union list this replaced could drift
 * from the type; `isRevenueSurface` is generated from an exhaustive table.
 */
function metadataSurface(input: FenceInput): RevenueSurface | undefined {
  const value = input.metadata.surface;
  return isRevenueSurface(value) ? value : undefined;
}
