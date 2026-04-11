/**
 * Platform Trust Configuration
 *
 * Gates which system behaviors are active based on operational maturity.
 * Every gate defaults to the SAFEST option — explicit opt-in required for each.
 *
 * Bootstrap progression:
 *   Phase 0 (default): ingest + score + internal admin only, no public surface
 *   Phase 1: enable PUBLIC_PICKS_ENABLED for limited beta access
 *   Phase 2: enable CANONICAL_HISTORY_ENABLED after verifying spread accuracy
 *   Phase 3: enable DERIVED_MODEL_HISTORY_ENABLED after 50+ canonical games/sport
 *   Phase 4: enable CONFIDENCE_DISPLAY_MODE=precision after calibration verified
 *   Phase 5: enable FEATURED_PICK_PROMOTION_ENABLED + PERFORMANCE_STATS_ENABLED
 *   Phase 6: enable PUBLIC_BLOG_ENABLED
 *
 * See .env.example for environment variable documentation.
 */

export type ConfidenceDisplayMode = "precision" | "labels" | "internal";

export interface PlatformConfig {
  /**
   * CANONICAL_HISTORY_ENABLED
   * When false: TeamGameLog entries and picks are written with isBootstrap=true.
   * They are stored for admin review and settlement, but not treated as canonical
   * truth. ATS/H2H scoring is gated separately by DERIVED_MODEL_HISTORY_ENABLED.
   * Enable only after verifying ingestion quality and opening-line accuracy.
   * Default: false
   */
  canonicalHistoryEnabled: boolean;

  /**
   * DERIVED_MODEL_HISTORY_ENABLED
   * When false: ATS form, H2H form, and venue splits are excluded from scoring.
   * Scoring uses only: consensus, edge, market depth, line movement, rest, volatility.
   * When true: only NON-bootstrap (canonical) TeamGameLog entries feed scoring.
   * Enable only after CANONICAL_HISTORY_ENABLED=true and 50+ settled games/sport.
   * Default: false
   */
  derivedModelHistoryEnabled: boolean;

  /**
   * PUBLIC_PICKS_ENABLED
   * When false: /api/picks and /api/picks/daily-slate return 503.
   * Picks are still generated and stored for internal admin review.
   * Default: false
   */
  publicPicksEnabled: boolean;

  /**
   * PUBLIC_BLOG_ENABLED
   * When false: content-publishing worker skips generation entirely.
   * Default: false
   */
  publicBlogEnabled: boolean;

  /**
   * PERFORMANCE_STATS_ENABLED
   * When false: /api/performance returns 503. Prevents exposing bootstrap-era
   * win rates that are not representative of production performance.
   * Default: false
   */
  performanceStatsEnabled: boolean;

  /**
   * CONFIDENCE_DISPLAY_MODE
   * "precision":  raw integers (73) shown to PRO+ users — use after calibration
   * "labels":     LOW / MEDIUM / HIGH for all users, no raw numbers
   * "internal":   raw integers for ADMIN users, labels for all others
   * Default: "labels"
   */
  confidenceDisplayMode: ConfidenceDisplayMode;

  /**
   * FEATURED_PICK_PROMOTION_ENABLED
   * When false: isFeatured is always false on new picks.
   * Featured picks drive prominent UI placement — only enable after grade
   * thresholds are calibrated against real historical win-rate data.
   * Default: false
   */
  featuredPickPromotionEnabled: boolean;

  /**
   * MIN_DATA_QUALITY_FOR_GAME_LOG
   * Minimum dataQualityScore for a game's TeamGameLog entry to be written.
   * Games with coverage below this threshold have unreliable spread data,
   * making ATS tracking inaccurate even with real scores.
   * Default: 40 (requires meaningful bookmaker coverage)
   */
  minDataQualityForGameLog: number;
}

function parseBool(val: string | undefined, defaultVal: boolean): boolean {
  if (val === undefined || val === "") return defaultVal;
  return val.toLowerCase() === "true" || val === "1";
}

function parseConfidenceMode(val: string | undefined): ConfidenceDisplayMode {
  if (val === "precision" || val === "labels" || val === "internal") return val;
  return "labels";
}

function parseIntSafe(val: string | undefined, defaultVal: number): number {
  if (val === undefined || val === "") return defaultVal;
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

export function getPlatformConfig(): PlatformConfig {
  return {
    canonicalHistoryEnabled:      parseBool(process.env["CANONICAL_HISTORY_ENABLED"],      false),
    derivedModelHistoryEnabled:   parseBool(process.env["DERIVED_MODEL_HISTORY_ENABLED"],   false),
    publicPicksEnabled:           parseBool(process.env["PUBLIC_PICKS_ENABLED"],            false),
    publicBlogEnabled:            parseBool(process.env["PUBLIC_BLOG_ENABLED"],             false),
    performanceStatsEnabled:      parseBool(process.env["PERFORMANCE_STATS_ENABLED"],       false),
    confidenceDisplayMode:        parseConfidenceMode(process.env["CONFIDENCE_DISPLAY_MODE"]),
    featuredPickPromotionEnabled: parseBool(process.env["FEATURED_PICK_PROMOTION_ENABLED"], false),
    minDataQualityForGameLog:     parseIntSafe(process.env["MIN_DATA_QUALITY_FOR_GAME_LOG"], 40),
  };
}
