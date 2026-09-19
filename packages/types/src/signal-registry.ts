import type { EvidenceActivationStatus, SignalCategory } from "./index.js";

export type SportKey =
  | "americanfootball_nfl"
  | "americanfootball_ncaaf"
  | "baseball_mlb"
  | "basketball_nba"
  | "basketball_ncaab"
  | "icehockey_nhl"
  | "soccer_epl"
  | "soccer_usa_mls";

export type SignalFamily =
  | "MARKET"
  | "EFFICIENCY"
  | "TRENCHES"
  | "LUCK"
  | "SITUATIONAL"
  | "NARRATIVE";

export type SignalOutputKind =
  | "2WAY_PROBABILITY"
  | "3WAY_PROBABILITY"
  | "SPREAD_COVER_PROBABILITY";

export interface SignalKillLine {
  /** Maximum acceptable Brier score vs de-vigged market consensus (Default: 0.250). */
  readonly maxBrierScoreVsMarket: number;
  /** Minimum settled sample size required before trustWeight can be moved above 0.0. */
  readonly minSettledSample: number;
  /** Max divergence Z-score vs market before auto-degraded to BLOCKED_LOW_TRUST. */
  readonly maxDivergenceZScore: number;
  /** Maximum allowable data age in minutes before auto-degraded to BLOCKED_STALE. */
  readonly maxAgeMinutes: number;
}

export interface SignalEvaluationContext {
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: Date;
  readonly spreadHome?: number | null;
  readonly totalPoints?: number | null;
  readonly env: Record<string, string | undefined>;
  readonly now: () => Date;
  readonly prefetched?: readonly import("./index.js").IndependentMarketFairValue[];
  readonly skipNetworkIndependents?: boolean;
}

export interface SignalValue {
  /** P(Home team wins), strictly in [0.0, 1.0]. */
  readonly homeFairProb: number;
  /** P(Away team wins), strictly in [0.0, 1.0]. */
  readonly awayFairProb: number;
  /** P(Draw/Tie) for 3-way markets (e.g. Soccer), strictly in [0.0, 1.0]. */
  readonly drawFairProb?: number | null;
  /** ISO timestamp of data freshness used for CLV as-of indexing. */
  readonly capturedAt: string;
  /** Optional signal metadata for the factor breakdown payload. */
  readonly metadata?: Record<string, unknown>;
}

export type SignalEvaluator = (
  ctx: SignalEvaluationContext
) => Promise<SignalValue | null> | SignalValue | null;

export interface SignalDefinition {
  /** Unique, immutable snake_case identifier (e.g. "nfl_epa_opponent_adjusted"). */
  readonly id: string;
  /** Clean human-readable label rendered in factor breakdowns. */
  readonly label: string;
  /** Top-level category mirroring Prisma SignalCategory enum. */
  readonly category: SignalCategory;
  /** Natural family taxonomy for multi-collinearity checks. */
  readonly family: SignalFamily;
  /** Expected market output structure. */
  readonly outputKind: SignalOutputKind;
  /** Valid sports. Empty array indicates sport-agnostic. */
  readonly validSports: readonly SportKey[];
  /** Named human/subsystem owner accountable for this signal. */
  readonly owner: string;
  /** Upstream database tables, API keys, or files required. */
  readonly dataDependencies: readonly string[];
  /** Lifecycle activation status. */
  readonly activationStatus: EvidenceActivationStatus;
  /** Contribution weight in the independent blend (0.0 to 1.0). */
  readonly trustWeight: number;
  /** Pre-registered automated kill line thresholds. */
  readonly killLine: SignalKillLine;
  /** Isolated rights gate. Must evaluate to true for execution. */
  readonly isRightsCleared: (env: Record<string, string | undefined>) => boolean;
  /** Jira/Linear/GSE task tracking missing data acquisition. */
  readonly acquisitionTask: string | null;
  /** Plain-English explanation when non-ACTIVE. */
  readonly blockedReason: string | null;
  /** Pure execution function. Required if ACTIVE or SHADOW_ONLY. */
  readonly evaluate?: SignalEvaluator;
}
