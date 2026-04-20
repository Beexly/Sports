// ============================================================
// Shared Platform Types
// ============================================================

export type SubscriptionTier = "FREE" | "PRO" | "ELITE";

export type PickType = "SPREAD" | "MONEYLINE" | "TOTAL";
export type PickTier = "FREE" | "PREMIUM";
export type PickResult = "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";

// New precision types
export type PickGrade = "ELITE_PLAY" | "STRONG_PLAY" | "SOLID_PLAY" | "LEAN";
export type RiskLevel =
  | "LOW_RISK"
  | "MODERATE"
  | "HIGH_VARIANCE"
  | "INJURY_RISK"
  | "LINE_STEAM";

// ============================================================
// Factor Breakdown — structured scoring factors per pick
// ============================================================

export interface FactorBreakdown {
  consensusScore: number;      // 0–30: how aligned bookmakers are
  marketDepthScore: number;    // 0–20: how many bookmakers cover this
  edgeScore: number;           // 0–25: net pricing edge vs fair value
  lineMovementScore: number;   // ±15: movement direction/magnitude (enhanced with sharp proxy)
  volatilityPenalty: number;   // -15–0: thin/unstable markets
  // Extended intelligence layer (v4+)
  headToHeadScore?: number;    // ±5: H2H ATS record between these specific teams
  venueFormScore?: number;     // ±5: picked team's venue-specific ATS record
  uncertaintyPenalty?: number; // -8–0: conflicting signals reduce confidence
  crossMarketScore?: number;   // -3–+4: spread and ML markets agree/disagree
  // Schedule density (v5)
  scheduleStressScore?: number; // ±5: compressed schedule fatigue signal
  dataQualityScore?: number;   // 0–100: overall data trust score (always public)
  factors: FactorDetail[];     // human-readable factor list
}

export interface FactorDetail {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
  weight: number; // contribution to confidence
}

// ============================================================
// Entitlements
// ============================================================

export interface Entitlements {
  tier: SubscriptionTier;
  canSeePremiumPicks: boolean;
  canSeeConfidence: boolean;
  canSeeLineMovement: boolean;
  canSeeFactorBreakdown: boolean;  // NEW: PRO+ only
  canSeeEdgeScore: boolean;         // NEW: PRO+ only
  canGetAlerts: boolean;
  dailyPickLimit: number | null;
}

export function getEntitlements(tier: SubscriptionTier): Entitlements {
  const isPro = tier === "PRO" || tier === "ELITE";
  return {
    tier,
    canSeePremiumPicks: isPro,
    canSeeConfidence: isPro,
    canSeeLineMovement: isPro,
    canSeeFactorBreakdown: isPro,
    canSeeEdgeScore: isPro,
    canGetAlerts: tier === "ELITE",
    dailyPickLimit: tier === "FREE" ? 1 : null,
  };
}

// ============================================================
// Pick grade helpers
// ============================================================

export function computePickGrade(
  confidence: number,
  edgeScore: number
): PickGrade {
  if (confidence >= 85 && edgeScore >= 80) return "ELITE_PLAY";
  if (confidence >= 75 && edgeScore >= 65) return "STRONG_PLAY";
  if (confidence >= 65 && edgeScore >= 50) return "SOLID_PLAY";
  return "LEAN";
}

export const PICK_GRADE_LABELS: Record<PickGrade, { label: string; color: string; bgColor: string }> = {
  ELITE_PLAY:  { label: "Elite Play",  color: "text-yellow-300", bgColor: "bg-yellow-400/10" },
  STRONG_PLAY: { label: "Strong Play", color: "text-green-300",  bgColor: "bg-green-500/10"  },
  SOLID_PLAY:  { label: "Solid Play",  color: "text-blue-300",   bgColor: "bg-blue-500/10"   },
  LEAN:        { label: "Lean",        color: "text-gray-400",   bgColor: "bg-gray-700/40"   },
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, { label: string; color: string }> = {
  LOW_RISK:      { label: "Low Risk",         color: "text-green-400"  },
  MODERATE:      { label: "Moderate Risk",    color: "text-yellow-400" },
  HIGH_VARIANCE: { label: "High Variance",    color: "text-orange-400" },
  INJURY_RISK:   { label: "Injury Sensitive", color: "text-red-400"    },
  LINE_STEAM:    { label: "Line Steam",       color: "text-purple-400" },
};

// ============================================================
// The Odds API raw response types
// ============================================================

export interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsApiMarket {
  key: "h2h" | "spreads" | "totals";
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

export interface OddsApiScore {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

// ============================================================
// Normalized internal types
// ============================================================

export interface NormalizedGame {
  externalId: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
}

export interface NormalizedOdds {
  gameExternalId: string;
  bookmaker: string;
  market: "H2H" | "SPREADS" | "TOTALS";
  homePrice?: number;
  awayPrice?: number;
  drawPrice?: number;
  spread?: number;
  homeSpreadPrice?: number;
  awaySpreadPrice?: number;
  total?: number;
  overPrice?: number;
  underPrice?: number;
  fetchedAt: Date;
}

// ============================================================
// Prediction Engine input types
// ============================================================

// ============================================================
// Game context — optional historical/scheduling signals
// passed from ingestion layer into the prediction engine
// ============================================================

export interface AtsFormBucket {
  wins: number;
  losses: number;
  pushes: number;
  sampleSize: number;
}

export interface GameContextInput {
  openingSpread?: number | null;
  currentSpread?: number | null;
  openingTotal?: number | null;
  currentTotal?: number | null;
  restDaysHome?: number | null;
  restDaysAway?: number | null;
  isBackToBackHome?: boolean;
  isBackToBackAway?: boolean;
  // Overall ATS form (any venue)
  homeAtsForm?: AtsFormBucket | null;
  awayAtsForm?: AtsFormBucket | null;
  // Venue-specific ATS splits (v4)
  homeAtsFormAtHome?: AtsFormBucket | null;  // home team's record playing at home
  awayAtsFormAway?: AtsFormBucket | null;    // away team's record playing away
  // Head-to-head between these exact opponents (v4)
  headToHeadForm?: AtsFormBucket | null;     // picked team's H2H ATS vs this opponent
  // Cross-market validation (v4)
  mlFairProbHome?: number | null;            // H2H fair prob for home team (0–1)
  // Schedule density — games in last 7 days (v5)
  // Computed from TeamGameLog regardless of bootstrap state (physical reality, not ATS trend).
  // Null when no game history exists; scoring returns 0 (neutral) when null.
  scheduleDensityHome?: number | null;
  scheduleDensityAway?: number | null;
  // Data coverage
  bookmakerCoverageMax?: number;
  dataFreshnessMinutes?: number;
  hasSpreadMarket?: boolean;
  hasTotalMarket?: boolean;
  hasH2HMarket?: boolean;
}

// ============================================================
// Signal source types (v5)
// ============================================================

// Categories mirror the SignalCategory enum in Prisma schema.
// Keep in sync — TS type is the authoritative source.
export type SignalCategory =
  | "ODDS"
  | "SCHEDULE"
  | "WEATHER"
  | "INJURIES"
  | "RATINGS"
  | "MARKET_SENTIMENT";

export interface SignalSourceMetadata {
  sourceCategory: SignalCategory;
  sourceName: string;     // e.g. "schedule-internal", "openweather"
  fetchedAt: Date;
  trustLevel: number;     // 0.0–1.0
  isBootstrap: boolean;
}

export interface OddsInput {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  sport: string;
  bookmakerOdds: BookmakerOddsInput[];
  context?: GameContextInput;   // enriched when available
}

export interface BookmakerOddsInput {
  bookmaker: string;
  market: "H2H" | "SPREADS" | "TOTALS";
  homePrice?: number;
  awayPrice?: number;
  spread?: number;
  homeSpreadPrice?: number;
  awaySpreadPrice?: number;
  total?: number;
  overPrice?: number;
  underPrice?: number;
}

// ============================================================
// Upgraded ScoredPick — richer output from prediction engine
// ============================================================

export interface ScoredPick {
  gameId: string;
  pickType: PickType;
  selection: string;
  line: number;

  // Scoring
  confidence: number;      // 0–100
  edgeScore: number;       // 0–100
  consensusPct: number;    // 0.0–1.0
  bookmakerCount: number;
  dataQualityScore: number; // 0–100 data trust score (always public)

  // Classification
  tier: PickTier;
  pickGrade: PickGrade;
  riskLevel: RiskLevel;

  // Explainability
  reasoning: string;           // full explanation (premium)
  reasoningShort: string;      // 1-sentence teaser (free)
  factorBreakdown: FactorBreakdown;

  // Metadata
  modelVersion: string;
  dataFreshnessAt: Date;
}

// ============================================================
// API Response types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================
// Public Pick — server-side gated for client consumption
// ============================================================

export interface PublicPick {
  id: string;
  game: {
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    sport: string;
  };
  pickType: PickType;
  selection: string;
  line: number;

  // Gated by subscription
  confidence: number | null;         // null for FREE
  edgeScore: number | null;          // null for FREE
  factorBreakdown: FactorBreakdown | null; // null for FREE

  // Always visible — trust transparency
  dataQualityScore: number;          // 0–100: always public trust signal

  // Always visible
  tier: PickTier;
  pickGrade: PickGrade;
  riskLevel: RiskLevel;
  reasoning: string;                 // full (PRO) or short teaser (FREE)
  reasoningShort: string;

  isFeatured: boolean;
  generatedAt: string;
  dataFreshnessAt: string | null;
  result: PickResult;
}

// ============================================================
// Daily Slate Summary
// ============================================================

export interface DailySlate {
  date: string;
  totalGames: number;
  totalPicks: number;
  premiumPickCount: number;
  topEdgePick: PublicPick | null;    // highest edge score today
  lastUpdatedAt: string | null;
  sportBreakdown: Array<{ sport: string; pickCount: number }>;
  recentRecord: {
    wins: number;
    losses: number;
    pushes: number;
    period: string;  // e.g. "Last 7 days"
  } | null;
}

// ============================================================
// Content generation types
// ============================================================

export interface ContentGenerationInput {
  date: string;
  sport: string;
  picks: Array<{
    game: string;
    pickType: PickType;
    selection: string;
    line: number;
    confidence: number;
    reasoning: string;
  }>;
}

export interface GeneratedContent {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}

// ============================================================
// Blog post public type
// ============================================================

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  sport: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
}
