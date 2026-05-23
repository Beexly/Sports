/**
 * Twitter bot template: settlement (win/loss/push).
 *
 * Spec: docs/product/twitter-bot-voice-spec.md section "Free pick settlements"
 *
 * WIN format:
 *   Settled CLE -7 ✅ WIN - schedule stress signal was the heaviest contributor.
 *   Full snapshot: https://galaxysportsedge.com/room/<gameId>
 *
 * LOSS format:
 *   Settled MIN +6 ❌ LOSS - rest advantage signal misread. MIN was more fatigued than projected.
 *   Post-mortem: https://galaxysportsedge.com/room/<gameId>
 */

import type { SettlementInput, TweetOutput, FactorKey } from "./types";

const SPORT_HASHTAGS: Record<string, string> = {
  NBA: "NBA",
  NFL: "NFL",
  MLB: "MLB",
  NHL: "NHL",
  NCAAF: "CFB",
  NCAAB: "CBB",
};

const FACTOR_FRIENDLY_NAMES: Record<FactorKey, string> = {
  consensus: "consensus",
  depth: "depth",
  edge: "edge",
  lineMovement: "line movement",
  volatility: "volatility",
  headToHead: "head-to-head",
  venueForm: "venue form",
  scheduleStress: "schedule stress",
  restAdvantage: "rest advantage",
  crossMarket: "cross-market",
  dataQuality: "data quality",
};

function friendlyFactor(factor: FactorKey | null): string {
  if (factor === null) return "data";
  return FACTOR_FRIENDLY_NAMES[factor] ?? factor;
}

export function buildSettlementTweet(
  input: SettlementInput,
  publicUrl: string,
): TweetOutput {
  const linkUrl = `${publicUrl}/room/${input.gameId}`;
  const hashtag = SPORT_HASHTAGS[input.sport];

  let outcomeEmoji = "";
  let outcomeLabel = "";
  let bodyLine = "";
  let linkLabel = "";

  if (input.outcome === "W") {
    outcomeEmoji = "✅";
    outcomeLabel = "WIN";
    bodyLine = `${friendlyFactor(input.heaviestContributorFactor)} signal was the heaviest contributor.`;
    linkLabel = "Full snapshot";
  } else if (input.outcome === "L") {
    outcomeEmoji = "❌";
    outcomeLabel = "LOSS";
    const factor = friendlyFactor(input.biggestMissFactor);
    const cause = input.oneLineCause ?? "factor read did not hold";
    bodyLine = `${factor} signal misread. ${cause}.`;
    linkLabel = "Post-mortem";
  } else {
    outcomeEmoji = "⚖️";
    outcomeLabel = "PUSH";
    bodyLine = "Line landed on the number.";
    linkLabel = "Full snapshot";
  }

  const text = [
    `Settled ${input.pickLine} ${outcomeEmoji} ${outcomeLabel} - ${bodyLine}`,
    "",
    `${linkLabel}: ${linkUrl}`,
    hashtag ? `#${hashtag}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    text,
    charCount: text.length,
    hashtags: hashtag ? [hashtag] : [],
    linkUrl,
  };
}
