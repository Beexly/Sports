// DFS Optimizer — shared TypeScript types (Phase 1)
// These mirror the Prisma enums and are safe to import in both
// server and client code. Do not import @prisma/client here.

export type DfsSite = "DRAFTKINGS" | "FANDUEL" | "YAHOO";

export type DfsSlateType = "CLASSIC" | "SHOWDOWN" | "SINGLE_GAME" | "TIERS";

export type DfsContestMode =
  | "CASH"
  | "BALANCED"
  | "SINGLE_ENTRY"
  | "SMALL_FIELD_GPP"
  | "LARGE_FIELD_GPP"
  | "CONTRARIAN"
  | "LEVERAGE"
  | "SIMULATION_OPTIMIZED"
  | "LATE_SWAP";

export type DfsProjectionSourceType =
  | "INTERNAL_MODEL"
  | "USER_UPLOAD"
  | "LICENSED_VENDOR"
  | "MANUAL_OVERRIDE"
  | "BLENDED";

export type DfsNarrativeSignalType =
  | "CONTRACT_INCENTIVE"
  | "MILESTONE_GAME"
  | "BIRTHDAY_GAME"
  | "REVENGE_GAME"
  | "HOMECOMING"
  | "PRIMETIME_CONTEXT"
  | "PLAYOFF_URGENCY"
  | "SEEDING_URGENCY"
  | "AWARD_CHASE"
  | "PERSONAL_ACHIEVEMENT"
  | "COACH_QUOTE"
  | "BEAT_REPORT"
  | "ROLE_PROMISE"
  | "DEPTH_CHART_PROMOTION"
  | "TEAMMATE_INJURY_OPPORTUNITY"
  | "RETURN_FROM_INJURY"
  | "RETURN_FROM_SUSPENSION"
  | "TRADE_DEBUT"
  | "NEW_TEAM_ROLE"
  | "CONTRACT_YEAR"
  | "LOCKER_ROOM_FRICTION"
  | "MEDIA_HYPE_SPIKE"
  | "PUBLIC_SENTIMENT_SPIKE"
  | "WEATHER_TOUGHNESS_NARRATIVE"
  | "RIVALRY_CONTEXT";

export type DfsNarrativeImpactType =
  | "VOLUME"
  | "EFFICIENCY"
  | "VARIANCE"
  | "OWNERSHIP"
  | "LATE_SWAP"
  | "CONTEXT_ONLY"
  | "NEGATIVE"
  | "HYPE_ONLY";

export type DfsSourceType =
  | "OFFICIAL_LEAGUE_TEAM"
  | "INJURY_REPORT"
  | "BEAT_REPORTER"
  | "COACH_QUOTE"
  | "PLAYER_QUOTE"
  | "DATA_VENDOR"
  | "ODDS_PROVIDER"
  | "FANTASY_ANALYST"
  | "PUBLIC_SOCIAL"
  | "MARKET_SIGNAL"
  | "USER_UPLOAD"
  | "INTERNAL_MODEL";

export type DfsAutopsyCategory =
  | "GOOD_PROCESS_GOOD_OUTCOME"
  | "GOOD_PROCESS_BAD_OUTCOME"
  | "BAD_PROCESS_GOOD_OUTCOME"
  | "BAD_PROCESS_BAD_OUTCOME"
  | "LUCKY"
  | "RESPECTED_LOSS"
  | "CORRECTED_READ"
  | "NO_PLAY_SAVED_EXPOSURE"
  | "NARRATIVE_TRAP_AVOIDED"
  | "NARRATIVE_TRAP_MISSED"
  | "OWNERSHIP_MISREAD"
  | "PROJECTION_MISS"
  | "SOURCE_MISS"
  | "WEATHER_MISS"
  | "INJURY_MISS"
  | "CORRELATION_MISS";

export type DfsFragilityType =
  | "INJURY_DEPENDENT"
  | "WEATHER_DEPENDENT"
  | "BLOWOUT_SENSITIVE"
  | "COACH_QUOTE_DEPENDENT"
  | "INCENTIVE_DEPENDENT"
  | "TEAMMATE_INACTIVE_DEPENDENT"
  | "LATE_NEWS_DEPENDENT"
  | "LOW_SOURCE_CONFIDENCE"
  | "CHALK_FAILURE_DEPENDENT"
  | "THIN_VOLUME_CEILING"
  | "TOUCHDOWN_ONLY"
  | "GAME_TOTAL_DEPENDENT"
  | "OWNERSHIP_LEVERAGE_DEPENDENT";

// ── Runtime shapes ──────────────────────────────────────────

export interface DfsSlateInfo {
  id: string;
  name: string;
  site: DfsSite;
  slateType: DfsSlateType;
  sport: string;
  season: number | null;
  week: number | null;
  slateDate: string; // ISO string
  lockTime: string | null;
  isLive: boolean;
  isActive: boolean;
}

export interface DfsSalaryRowInfo {
  id: string;
  slateId: string;
  site: DfsSite;
  name: string;
  position: string;
  team: string;
  opponent: string | null;
  salary: number;
  avgPoints: number | null;
  sitePlayerId: string | null;
  isLocked: boolean;
  isExcluded: boolean;
}

export interface DfsPlayerProjectionInfo {
  id: string;
  name: string;
  position: string;
  team: string;
  opponent: string | null;
  salary: number | null;
  site: DfsSite;
  meanProjection: number;
  medianProjection: number | null;
  floorP10: number | null;
  floorP25: number | null;
  ceilingP75: number | null;
  ceilingP90: number | null;
  boomProbability: number | null;
  bustProbability: number | null;
  volatility: number | null;
  projectedOwnership: number | null;
  valueScore: number | null;
  leverageScore: number | null;
  roleStabilityScore: number | null;
  gameEnvironmentScore: number | null;
  healthScore: number | null;
  marketMispricingScore: number | null;
  narrativeSignalScore: number | null;
  sourceConfidenceScore: number | null;
  fragilitPenalty: number | null;
  hypeInflationPenalty: number | null;
  gseEdgeScore: number | null;
  // Decomposition
  baseProjection: number | null;
  roleAdjustment: number | null;
  gameEnvironmentAdjustment: number | null;
  healthAdjustment: number | null;
  marketAdjustment: number | null;
  ownershipAdjustment: number | null;
  narrativeAdjustment: number | null;
  // Provenance
  source: string;
  modelVersion: string | null;
  isModeled: boolean;
  isUserUploaded: boolean;
  isLicensed: boolean;
  isManualOverride: boolean;
  confidence: number | null;
}

export interface DfsNarrativeSignalInfo {
  id: string;
  playerName: string;
  team: string | null;
  signalType: DfsNarrativeSignalType;
  claim: string;
  evidence: string;
  counterEvidence: string | null;
  falsifiers: string[];
  impactType: DfsNarrativeImpactType;
  projectionDelta: number | null;
  ownershipDelta: number | null;
  hypeInflationDelta: number | null;
  confidence: number | null;
  freshness: string;
  sourceReliability: number | null;
}

export interface DfsLineupInfo {
  id: string;
  lineupNumber: number;
  salary: number;
  projection: number;
  floor: number | null;
  ceiling: number | null;
  totalOwnership: number | null;
  leverageScore: number | null;
  primaryStack: string | null;
  bringBack: string | null;
  correlationScore: number | null;
  duplicateRisk: number | null;
  contestFit: string | null;
  lineupThesis: string | null;
  whatBreaksThis: string | null;
  lateSwapNote: string | null;
  players: DfsLineupPlayerInfo[];
}

export interface DfsLineupPlayerInfo {
  id: string;
  name: string;
  position: string;
  team: string | null;
  salary: number | null;
  projection: number | null;
  floor: number | null;
  ceiling: number | null;
  ownership: number | null;
  leverage: number | null;
  slotOrder: number;
  isStack: boolean;
  isBringBack: boolean;
}

export interface DfsPortfolioSummary {
  lineupSetId: string;
  lineupCount: number;
  avgProjection: number | null;
  avgCeiling: number | null;
  avgOwnership: number | null;
  avgLeverage: number | null;
  portfolioThesis: string | null;
  portfolioCounterThesis: string | null;
  fragileAssumptions: string[];
  chalkConcentration: number | null;
  fragility: number | null;
  correlationScore: number | null;
  sourceConfidenceAvg: number | null;
  duplicationRiskScore: number | null;
}

export interface DfsOptimizerRunConfig {
  slateId: string;
  site: DfsSite;
  contestMode: DfsContestMode;
  lineupCount: number;
  maxExposure?: number;
  stackSettings?: Record<string, unknown>;
  lockedPlayers?: string[];
  excludedPlayers?: string[];
  rules?: Array<{ ruleType: string; parameters: Record<string, unknown> }>;
  objectiveWeights?: Record<string, number>;
  projectionSetId?: string;
}

export interface DfsSourceReliabilityInfo {
  sourceName: string;
  sourceType: DfsSourceType;
  reliabilityScore: number | null;
  historicalAccuracy: number | null;
  injuryAccuracy: number | null;
  correctionRate: number | null;
  allowedProductUsage: boolean;
}

export interface DfsAutopsyRecord {
  slateId: string;
  playerName: string | null;
  projectedPoints: number | null;
  actualPoints: number | null;
  projectionError: number | null;
  projectedOwnership: number | null;
  actualOwnership: number | null;
  autopsyCategory: DfsAutopsyCategory;
  narrativeValidated: boolean | null;
  sourceWasAccurate: boolean | null;
  stackWorked: boolean | null;
  lessonLearned: string | null;
}
