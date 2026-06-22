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

export type IndependentEdgeDecision = "SPEAK" | "LEAN" | "PASS";
export type IndependentEdgeAgreement =
  | "CONFIRMS"
  | "SPLIT"
  | "SOLO"
  | "CONTRADICTS"
  | "NONE";

/**
 * The result of comparing INDEPENDENT fair-value estimators (e.g. the Kalshi
 * exchange, and — once team rates are ingested — the Poisson model) against the
 * sportsbook's own de-vigged fair value. This is the fix for "the engine grading
 * itself": real edge is the gap between an estimate the market has NOT absorbed
 * and the market price, refereed by a second independent market.
 *
 * `priced` is false in the current wire-in: the assessment is SURFACED in the
 * glass box (and persisted for CLV grading) but does NOT yet move the confidence
 * score. Letting it move confidence is a deliberate, founder-gated MODEL_VERSION
 * step. The honest default with no independent estimate is no `independentEdge`
 * at all — the scorer behaves exactly as before.
 */
export interface IndependentEdgeSummary {
  decision: IndependentEdgeDecision;
  agreement: IndependentEdgeAgreement;
  marketFairProb: number;       // sportsbook de-vigged fair prob for the side, 0–1
  trueProb: number | null;      // independent blended estimate, 0–1
  rawEdge: number;              // trueProb − marketFairProb
  shrunkEdge: number;           // rawEdge after evidence/agreement shrink
  expectedClv: number;          // honest expectation of beating the close, prob pts
  conviction: number;           // 0–100 glass-box conviction
  sources: string[];            // independent estimators used, e.g. ["kalshi"]
  priced: boolean;              // false = surfaced, not yet in the confidence math
  rationale: string;            // plain-language "why"
}

export interface FactorBreakdown {
  marketPriceShapeScore?: number; // 0-25: no-vig market shape; not independent EV
  trueEvScore?: number | null; // future: independent EV score once source-backed fair probability exists
  fairProbability?: number | null; // future: independent model probability, never inferred from market alone
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
  // Independent-edge layer — surfaced, not yet priced (see IndependentEdgeSummary)
  independentEdge?: IndependentEdgeSummary | null;
  factors: FactorDetail[];     // human-readable factor list
}

export interface FactorDetail {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
  weight: number; // contribution to confidence
  evidence?: FactorEvidenceMetadata;
}

export type EvidenceActivationStatus =
  | "ACTIVE"
  | "SHADOW_ONLY"
  | "BLOCKED_MISSING_SOURCE"
  | "BLOCKED_STALE"
  | "BLOCKED_LOW_TRUST"
  | "BLOCKED_SMALL_SAMPLE";

export interface FactorEvidenceMetadata {
  sourceCategory: SignalCategory;
  sourceName: string;
  fetchedAt?: Date | string | null;
  freshnessStatus: "FRESH" | "AGING" | "STALE" | "MISSING";
  sampleSize?: number | null;
  trustLevel: number;
  activationStatus: EvidenceActivationStatus;
  whyUsedOrBlocked: string;
}

// ============================================================
// Entitlements
// ============================================================

export interface Entitlements {
  tier: SubscriptionTier;
  canSeePremiumPicks: boolean;
  canSeeConfidence: boolean;
  canSeeLineMovement: boolean;
  canSeeFactorBreakdown: boolean;  // PRO+ only
  canSeeEdgeScore: boolean;         // public Edge Index
  canGetAlerts: boolean;
  dailyPickLimit: number | null;
  // ── Surface gates (server-enforced at the page/API level) ──
  canUseTrendLab: boolean;          // PRO+ — full cohort workbench
  canUseParlayMri: boolean;         // PRO+ — full parlay genome
  canUseClvLedger: boolean;         // ELITE — bet ledger + staking toolkit
}

export function getEntitlements(tier: SubscriptionTier): Entitlements {
  const isPro = tier === "PRO" || tier === "ELITE";
  return {
    tier,
    canSeePremiumPicks: isPro,
    canSeeConfidence: isPro,
    canSeeLineMovement: isPro,
    canSeeFactorBreakdown: isPro,
    canSeeEdgeScore: true,
    canGetAlerts: tier === "ELITE",
    dailyPickLimit: tier === "FREE" ? 2 : null,
    canUseTrendLab: isPro,
    canUseParlayMri: isPro,
    canUseClvLedger: tier === "ELITE",
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
  ELITE_PLAY:  { label: "Elite Play",  color: "text-plasma",     bgColor: "bg-plasma/10"     },
  STRONG_PLAY: { label: "Strong Play", color: "text-verify",     bgColor: "bg-verify/10"     },
  SOLID_PLAY:  { label: "Solid Play",  color: "text-ion-blue",   bgColor: "bg-ion-blue/10"   },
  LEAN:        { label: "Lean",        color: "text-gray-400",   bgColor: "bg-gray-700/40"   },
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, { label: string; color: string }> = {
  LOW_RISK:      { label: "Low Risk",         color: "text-verify"      },
  MODERATE:      { label: "Moderate Risk",    color: "text-plasma"      },
  HIGH_VARIANCE: { label: "High Variance",    color: "text-ultraviolet" },
  INJURY_RISK:   { label: "Injury Sensitive", color: "text-alert"       },
  LINE_STEAM:    { label: "Line Steam",       color: "text-ultraviolet" },
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
  shadowEvidence?: EvidenceRecord[];
  // Independent fair-value estimates that did NOT look at the sportsbook line
  // (e.g. the Kalshi exchange). Pre-fetched in the ingestion layer (Kalshi reads
  // are async I/O) so the PURE, synchronous scorer can run the edge engine
  // against them. Home/away perspective. Absent → scorer is unchanged.
  independentFairValues?: IndependentMarketFairValue[];
}

/**
 * A de-vigged fair-value snapshot for one game from a source independent of the
 * sportsbook (an exchange like Kalshi, or — later — the Poisson model). Probs are
 * P(team wins), 0–1; null where the source has no quote (thin/absent market).
 */
export interface IndependentMarketFairValue {
  source: string;                 // e.g. "kalshi"
  homeFairProb?: number | null;
  awayFairProb?: number | null;
  capturedAt?: string;            // ISO; the CLV "as-of" timestamp
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
  | "MARKET_SENTIMENT"
  | "PLAYER_AVAILABILITY"
  | "OFFICIALS"
  | "VENUE_ENVIRONMENT"
  | "TEAM_RATES"
  | "STANDINGS"
  | "DIVISION_CONTEXT"
  | "MILESTONES"
  | "PACE";

export type SourceSnapshotKind =
  | "ODDS_EVENTS"
  | "ODDS_SCORES"
  | "CONTEXT_FIXTURES"
  | "CONTEXT_TEAM_STATS"
  | "CONTEXT_PLAYER_AVAILABILITY"
  | "CONTEXT_OFFICIALS"
  | "CONTEXT_VENUE"
  | "CONTEXT_WEATHER"
  | "CONTEXT_STANDINGS"
  | "CONTEXT_MILESTONES";

// ============================================================
// Narrative signal types (Tier-B media / morale context)
// ============================================================
// Produced by ingestion (Reddit / RSS / news adapters), consumed by the
// prediction-engine narrative-signal analyzer. Internal SIGNAL only — a small,
// capped edge nudge, NEVER a cited public provenance source.

export type NarrativeTheme =
  | "contract_incentive"
  | "milestone_chase"
  | "motivation_positive"
  | "morale_negative"
  | "role_elevated"
  | "role_reduced";

export interface NarrativeTextItem {
  /** Tier-B source label — never cited publicly. e.g. "reddit:r/nfl", "rss:espn". */
  readonly source: string;
  readonly athleteId: string;
  /** Headline / title / snippet to scan. */
  readonly text: string;
  /** ISO timestamp; enables recency decay. */
  readonly publishedAt?: string;
  /** Source trust weight in [0,1]; default 1. */
  readonly weight?: number;
}

export interface ThemeHeat {
  readonly theme: NarrativeTheme;
  /** Recency- and trust-weighted hit mass for this theme. */
  readonly heat: number;
  /** Raw number of items that triggered it. */
  readonly hits: number;
}

export interface NarrativeSignal {
  readonly athleteId: string;
  /** Net performance direction in [-1, 1] (+ = tailwind, − = headwind). */
  readonly direction: number;
  /** Strength of the narrative in [0, 1] regardless of sign. */
  readonly intensity: number;
  /** Trust in the read in [0, 1] (volume + source diversity). */
  readonly confidence: number;
  /** Number of contributing (theme-matching) items. */
  readonly volume: number;
  /** Per-theme heat map — the "atmosphere", sorted by heat desc. */
  readonly themes: readonly ThemeHeat[];
}

export interface SignalSourceMetadata {
  sourceCategory: SignalCategory;
  sourceName: string;     // e.g. "schedule-internal", "openweather"
  fetchedAt: Date;
  trustLevel: number;     // 0.0–1.0
  isBootstrap: boolean;
}

export interface EvidenceRecord extends SignalSourceMetadata {
  signalKey: string;
  activationStatus: EvidenceActivationStatus;
  freshnessStatus: FactorEvidenceMetadata["freshnessStatus"];
  sampleSize?: number | null;
  whyUsedOrBlocked: string;
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
  isAuditAvailable: boolean;          // false for sample/demo rows with no SourceSnapshot chain
  generatedAt: string;
  dataFreshnessAt: string | null;
  result: PickResult;
}

// ============================================================
// Evidence Audit — forensic trail per pick
// ============================================================
//
// Server-side gated. The audit payload is the public, on-brand
// proof of provenance: every pick can be traced to the SourceSnapshot
// it was scored against, with payload hash, ingestion run timestamp,
// and which signal categories were present at prediction time.
//
// Tier shape:
//   FREE  → AuditPayloadSummary (counts + topology only, drives upgrade)
//   PRO+  → AuditPayloadDetailed (full signal flags, line movement,
//           confidence at prediction, every SourceSnapshot hash)
//
// This payload NEVER contains raw provider response data — only the
// SHA-256 hash, payload byte count, and metadata. Raw payloads stay
// in the database for operator forensics; the audit drawer surfaces
// the *fact* that the data exists and is hashed, not the data itself.

export interface AuditSourceSnapshotInfo {
  id: string;
  provider: string;       // e.g. "the-odds-api"
  sourceKind: string;     // SourceSnapshotKind enum value
  fetchedAt: string;      // ISO timestamp
  payloadHashPrefix: string;  // first 12 chars of SHA-256
  payloadBytes: number;
  ingestionRunId: string | null;
}

export interface AuditSignalCategoryRow {
  category: string;       // e.g. "Market", "Schedule", "Players", "Officials"
  status: "LIVE" | "SHADOW" | "ABSENT";
  // LIVE = signal was present AND contributed to scoring
  // SHADOW = signal was present but in shadow mode (visible, not priced)
  // ABSENT = signal was not present at prediction time
  description: string;    // short human-readable line
}

export interface AuditPayloadSummary {
  tier: "FREE";
  pickId: string;
  generatedAt: string;
  modelVersion: string;
  signalCategoryCount: number;       // total categories tracked
  signalCategoryActiveCount: number; // how many were LIVE
  sourceSnapshotCount: number;       // how many raw snapshots back this pick
  mostRecentSnapshotAt: string | null;
  mostRecentSnapshotProvider: string | null;
  upgradeRequiredForDetail: true;
}

// Pick Death Clock — market movement since publish, PRICE SPACE only
// (points / American prices). Never fair-prob, never EV, never a
// time-to-zero: those stay hard-gated on pick surfaces.
export interface AuditDeathClock {
  metric: "spread_points" | "total_points" | "moneyline_price";
  atPublish: number;       // median across books at/just before publish
  latest: number;          // median across the same books, latest capture
  delta: number;           // latest − atPublish, signed, market units
  direction: "toward_pick" | "away_from_pick" | "flat";
  minutesSincePublish: number;
  ratePerHour: number;     // |delta| per hour, market units
  booksUsed: number;
  latestCaptureAt: string; // ISO timestamp
}

export interface AuditPayloadDetailed {
  tier: "PRO" | "ELITE";
  pickId: string;
  generatedAt: string;
  modelVersion: string;
  isBootstrap: boolean;
  confidenceAtPrediction: number;
  dataQualityScore: number;
  bookmakerCount: number;
  lineMovementDelta: number | null;
  restAdvantageNet: number | null;
  atsFormSampleSize: number | null;
  h2hSampleSize: number | null;
  scheduleDensityHome: number | null;
  scheduleDensityAway: number | null;
  signalCategories: AuditSignalCategoryRow[];
  sourceSnapshots: AuditSourceSnapshotInfo[];
  /** Null when captured history can't honestly support a clock. */
  deathClock: AuditDeathClock | null;
  gatesAtPrediction: {
    canonicalHistory: boolean;
    derivedModelHistory: boolean;
    outcomeLearning: boolean;
  };
}

export type AuditPayload = AuditPayloadSummary | AuditPayloadDetailed;

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

export * from "./dfs";
