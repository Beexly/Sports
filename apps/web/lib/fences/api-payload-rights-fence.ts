import { evaluateApiV1PayloadRights } from "@/lib/api/v1/payload-rights";
import type { ApiV1PayloadUse } from "@/lib/api/v1/types";

import { block, pass, type FenceInput, type FencePlugin } from "./fence-types";

const FENCE_ID = "api-payload-rights";

export const apiPayloadRightsFence: FencePlugin = {
  description: "Runs API payload source ids through the API v1 payload-rights gate.",
  evaluate(input) {
    if (input.surface !== "api") return pass(FENCE_ID);

    const sourceIds = metadataStringArray(input, "sourceIds");
    const intendedUse = metadataPayloadUse(input) ?? "derived_feature";
    const decision = evaluateApiV1PayloadRights({
      includesPersonalData: metadataBoolean(input, "includesPersonalData"),
      includesRawVendorPayload: metadataBoolean(input, "includesRawVendorPayload"),
      intendedUse,
      sourceIds,
    });

    if (decision.allowed) return pass(FENCE_ID);
    return block(FENCE_ID, decision.blockers, ["Remove raw/restricted fields or switch to cleared derived payloads."]);
  },
  id: FENCE_ID,
};

function metadataStringArray(input: FenceInput, key: string): readonly string[] {
  const value = input.metadata[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function metadataBoolean(input: FenceInput, key: string): boolean {
  return input.metadata[key] === true;
}

function metadataPayloadUse(input: FenceInput): ApiV1PayloadUse | null {
  const value = input.metadata.intendedUse;
  const uses: readonly ApiV1PayloadUse[] = [
    "commercial_display",
    "derived_feature",
    "raw_storage",
    "partner_sharing",
    "model_training",
    "public_display",
  ];
  return typeof value === "string" && uses.includes(value as ApiV1PayloadUse) ? (value as ApiV1PayloadUse) : null;
}
