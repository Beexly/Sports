/**
 * Wire contracts — the client's mirror of the server's response shapes.
 *
 * SOURCE OF TRUTH: `packages/types/src/index.ts` in Beexly/Sports. Every shape
 * below is transcribed from that file, plus the route handlers named against
 * each endpoint in `endpoints.ts`.
 *
 * DRIFT POLICY. This is a mirror, and mirrors drift. Three rules keep it honest:
 *
 *   1. Every field the client actually reads is listed, with the server's own
 *      comment preserved where the semantics are load-bearing.
 *   2. Fields the server may OMIT are optional (`?`) here, and the client treats
 *      absence as absence — never as a default. This matters most for
 *      `confidence`, which is `null` (not `0`) for FREE viewers, and for
 *      `winProbability`, which is omitted entirely when a scope rule fails.
 *      Coercing either to a number is a trust breach, not a rendering bug.
 *   3. Anything the server adds later is ignored, not rejected: the decoders
 *      below validate the fields they need and pass through the rest.
 *
 * `decoders.ts` is the runtime half of this file. Types alone cannot protect a
 * native client from a server that returns a 503 gate body with HTTP 200, or a
 * `factorBreakdown` that arrives as a JSON string because Prisma stored it that
 * way (it does — `parseFactorBreakdown` exists on the server for exactly this).
 */

/* ── Enums ──────────────────────────────────────────────────────────────── */

export type SubscriptionTier = "FREE" | "FANTASY" | "PRO" | "ELITE";
export type PickType = "SPREAD" | "MONEYLINE" | "TOTAL";
export type PickTier = "FREE" | "PREMIUM";
export type PickResult = "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";
export type PickGrade = "ELITE_PLAY" | "STRONG_PLAY" | "SOLID_PLAY" | "LEAN";
export type RiskLevel =
  | "LOW_RISK"
  | "MODERATE"
  | "HIGH_VARIANCE"
  | "INJURY_RISK"
  | "LINE_STEAM";
export type IndependentEdgeDecision = "SPEAK" | "LEAN" | "PASS";
export type IndependentEdgeAgreement = "CONFIRMS" | "SPLIT" | "CONTRADICTS";
export type EvidenceActivationStatus =
  | "ACTIVE"
  | "SHADOW_ONLY"
  | "BLOCKED_MISSING_SOURCE"
  | "BLOCKED_STALE"
  | "BLOCKED_LOW_TRUST"
  | "BLOCKED_SMALL_SAMPLE";
export type FreshnessStatus = "FRESH" | "AGING" | "STALE" | "MISSING";

/* ── Factor breakdown ───────────────────────────────────────────────────── */

export interface IndependentEdgeSummary {
  decision: IndependentEdgeDecision;
  agreement: IndependentEdgeAgreement;
  /** Sportsbook de-vigged fair for the side; null when no real book (never invent 0.5). */
  marketFairProb: number | null;
  trueProb: number | null;
  rawEdge: number;
  shrunkEdge: number;
  /** Honest expectation of beating the close, in probability points. */
  expectedClv: number;
  /** 0–100 glass-box conviction. */
  conviction: number;
  sources: string[];
  priced: boolean;
  rationale: string;
}

export interface FactorEvidenceMetadata {
  sourceCategory: string;
  sourceName: string;
  fetchedAt?: string | null;
  freshnessStatus: FreshnessStatus;
  sampleSize?: number | null;
  trustLevel: number;
  activationStatus: EvidenceActivationStatus;
  whyUsedOrBlocked: string;
}

export interface FactorDetail {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
  weight: number;
  evidence?: FactorEvidenceMetadata;
}

export interface FactorBreakdown {
  marketPriceShapeScore?: number;
  trueEvScore?: number | null;
  fairProbability?: number | null;
  consensusScore: number;
  marketDepthScore: number;
  edgeScore: number;
  lineMovementScore: number;
  volatilityPenalty: number;
  headToHeadScore?: number;
  venueFormScore?: number;
  uncertaintyPenalty?: number;
  crossMarketScore?: number;
  scheduleStressScore?: number;
  dataQualityScore?: number;
  independentEdge?: IndependentEdgeSummary | null;
  rankingP?: number | null;
  rankingSource?: "confidence" | "independent_trueProb" | "blend_indep_conf" | null;
  marketFairProb?: number | null;
  marketFairMethod?: "proportional" | null;
  marketFairShinProb?: number | null;
  factors: FactorDetail[];
}

/* ── Public pick ────────────────────────────────────────────────────────── */

export interface PickGame {
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  sport: string;
}

export interface WinProbability {
  value: number;
  /**
   * Only "market_devig" is emitted today. "independent_estimate" is reserved
   * and must never be rendered as though it were live.
   */
  basis: "market_devig" | "independent_estimate";
  books: number;
  method: "proportional";
}

export interface PublicPick {
  id: string;
  game: PickGame;
  pickType: PickType;
  selection: string;
  line: number;
  lineMovement?: { opening: number; current: number } | null;
  hasBookPrice?: boolean;
  /** @deprecated Phase 1 shape. Read `winProbability`. */
  marketImplied?: { prob: number; bookmakerCount: number } | null;
  winProbability?: WinProbability | null;

  /** null for FREE. NEVER coerce to 0. */
  confidence: number | null;
  confidenceCalibrated?: { pct: number; label: string } | null;
  edgeScore: number | null;
  factorBreakdown: FactorBreakdown | null;

  /** 0–100. Always public — the free trust signal. */
  dataQualityScore: number;

  tier: PickTier;
  pickGrade: PickGrade;
  riskLevel: RiskLevel;
  reasoning: string;
  reasoningShort: string;
  isFeatured: boolean;
  isAuditAvailable: boolean;
  generatedAt: string;
  dataFreshnessAt: string | null;
  result: PickResult;
  receiptHash?: string | null;
}

/* ── Board state ────────────────────────────────────────────────────────── */
/**
 * `/api/board/state` returns `{ success: true, data, meta }` where `data` is
 * `loadBoardState()`'s `BoardStateData`. The route applies the tier gate
 * server-side and calls `redactBoardConfidence` when the viewer lacks
 * `canSeeConfidence`, so per-row `confidence` may be null for FREE viewers.
 *
 * NOTE the naming: rows live under `data.scoringNow` / `data.publishedToday` /
 * `data.gatedTodayRows`, and these are BOARD rows (id, matchup, market, status,
 * edgeIndex) — not full picks. The full pick objects come from `/api/picks`.
 * Conflating the two is the easy mistake here, so the types are kept strictly
 * separate and the field names are transcribed verbatim.
 */
export type BoardLane = "SCORING" | "PUBLISHED" | "GATED";

export interface BoardStateRow {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  market: string;
  status: BoardLane;
  /** Public on every tier — "the free trust/transparency signal". */
  edgeIndex: number | null;
  /** null for viewers without canSeeConfidence. NEVER coerce to 0. */
  confidence: number | null;
  rankingP: number | null;
  rankingSource: string | null;
  /** Why a GATED row is held. This is the product, not a gap. */
  gateReason: string | null;
  updatedAt: string;
}

export interface BoardStateData {
  sportsWatched: number;
  /** Zero here is a real, visible condition — production has shown it. */
  booksPolled: number;
  openPicks: number;
  gatedToday: number;
  lastRefresh: string;
  modelVersion: string;
  /** True while the board is bootstrapping rather than empty. */
  bootstrap: boolean;
  scoringNow: BoardStateRow[];
  publishedToday: BoardStateRow[];
  gatedTodayRows: BoardStateRow[];
}

export type DegradationCharacter = string;

export interface BoardStateMeta {
  isSampleData: boolean;
  suppressedDemoData?: boolean;
  dataError?: "DB_UNREACHABLE";
  traceId: string;
  degradations: readonly unknown[];
  health: unknown;
  /** Honest-empty classifier — "refuse-default public fire claim". */
  boardClass: unknown;
  degradationCharacter: DegradationCharacter;
}

export interface BoardState {
  data: BoardStateData;
  meta: BoardStateMeta;
}

/* ── Calibration ────────────────────────────────────────────────────────── */

export interface CalibrationBucket {
  /** Lower bound of the confidence band, inclusive. */
  lower: number;
  /** Upper bound, inclusive. */
  upper: number;
  n: number;
  /** Mean stated probability in the band (0..1). */
  predicted: number;
  /** Realized win rate in the band (0..1). */
  observed: number;
}

export interface CalibrationPayload {
  buckets: CalibrationBucket[];
  /** Brier score of the stated probabilities. Lower is better. */
  brier?: number | null;
  /** Brier score of a constant 0.5 forecast — the honest baseline. */
  brierBaseline?: number | null;
  sampleSize: number;
  /** The gate below which no curve renders. Server-side constant is 30. */
  minimumSampleSize?: number | null;
  /** "monotone" | "overconfident" | "inverted" | "insufficient" */
  verdict?: string | null;
  modelVersion?: string | null;
  asOf?: string | null;
}

/* ── Performance ────────────────────────────────────────────────────────── */

export interface PerformancePayload {
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  voids: number;
  /** Realized win rate on decided picks (pushes/voids excluded). */
  winRate?: number | null;
  brier?: number | null;
  bySport?: { sport: string; settled: number; winRate: number | null }[];
  byType?: { pickType: PickType; settled: number; winRate: number | null }[];
  asOf?: string | null;
  modelVersion?: string | null;
}

/* ── Brief ──────────────────────────────────────────────────────────────── */

export interface BriefPayload {
  headline: string;
  body: string[];
  asOf: string;
  /** Present when the brief is gated off. The app renders the honest state. */
  gated?: boolean;
  gateReason?: string | null;
}

/* ── Gate envelopes ─────────────────────────────────────────────────────── */
/**
 * The server's deliberately-distinct gate bodies. `bootstrapGateResponse`
 * emits these for a readiness flag that is off, and `staleDataGateResponse`
 * emits a DIFFERENT one for "awaiting fresh data". The distinction exists so
 * operators can tell an env regression from a data outage — and so the app can
 * say the right sentence to a customer instead of "something went wrong".
 */
export interface GateResponse {
  success: false;
  error: string;
  code?:
    | "rate_limited"
    | "rate_limit_store_unavailable"
    | "bootstrap"
    | "stale_data"
    | "unauthenticated"
    | string;
  /** Present on bootstrap gates. */
  gate?: string;
  /** Present on stale-data gates. */
  reason?: string;
  data?: unknown;
}

/* ── Envelope ───────────────────────────────────────────────────────────── */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  /** Server `asOf` when the payload carries one; null otherwise. */
  asOf: string | null;
  /** True when the body came from the offline cache instead of the network. */
  fromCache: boolean;
  /** Age of a cached body in ms; 0 for a fresh network response. */
  cacheAgeMs: number;
  status: number;
}

export interface ApiFailure {
  ok: false;
  kind:
    | "network"
    | "timeout"
    | "rate_limited"
    | "gated"
    | "stale"
    | "auth"
    | "not_found"
    | "server"
    | "malformed";
  /** Customer-facing sentence. Already voice-checked. */
  message: string;
  /** Operator-facing detail. Never rendered to a customer. */
  detail: string;
  status: number | null;
  retryAfterSec: number | null;
  /** Wall-clock ms until a retry is worth attempting, if ever. */
  retryable: boolean;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
