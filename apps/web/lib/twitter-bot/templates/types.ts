/**
 * Twitter bot template types.
 *
 * Spec: docs/product/twitter-bot-voice-spec.md
 * Owner: Claude (template content + voice rules) + Codex (runtime + posting).
 */

export type TwitterEventKind =
  | "SLATE_STATE_GATED"
  | "PICK_PUBLICATION"
  | "SETTLEMENT_WIN"
  | "SETTLEMENT_LOSS"
  | "POST_MORTEM_THREAD";

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

export interface PickPublicationInput {
  matchup: string;
  pickKind: string;
  line: string;
  side: string;
  pickGrade: string;
  confidence: number;
  sport: string;
  gameId: string;
  modelVersion: string;
}

export interface SlateStateGatedInput {
  matchup: string;
  edgeIndex: number | null;
  gateReasonText: string;
  sport: string;
  gameId: string;
  modelVersion: string;
}

export interface SettlementInput {
  matchup: string;
  pickLine: string;
  outcome: "W" | "L" | "PUSH";
  heaviestContributorFactor: FactorKey | null;
  biggestMissFactor: FactorKey | null;
  oneLineCause: string | null;
  sport: string;
  gameId: string;
  modelVersion: string;
}

export interface PostMortemThreadInput extends SettlementInput {
  topFactorsAtPublish: Array<{ factor: FactorKey; score: number }>;
  whatChanged: string;
  whatThisUpdates: string;
}

export interface TweetOutput {
  text: string;
  charCount: number;
  hashtags: string[];
  linkUrl: string;
}
