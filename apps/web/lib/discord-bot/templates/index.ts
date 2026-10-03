/**
 * Discord bot embed templates.
 *
 * Three event types ship in Phase 3 v0: pick publication, slate state
 * (gated), and settlement (W/L/Push covered by one builder).
 *
 * Post-mortem threads are constructed by the Discord bot runtime using the
 * settlement embed as the parent and posting follow-up messages in the
 * resulting thread; the post text for each follow-up matches the Twitter
 * bot's post-mortem thread structure (see lib/twitter-bot/templates/post-mortem-thread.ts).
 *
 * Spec: docs/product/discord-bot-spec.md
 */

export { buildPickPublicationEmbed } from "./pick-publication-embed";
export { buildSlateStateGatedEmbed } from "./slate-state-gated-embed";
export { buildSettlementEmbed } from "./settlement-embed";

export type {
  FactorKey,
  DiscordEmbed,
  DiscordEmbedField,
  PickPublicationInput,
  SlateStateGatedInput,
  SettlementInput,
} from "./types";

export { BRAND_COLORS } from "./types";
