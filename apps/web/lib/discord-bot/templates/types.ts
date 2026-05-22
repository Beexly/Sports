/**
 * Discord bot template types.
 *
 * Mirrors the Twitter bot's event coverage but uses Discord embed format
 * (title, description, fields, footer, color, timestamp, image).
 *
 * Spec: docs/product/discord-bot-spec.md
 */

export type FactorKey =
  | "consensus"
  | "depth"
  | "edge"
  | "lineMovement"
  | "volatility"
  | "headToHead"
  | "venueForm"
  | "scheduleStress"
  | "restAdvantage"
  | "crossMarket"
  | "dataQuality";

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  fields: DiscordEmbedField[];
  footer: { text: string };
  color: number;
  timestamp: string;
  url?: string;
  image?: { url: string };
}

export interface PickPublicationInput {
  matchup: string;
  pickKind: string;
  line: string;
  side: string;
  pickGrade: string;
  confidence: number;
  edgeIndex: number | null;
  sport: string;
  gameId: string;
  modelVersion: string;
  gameStartsAt: Date;
}

export interface SlateStateGatedInput {
  matchup: string;
  edgeIndex: number | null;
  gateReason: string;
  gateReasonText: string;
  sport: string;
  gameId: string;
  modelVersion: string;
  gateDecisionAt: Date;
}

export interface SettlementInput {
  matchup: string;
  pickLine: string;
  outcome: "W" | "L" | "PUSH";
  finalScore: string;
  confidenceAtPublish: number;
  heaviestContributorFactor: FactorKey | null;
  biggestMissFactor: FactorKey | null;
  oneLineCause: string | null;
  sport: string;
  gameId: string;
  modelVersion: string;
  settledAt: Date;
}

// Brand colors as decimal RGB ints (Discord's color field accepts decimal).
export const BRAND_COLORS = {
  ULTRAVIOLET: 0x7b61ff, // brand primary
  WIN_GREEN: 0x4caf50,
  LOSS_RED: 0xe53935,
  PUSH_AMBER: 0xffb300,
  GATED_GREY: 0x888888,
} as const;
