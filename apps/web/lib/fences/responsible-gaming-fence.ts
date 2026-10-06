import { reviewResponsibleGaming } from "@/lib/revenue/responsible-gaming-policy";

import { block, pass, type FenceInput, type FencePlugin } from "./fence-types";
import { readMetadataOffer } from "./revenue-metadata";

const FENCE_ID = "responsible-gaming";

export const responsibleGamingFence: FencePlugin = {
  description: "Fails closed for regulated sportsbook/DFS offers without responsible-gaming metadata.",
  evaluate(input) {
    const offer = readMetadataOffer(input);

    // A malformed offer is NOT the same as no offer. Falling through to the
    // text heuristic below would let an unparseable regulated offer pass on an
    // empty `text`; the fence's contract is to fail closed instead.
    if (offer.kind === "invalid") {
      return block(
        FENCE_ID,
        ["Offer metadata is malformed and cannot be reviewed for responsible gaming."],
        ["Correct the RevenueOffer metadata (category, approvalStatus, riskClass, allowedSurfaces) before use."],
      );
    }

    if (offer.kind === "ok") {
      const review = reviewResponsibleGaming({ offer: offer.value, userState: metadataString(input, "userState") });
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
