/**
 * Twitter bot templates.
 *
 * Four event types ship in Phase 3: pick publication, slate state (gated),
 * settlement (W/L/Push covered by one builder), and post-mortem thread
 * (multi-post for losses).
 *
 * Spec: docs/product/twitter-bot-voice-spec.md
 */

export { buildPickPublicationTweet } from "./pick-publication";
export { buildSlateStateGatedTweet } from "./slate-state-gated";
export { buildSettlementTweet } from "./settlement";
export { buildPostMortemThread } from "./post-mortem-thread";

export type {
  TwitterEventKind,
  FactorKey,
  PickPublicationInput,
  SlateStateGatedInput,
  SettlementInput,
  PostMortemThreadInput,
  TweetOutput,
} from "./types";
