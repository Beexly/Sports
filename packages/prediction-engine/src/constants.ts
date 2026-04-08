// Model version — bump when scoring logic changes
export const MODEL_VERSION = "v3.0.0";

// ============================================================
// Confidence thresholds
// ============================================================
export const PREMIUM_CONFIDENCE_THRESHOLD = 70;
export const MIN_PUBLISH_CONFIDENCE = 50;

// ============================================================
// Pick grade thresholds
// ============================================================
export const GRADE_THRESHOLDS = {
  ELITE_PLAY:  { confidence: 85, edge: 80 },
  STRONG_PLAY: { confidence: 75, edge: 65 },
  SOLID_PLAY:  { confidence: 65, edge: 50 },
  // Below these = LEAN
} as const;

// ============================================================
// Scoring component weights (sum to 100 max)
// ============================================================
export const WEIGHTS = {
  // Consensus — how aligned are bookmakers on the pick direction
  CONSENSUS_COMPONENT_MAX: 30,
  CONSENSUS_MIN_PCT: 0.55,          // minimum to apply bonus

  // Market depth — how many bookmakers quote this market
  MARKET_DEPTH_COMPONENT_MAX: 20,
  MARKET_DEPTH_IDEAL_BOOKS: 10,

  // Edge — net pricing advantage vs theoretical fair value
  EDGE_COMPONENT_MAX: 25,

  // Line movement — direction/magnitude since open
  // Capped at ±15 (positive if movement confirms pick, negative if fading)
  LINE_MOVEMENT_COMPONENT_MAX: 15,

  // Volatility penalty — thin market, injury flag, fast-moving line
  VOLATILITY_PENALTY_MAX: -15,
} as const;

// ============================================================
// Risk thresholds
// ============================================================
export const RISK_THRESHOLDS = {
  // Market depth below this = HIGH_VARIANCE
  HIGH_VARIANCE_BOOK_THRESHOLD: 3,
  // Consensus below this = HIGH_VARIANCE
  HIGH_VARIANCE_CONSENSUS_THRESHOLD: 0.58,
  // Consensus above this + depth above ideal = LOW_RISK
  LOW_RISK_CONSENSUS_THRESHOLD: 0.70,
  LOW_RISK_BOOK_THRESHOLD: 7,
} as const;

// Minimum bookmakers required to generate a pick
export const MIN_BOOKMAKERS = 2;
