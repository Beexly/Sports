/**
 * Discord bot template: slate state — gated game embed.
 *
 * Spec: docs/product/discord-bot-spec.md section "Slate state (gated) embed"
 */

import {
  type SlateStateGatedInput,
  type DiscordEmbed,
  BRAND_COLORS,
} from "./types";

export function buildSlateStateGatedEmbed(
  input: SlateStateGatedInput,
  publicUrl: string,
): DiscordEmbed {
  const roomUrl = `${publicUrl}/room/${input.gameId}`;

  return {
    title: `Just gated ${input.matchup}`,
    description: input.gateReasonText,
    fields: [
      {
        name: "Edge Index",
        value: input.edgeIndex !== null ? input.edgeIndex.toFixed(1) : "n/a",
        inline: true,
      },
      {
        name: "Gate reason",
        value: input.gateReason,
        inline: true,
      },
      {
        name: "Sport",
        value: input.sport,
        inline: true,
      },
    ],
    footer: {
      text: `Model ${input.modelVersion} · ${publicUrl.replace(/^https?:\/\//, "")}`,
    },
    color: BRAND_COLORS.GATED_GREY,
    timestamp: input.gateDecisionAt.toISOString(),
    url: roomUrl,
  };
}
