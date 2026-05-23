/**
 * Discord bot template: settlement embed (W/L/Push).
 *
 * Spec: docs/product/discord-bot-spec.md section "Settlement embed"
 */

import {
  type SettlementInput,
  type DiscordEmbed,
  type FactorKey,
  BRAND_COLORS,
} from "./types";

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

export function buildSettlementEmbed(
  input: SettlementInput,
  publicUrl: string,
): DiscordEmbed {
  const roomUrl = `${publicUrl}/room/${input.gameId}`;

  let title: string;
  let description: string;
  let outcomeField: string;
  let color: number;
  let footerSuffix: string;

  if (input.outcome === "W") {
    title = `Settled ${input.pickLine} ✅ WIN`;
    description = `${friendlyFactor(input.heaviestContributorFactor)} signal was the heaviest contributor.`;
    outcomeField = "WIN - covered";
    color = BRAND_COLORS.WIN_GREEN;
    footerSuffix = "Full snapshot";
  } else if (input.outcome === "L") {
    title = `Settled ${input.pickLine} ❌ LOSS`;
    const factor = friendlyFactor(input.biggestMissFactor);
    const cause = input.oneLineCause ?? "factor read did not hold";
    description = `${factor} signal misread. ${cause}.`;
    outcomeField = "LOSS - did not cover";
    color = BRAND_COLORS.LOSS_RED;
    footerSuffix = "Post-mortem";
  } else {
    title = `Settled ${input.pickLine} ⚖️ PUSH`;
    description = "Line landed on the number.";
    outcomeField = "PUSH - line landed on the number";
    color = BRAND_COLORS.PUSH_AMBER;
    footerSuffix = "Full snapshot";
  }

  return {
    title,
    description,
    fields: [
      {
        name: "Result",
        value: input.finalScore || outcomeField,
        inline: true,
      },
      {
        name: "At publish",
        value: `${Math.round(input.confidenceAtPublish)}% confidence`,
        inline: true,
      },
      {
        name: "Outcome",
        value: outcomeField,
        inline: true,
      },
    ],
    footer: {
      text: `Model ${input.modelVersion} | ${publicUrl.replace(/^https?:\/\//, "")} | ${footerSuffix}`,
    },
    color,
    timestamp: input.settledAt.toISOString(),
    url: roomUrl,
  };
}
