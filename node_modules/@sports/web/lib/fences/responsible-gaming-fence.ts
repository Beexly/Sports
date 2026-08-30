import { reviewResponsibleGaming } from "@/lib/revenue/responsible-gaming-policy";
import type { RevenueOffer } from "@/lib/revenue/partner-types";

import { block, pass, type FenceInput, type FencePlugin } from "./fence-types";

const FENCE_ID = "responsible-gaming";

export const responsibleGamingFence: FencePlugin = {
  description: "Fails closed for regulated sportsbook/DFS offers without responsible-gaming metadata.",
  evaluate(input) {
    const offer = metadataOffer(input);
    if (offer !== null) {
      const review = reviewResponsibleGaming({ offer, userState: metadataString(input, "userState") });
      if (review.ok) return pass(FENCE_ID);
      return block(FENCE_ID, review.reasons, ["Add 21+ policy, responsible-gaming language, and state eligibility before use."]);
    }

    const text = input.text ?? "";
    if (/\b(sportsbook|dfs|deposit|wager|gambling|contest prize)\b/i.test(text)) {
      return block(
        FENCE_ID,
        ["Regulated wagering or contest language requires a structured offer review."],
        ["Attach a RevenueOffer in metadata and pass responsible-gaming review."],
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
