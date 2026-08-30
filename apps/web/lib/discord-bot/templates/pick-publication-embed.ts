/**
 * Discord bot template: free pick publication embed.
 *
 * Spec: docs/product/discord-bot-spec.md section "Pick publication embed"
 */

import {
  type PickPublicationInput,
  type DiscordEmbed,
  BRAND_COLORS,
} from "./types";

const PICK_GRADE_LABELS: Record<string, string> = {
  SOLID_PLAY: "SOLID_PLAY",
  LEAN: "LEAN",
  NOTE: "NOTE",
};

function formatGameTime(date: Date): string {
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }) + " ET";
}

export function buildPickPublicationEmbed(
  input: PickPublicationInput,
  publicUrl: string,
): DiscordEmbed {
  const gradeLabel = PICK_GRADE_LABELS[input.pickGrade] ?? input.pickGrade;
  const confidence = Math.round(input.confidence);
  const roomUrl = `${publicUrl}/room/${input.gameId}`;

  return {
    title: `Published ${input.line} (${gradeLabel})`,
    description: `Confidence ${confidence}%. Factor breakdown in the Game Room.`,
    fields: [
      {
        name: "Edge Index",
        value: input.edgeIndex !== null ? input.edgeIndex.toFixed(1) : "n/a",
        inline: true,
      },
      {
        name: "Sport",
        value: input.sport,
        inline: true,
      },
      {
        name: "Game time",
        value: formatGameTime(input.gameStartsAt),
        inline: true,
      },
    ],
    footer: {
      text: `Model ${input.modelVersion} | ${publicUrl.replace(/^https?:\/\//, "")}`,
    },
    color: BRAND_COLORS.ULTRAVIOLET,
    timestamp: new Date().toISOString(),
    url: roomUrl,
  };
}
