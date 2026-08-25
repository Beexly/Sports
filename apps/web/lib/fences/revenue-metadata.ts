/**
 * Revenue-domain readers over `FenceInput.metadata`.
 *
 * Kept out of fence-types.ts so the generic fence framework does not depend on
 * the revenue domain. Both the affiliate-disclosure and responsible-gaming
 * fences read the same two objects, and both must treat a malformed value as a
 * BLOCK rather than as "no offer/partner supplied" — see MetadataRead.
 */

import type { RevenueOffer, RevenuePartner } from "@/lib/revenue/partner-types";
import { parseRevenueOffer, parseRevenuePartner } from "@/lib/revenue/partner-types";

import { readMetadata, type FenceInput, type MetadataRead } from "./fence-types";

/** Read `metadata.offer` as a fully validated RevenueOffer. */
export function readMetadataOffer(input: FenceInput): MetadataRead<RevenueOffer> {
  return readMetadata(input, "offer", parseRevenueOffer);
}

/** Read `metadata.partner` as a fully validated RevenuePartner. */
export function readMetadataPartner(input: FenceInput): MetadataRead<RevenuePartner> {
  return readMetadata(input, "partner", parseRevenuePartner);
}
