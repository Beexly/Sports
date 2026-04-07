// Model version — bump when scoring logic changes
export const MODEL_VERSION = "v1.0.0";

// Confidence thresholds
export const PREMIUM_CONFIDENCE_THRESHOLD = 70;
export const MIN_PUBLISH_CONFIDENCE = 50;

// Scoring weights
export const WEIGHTS = {
  // How much line movement toward a pick increases confidence
  LINE_MOVEMENT_WEIGHT: 0.4,
  // Max bonus from line movement (percentage points)
  LINE_MOVEMENT_MAX_BONUS: 15,
  // Minimum consensus pct to apply bonus
  CONSENSUS_MIN_PCT: 0.6,
  // Max bonus from bookmaker consensus
  CONSENSUS_MAX_BONUS: 20,
  // Max bonus from market depth (number of bookmakers)
  MARKET_DEPTH_IDEAL_COUNT: 10,
  MARKET_DEPTH_MAX_BONUS: 10,
} as const;

// Minimum bookmakers required to generate a pick
export const MIN_BOOKMAKERS = 2;
