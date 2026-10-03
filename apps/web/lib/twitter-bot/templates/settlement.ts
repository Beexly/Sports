/**
 * Twitter bot template: settlement (win/loss/push).
 *
 * Spec: docs/product/twitter-bot-voice-spec.md section "Free pick settlements"
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

  let outcomeSymbol = "";
  let outcomeLabel = "";
  let bodyLine = "";
  let linkLabel = "";

  if (input.outcome === "W") {
    outcomeSymbol = "\u2705";
    outcomeLabel = "WIN";
    bodyLine = `${friendlyFactor(input.heaviestContributorFactor)} signal was the heaviest contributor.`;
    linkLabel = "Full snapshot";
  } else if (input.outcome === "L") {
    outcomeSymbol = "\u274C";
    outcomeLabel = "LOSS";
    const factor = friendlyFactor(input.biggestMissFactor);
    const cause = input.oneLineCause ?? "factor read did not hold";
    bodyLine = `${factor} signal misread. ${cause}.`;
    linkLabel = "Post-mortem";
  } else {
    outcomeSymbol = "\u2696\uFE0F";
    outcomeLabel = "PUSH";
    bodyLine = "Line landed on the number.";
    linkLabel = "Full snapshot";
  }

  const text = [
    `Settled ${input.pickLine} ${outcomeSymbol} ${outcomeLabel} - ${bodyLine}`,
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
