import { reviewDisclosure } from "@/lib/revenue/disclosure-policy";
import type { RevenueOffer, RevenuePartner, RevenueSurface } from "@/lib/revenue/partner-types";

import { block, pass, type FenceInput, type FencePlugin } from "./fence-types";

const FENCE_ID = "affiliate-disclosure";

export const affiliateDisclosureFence: FencePlugin = {
  description: "Requires clear sponsor or affiliate disclosure near partner and offer mentions.",
  evaluate(input) {
    const partner = metadataPartner(input);
    const offer = metadataOffer(input);
    const surface = metadataSurface(input) ?? "newsletter";
    const text = input.text ?? "";
    const disclosureText = metadataString(input, "disclosureText") ?? offer?.disclosureText ?? text;

    if (partner !== null) {
      const review = reviewDisclosure({ disclosureText, offer: offer ?? undefined, partner, surface });
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

function metadataSurface(input: FenceInput): RevenueSurface | undefined {
  const value = input.metadata.surface;
  const surfaces: readonly RevenueSurface[] = [
    "media_kit",
    "partners_page",
    "newsletter",
    "youtube",
    "short_form",
    "podcast",
    "blog",
    "api_docs",
    "internal_only",
  ];
  return typeof value === "string" && surfaces.includes(value as RevenueSurface) ? (value as RevenueSurface) : undefined;
}

function metadataPartner(input: FenceInput): RevenuePartner | null {
  const value = input.metadata.partner;
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.category !== "string" ||
    typeof value.approvalStatus !== "string" ||
    !Array.isArray(value.allowedSurfaces) ||
    typeof value.disclosureRequired !== "boolean"
  ) {
    return null;
  }
  return value as unknown as RevenuePartner;
}

function metadataOffer(input: FenceInput): RevenueOffer | null {
  const value = input.metadata.offer;
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.partnerId !== "string" ||
    typeof value.publicName !== "string" ||
    typeof value.category !== "string" ||
    typeof value.approvalStatus !== "string" ||
    typeof value.riskClass !== "string" ||
    !Array.isArray(value.allowedSurfaces)
  ) {
    return null;
  }
  return value as unknown as RevenueOffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
