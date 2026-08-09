// Model version — bump when scoring logic changes.
// v5.2.2 (2026-08-09): Dixon–Coles soccer independent; Kalshi ESPN abbr aliases +
// ET wall-clock ticker fragments; 12h start skew on series match.
// v5.2.1 (2026-08-09): ranking uses trueProb whenever finite (incl. PASS),
// independentWeight 0.7; persist marketFairProb + rankingP; honest pIndependent
// load; Kalshi team maps; FPI exact match; selective consumes rankingP.
// Bake-off: polarity + coverage gates. Maps/AUTO_PUBLISH still OFF.
// v5.2.0 (2026-08-09): independent estimators priced into ranking path.
// v5.1.0 (2026-06-22): isotonic calibration activated (path-to-70.md §7).
export const MODEL_VERSION = "v5.2.2";

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

  // ── Intelligence Layer v4 additions ──────────────────────────

  // Head-to-head ATS form — picked team's record vs this specific opponent
  // Signal is small to avoid overfitting on low-sample matchup data
  HEAD_TO_HEAD_COMPONENT_MAX: 5,

  // Venue-specific ATS form — home team covering at home, away team covering away
  VENUE_FORM_COMPONENT_MAX: 5,

  // Uncertainty penalty — applied when key signals directly contradict each other
  // (e.g. strong public consensus but line is moving opposite = sharp fade)
  UNCERTAINTY_PENALTY_MAX: -8,

  // Cross-market consistency — bonus when spread and H2H ML agree on the same side
  CROSS_MARKET_AGREE_BONUS: 4,
  // Slight penalty when spread pick and ML market disagree
  CROSS_MARKET_DISAGREE_PENALTY: -3,

  // ── Schedule density (v5) ─────────────────────────────────────
  // Signal is intentionally small — schedule stress is a secondary fatigue proxy
  // that complements back-to-back detection. The model does not claim to know
  // how fatigue translates to ATS outcomes until calibrated.
  // Fires only when home/away game count diverges by 2+ in last 7 days.
  SCHEDULE_STRESS_COMPONENT_MAX: 5,
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
