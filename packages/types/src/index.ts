// ============================================================
// Shared Platform Types
// ============================================================

export type SubscriptionTier = "FREE" | "FANTASY" | "PRO" | "ELITE";

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

export * from "./ladder.js";
export * from "./heartbeat.js";

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
 * When `priced` is true, independents drove the ranking path (rankingScore /
 * rankingP) used for generation sort and selective publish (MODEL_VERSION step).
 * When false, the assessment is SURFACED in the glass box only. The honest
 * default with no independent estimate is no `independentEdge` at all.
 */
export interface IndependentEdgeSummary {
  decision: IndependentEdgeDecision;
  agreement: IndependentEdgeAgreement;
  /** Sportsbook de-vigged fair for the side; null when no real book (never invent 0.5). */
  marketFairProb: number | null;
  trueProb: number | null;      // independent blended estimate, 0–1
  rawEdge: number;              // trueProb − marketFairProb (or vs 0.5 when market null)
  shrunkEdge: number;           // rawEdge after evidence/agreement shrink
  expectedClv: number;          // honest expectation of beating the close, prob pts
  conviction: number;           // 0–100 glass-box conviction
  sources: string[];            // independent estimators used, e.g. ["kalshi"]
  priced: boolean;              // true = drove ranking path (finite trueProb, incl. PASS)
  rationale: string;            // plain-language "why"
  /**
   * Quote quality of each contributing source that is a QUOTED MARKET, for the
   * side this summary is about. Omitted when no contributing source is a quoted
   * market (a pure model blend — Elo/Poisson/FPI have no bid/ask).
   *
   * Why it is here: agreement drives a confidence multiplier (SOLO vs CONFIRMS),
   * so a thin, wide-spread quote that happens to agree can promote a pick on
   * noise. These are MEASURED values carried from ingestion, never derived; they
   * do not change any score today. Because FactorBreakdown is persisted to the
   * `factorBreakdown` Json column, they make that question answerable AFTER the
   * fact instead of being destroyed at ingestion.
   */
  sourceQuotes?: IndependentSourceQuote[];
}

/**
 * Measured quote quality for one independent source, on one side of one game.
 * Every field is a value the ingestion layer already computed — nothing here is
 * derived, smoothed, or defaulted. Null means "this source does not publish it",
 * not "assume it is fine".
 */
export interface IndependentSourceQuote {
  /** Matches the estimator's `source` tag, e.g. "kalshi". */
  source: string;
  /** Two-way bid/ask spread on this side's leg, in probability units (0–1). */
  spread?: number | null;
  /** Sum of the source's raw implied probabilities BEFORE de-vig (1.0 = balanced). */
  overround?: number | null;
  /** How the two-way quote was formed, e.g. "yes_bid_ask". Provenance only. */
  quoteSource?: string | null;
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
  // Independent-edge layer — may be priced into ranking when trueProb finite (see priced)
  independentEdge?: IndependentEdgeSummary | null;
  /**
   * Ranking win probability used for sort / selective / bake-off (0–1).
   * Always a probability — never edge/rawEdge/edgeScore.
   * Finite trueProb → trueProb or blend; else confidence/100.
   */
  rankingP?: number | null;
  /** How rankingP was derived: confidence | independent_trueProb | blend_indep_conf */
  rankingSource?: "confidence" | "independent_trueProb" | "blend_indep_conf" | null;
  /** De-vig sportsbook fair for the chosen side (0–1) — selective edge filter / market bake-off. */
  marketFairProb?: number | null;
  /**
   * Which de-vig method produced `marketFairProb`. Proportional (multiplicative)
   * is what every scoring path uses today; naming it stops the card presenting a
   * method-dependent estimate as if it were the market's one true price.
   */
  marketFairMethod?: "proportional" | null;
  /**
   * The same market and side re-de-vigged with Shin's method. Shin models
   * insider money and corrects the favourite–longshot bias proportional leaves
   * in, so the two disagree most on lopsided books — at −2000/+1100 the
   * underdog's fair moves ~1.5pt, wider than most edges we would ever claim.
   * Null when the book is degenerate. Display only: no scoring path reads this.
   */
  marketFairShinProb?: number | null;
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
  // ── Fantasy suite gates — FANTASY tier ($49/yr) + PRO/ELITE; FREE = depth-limited trial ──
  canUseFantasyDraftSuite: boolean; // draft + best-ball kit
  canUseFantasyFull: boolean;       // the full fantasy suite
  // ── Honesty surfaces (the differentiator, deliberately split free/paid) ──
  //
  // The split is chosen so FREE keeps the part that BUILDS trust and pays for
  // the part that USES it. Everyone — logged out included — can see THAT we
  // refused a bet; that refusal is the product's whole credibility claim, and
  // hiding it would be self-defeating. What unlocks is the quantitative detail
  // behind the refusal: how wide the calibrated interval was, which estimator
  // produced it, and the recomputable ledger record.
  //
  // Deliberately NOT gated: the existence of a No-Bet, and `canSeeEdgeScore`
  // above. Gating those would turn the pitch into "more picks" — the exact
  // positioning this product exists to reject.
  canSeeMultiprob: boolean;      // PRO+ — interval bounds + width on a decision
  canSeeNoBetDetail: boolean;    // PRO+ — WHY a No-Bet fired, not just that it did
  canSeeGlassLedger: boolean;    // PRO+ — the recomputable per-decision ledger
  canSeeRecompute: boolean;      // PRO+ — verifier naming + recompute instructions
}

export function getEntitlements(tier: SubscriptionTier): Entitlements {
  const isPro = tier === "PRO" || tier === "ELITE";
  const isPaid = tier !== "FREE"; // FANTASY, PRO, or ELITE — the paid fantasy line
  return {
    tier,
    // Thread 1 REVERSED (docs/strategy/ENTITLEMENT_REMAP_SPEC.md): the picks are
    // the paid product again. Ahead of football season the top of funnel is won
    // on content + engagement, not by giving picks away at the moment demand
    // peaks. FREE gets a small daily TEASER (a couple of picks, no confidence
    // number); the paid betting line — full board, confidence, depth, tools,
    // alerts — unlocks with PRO/ELITE. FANTASY is a separate product line (the
    // fantasy suite), not the betting picks.
    canSeePremiumPicks: isPro,
    canSeeConfidence: isPro,
    canSeeLineMovement: isPro,
    canSeeFactorBreakdown: isPro,
    // Edge Index stays public on every pick — the free trust/transparency signal
    // that makes the teaser credible and pulls visitors toward the paid board.
    canSeeEdgeScore: true,
    canGetAlerts: tier === "ELITE",
    // FREE + FANTASY see a small betting-picks teaser; PRO/ELITE get the full board.
    dailyPickLimit: isPro ? null : 2,
    canUseTrendLab: isPro,
    canUseParlayMri: isPro,
    canUseClvLedger: tier === "ELITE",
    // Fantasy suite — the FANTASY tier unlocks it; PRO/ELITE include it. FREE's
    // trial is depth-limited at the page/API level, never a flag flip.
    canUseFantasyDraftSuite: isPaid,
    canUseFantasyFull: isPaid,
    // Honesty surfaces track the betting line (PRO/ELITE), not the fantasy
    // line: they describe the betting decision process, so FANTASY — a
    // separate product — does not get them, exactly as it does not get
    // canSeeConfidence or canUseTrendLab.
    canSeeMultiprob: isPro,
    canSeeNoBetDetail: isPro,
    canSeeGlassLedger: isPro,
    canSeeRecompute: isPro,
  };
}

// ============================================================
// Pick grade helpers
// ============================================================

/**
 * THE pick-grade ladder. One definition, consulted by `computePickGrade` below.
 *
 * Both axes must clear for a rung to be awarded:
 *  - `confidence` — the engine's 0–100 composite score.
 *  - `edge`       — the published **Edge Index** (`ScoredPick.edgeScore`), where
 *                   50 is fair value, NOT a raw probability edge and NOT a
 *                   0–100 scale with 50 as its midpoint.
 *
 * These numbers used to exist twice: as bare literals inside `computePickGrade`
 * and as `GRADE_THRESHOLDS` in `@sports/prediction-engine`'s `constants.ts`,
 * which no caller read. Two sources of truth, one of them inert — editing the
 * named constant changed nothing. `constants.ts` now re-exports this object, so
 * the ladder lives in exactly one place and every grade provably reads it.
 */
export const GRADE_THRESHOLDS = {
  ELITE_PLAY:  { confidence: 85, edge: 80 },
  STRONG_PLAY: { confidence: 75, edge: 65 },
  SOLID_PLAY:  { confidence: 65, edge: 50 },
  // Below these = LEAN
} as const;

export function computePickGrade(
  confidence: number,
  edgeScore: number
): PickGrade {
  const t = GRADE_THRESHOLDS;
  if (confidence >= t.ELITE_PLAY.confidence && edgeScore >= t.ELITE_PLAY.edge) return "ELITE_PLAY";
  if (confidence >= t.STRONG_PLAY.confidence && edgeScore >= t.STRONG_PLAY.edge) return "STRONG_PLAY";
  if (confidence >= t.SOLID_PLAY.confidence && edgeScore >= t.SOLID_PLAY.edge) return "SOLID_PLAY";
  return "LEAN";
}

/**
 * The highest Edge Index an internally consistent two-way market can produce.
 *
 * Derivation (every step traceable to `@sports/prediction-engine`'s `scoring.ts`):
 *
 *   EdgeIndex   = clamp(round((edgeComponentScore / EDGE_COMPONENT_MAX) * 100), 0, 100)
 *   edgeComponentScore = clamp((rawEdge + 0.05) / 0.10, 0, 1) * EDGE_COMPONENT_MAX
 *   ⇒ EdgeIndex = clamp(round(50 + 1000 * rawEdge), 0, 100)
 *
 *   rawEdge = pickedSideFairProb − offeredProb, where `pickedSideFairProb` is
 *   the PROPORTIONAL de-vig p/S of the same books' mean implied probability p
 *   and `offeredProb` is that same side's WITH-vig implied probability. For an
 *   overround S ≥ 1 (every honest two-way market charges vig):
 *
 *       rawEdge = p/S − p = −p·(S−1)/S  ≤  0
 *
 * So the Edge Index is capped at 50 on an honest market: 50 is an unreachable
 * ceiling, not a midpoint. (Integer rounding inside `impliedProbabilityToAmerican`
 * can wobble the observed value to 51; that is rounding noise, not edge.)
 *
 * This constant is a DERIVED FACT about the current Edge Index definition. It is
 * not a tunable. Rescaling the Edge Index is an owner decision — see the Edge
 * Index invariant work — and this number moves only if that formula moves.
 */
export const HONEST_MARKET_EDGE_INDEX_MAX = 50;

/** Minimum confidence a STRONG_PLAY needs before Featured promotion. */
export const FEATURED_STRONG_PLAY_MIN_CONFIDENCE = 80;

/**
 * Does this pick qualify for Featured promotion on grade/edge grounds?
 *
 * The operator gate (`ReadinessGates.canPromoteFeaturedPicks`) is a SEPARATE,
 * caller-side condition; this function only answers the pick-quality half.
 *
 * ⚠️ READ THIS BEFORE "FIXING" A FEATURED BOARD THAT NEVER FILLS.
 *
 * The grade clause requires ELITE_PLAY or STRONG_PLAY, and both of those rungs
 * require an Edge Index of 65 or 80 — above `HONEST_MARKET_EDGE_INDEX_MAX`.
 * On a correctly priced market the engine cannot produce either grade, so this
 * predicate is currently unsatisfiable by design rather than by accident, and
 * `grade-ladder-reachability.test.ts` asserts exactly that against the real
 * scorer. It is NOT a bug to be patched by loosening a number here: whether the
 * ladder gets re-based against the real Edge Index scale (making these rungs
 * reachable again) or the top rungs are retired is an owner decision.
 *
 * The `edgeScore` clause is a guard, not a threshold: an Edge Index above the
 * honest ceiling means the pick's edge came from an inconsistently priced or
 * mis-averaged market, so its "elite" grade is an artefact of bad pricing.
 * Featuring is the loudest claim the product makes about a pick; it must never
 * be spent on the one pick whose price arithmetic is provably broken.
 */
export function isFeaturedPromotionEligible(pick: {
  readonly pickGrade: PickGrade;
  readonly confidence: number;
  readonly edgeScore: number;
}): boolean {
  const gradeQualifies =
    pick.pickGrade === "ELITE_PLAY" ||
    (pick.pickGrade === "STRONG_PLAY" &&
      pick.confidence >= FEATURED_STRONG_PLAY_MIN_CONFIDENCE);
  if (!gradeQualifies) return false;
  return Number.isFinite(pick.edgeScore) && pick.edgeScore <= HONEST_MARKET_EDGE_INDEX_MAX;
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
  /**
   * UPSTREAM market timestamp — NEVER the local clock.
   *
   * Optional because free-path adapters (ESPN public JSON, TheRundown v1 blobs)
   * expose no per-market update time. Those adapters MUST omit this field rather
   * than substitute `new Date()`: a locally-stamped timestamp is always "fresh"
   * by construction, which defeats the anti-tautology freshness gate in
   * `DataNormalizer.freshGameIds` and can resurrect a days-stale primary book as
   * a fresh 2-book consensus. `undefined` correctly reads as
   * not-provably-fresh (fail-safe).
   */
  last_update?: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  /**
   * Optional in practice: real payloads have arrived without the
   * bookmaker-level timestamp. Consumers must fall back to the market-level
   * `last_update` (also upstream truth) before treating a row as unparseable.
   *
   * UPSTREAM truth only — never the local clock (see `OddsApiMarket.last_update`).
   */
  last_update?: string;
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
  /** When WE fetched this snapshot (our clock). */
  fetchedAt: Date;
  /** The bookmaker's OWN last-update time (upstream). The real freshness signal —
   *  proves whether the odds actually changed recently, not just when we polled. */
  bookmakerLastUpdate: Date;
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
  /**
   * Quote quality MEASURED at ingestion, carried through instead of discarded.
   * Absent for model estimators (Elo/Poisson/FPI have no bid/ask). Present for a
   * quoted market so a thin, wide-spread quote stays distinguishable from a deep
   * one after the bridge — the two are otherwise identical here, and agreement
   * between sources drives a confidence multiplier. Never fabricated: a field is
   * null when the source does not publish it.
   */
  quote?: IndependentFairValueQuote | null;
}

/**
 * Per-side quote quality for one independent market fair value. Pure carriage of
 * values the ingestion layer already computed — no derivation, no defaults.
 */
export interface IndependentFairValueQuote {
  /** Two-way bid/ask spread on the HOME leg, probability units; null if unquoted. */
  homeSpread?: number | null;
  /** Two-way bid/ask spread on the AWAY leg, probability units; null if unquoted. */
  awaySpread?: number | null;
  /** Sum of the two raw implied probabilities BEFORE de-vig (1.0 = balanced book). */
  overround?: number | null;
  /** How the home leg's two-way quote was formed, e.g. "yes_bid_ask". */
  homeQuoteSource?: string | null;
  /** How the away leg's two-way quote was formed, e.g. "yes_bid_no_bid_complement". */
  awayQuoteSource?: string | null;
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
  confidence: number;      // 0–100 (heuristic UX; market-echo components)
  /**
   * Ranking score 0–100 for generation sort + selective path.
   * Equals confidence when independents absent; when trueProb finite (incl. PASS),
   * derived from independent trueProb (blend). Prefer this over confidence for ranking.
   */
  rankingScore?: number;
  edgeScore: number;       // 0–100
  consensusPct: number;    // 0.0–1.0
  /**
   * De-vigged MARKET fair probability for the chosen side (0–1). Market-derived
   * (consensus minus vig) — NOT a model probability, and distinct from the reserved
   * factorBreakdown.fairProbability slot. The honest anchor a proof receipt commits.
   */
  marketFairProb?: number | null;
  /** Average American price of the chosen side at scoring time — the receipt's entry odds. */
  entryPrice?: number | null;
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
  /**
   * Opening -> current line movement for SPREAD/TOTAL picks, from the game's
   * first-ingestion opening line. Gated by canSeeLineMovement (Pro+): the API
   * returns null for viewers without the entitlement, and for MONEYLINE picks
   * or games with no captured opening line.
   */
  lineMovement?: { opening: number; current: number } | null;

  // Gated by subscription
  confidence: number | null;         // null for FREE
  // Honest, calibrated display of `confidence`. Populated ONLY when the audited
  // calibrator is active (canApplyCalibrationAdjustments) and confidence is
  // visible; null otherwise. When present, surfaces should show this calibrated
  // label/probability instead of the raw heuristic % (Thread 2 — honest first).
  confidenceCalibrated?: { pct: number; label: string } | null;
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
  /**
   * SHA-256 content hash of the pick's tamper-evident pre-kickoff receipt.
   * Always public (a hash reveals nothing; publishing it early is how
   * commitments work) — paste it at /verify to check integrity. Null for
   * sample rows or picks minted before the receipt spine existed.
   */
  receiptHash?: string | null;
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
