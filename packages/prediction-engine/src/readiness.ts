/**
 * Platform Readiness Gates
 *
 * Single source of truth for "can this system do X right now?"
 * Used across workers, API routes, and content generation to enforce
 * consistent operational boundaries based on PlatformConfig.
 *
 * Usage:
 *   import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
 *
 *   const gates = getReadinessGates();
 *   if (!gates.canExposePublicPicks) {
 *     return NextResponse.json(bootstrapGateResponse("Public picks"), { status: 503 });
 *   }
 */

import { getPlatformConfig } from "./platform-config.js";
import type { PlatformConfig, ConfidenceDisplayMode } from "./platform-config.js";

export interface ReadinessGates {
  /** Scoring is always permitted — the engine never goes offline. */
  readonly canScore: true;

  /**
   * Picks can always be persisted for internal validation and settlement.
   * The isBootstrap field distinguishes canonical from bootstrap-era picks.
   */
  readonly canPersistPicks: true;

  /**
   * When false: new TeamGameLog entries and picks are written with isBootstrap=true.
   * They remain in the DB but do not count toward canonical performance history.
   */
  readonly canPersistCanonicalHistory: boolean;

  /**
   * When false: ATS form, H2H form, and venue splits produce score=0 in the
   * prediction engine (context fields are set to null before scoring).
   * Only non-bootstrap TeamGameLog entries are used when this is true.
   */
  readonly canUseDerivedHistory: boolean;

  /**
   * When false: /api/picks and /api/picks/daily-slate return 503.
   * Picks are still generated and stored for admin review.
   */
  readonly canExposePublicPicks: boolean;

  /**
   * When false: isFeatured is always set to false on new picks regardless of grade.
   */
  readonly canPromoteFeaturedPicks: boolean;

  /**
   * When false: content-publishing worker skips all generation.
   */
  readonly canPublishContent: boolean;

  /**
   * When false: /api/performance returns 503.
   * Prevents bootstrap-era win rates from appearing as production metrics.
   */
  readonly canExposePerformanceStats: boolean;

  /**
   * True when canonicalHistoryEnabled is false.
   * Callers can use this to add [BOOTSTRAP] warnings in admin UI or logs.
   */
  readonly isBootstrapMode: boolean;

  /** How confidence should be presented to users at this maturity level. */
  readonly confidenceDisplayMode: ConfidenceDisplayMode;

  /** Minimum dataQualityScore for a game's TeamGameLog entry to be written. */
  readonly minDataQualityForGameLog: number;

  /**
   * When true: settled canonical PickSignalSnapshots are marked eligibleForLearning=true.
   * This gates DATA COLLECTION for outcome-anchored calibration only.
   * It does NOT automatically adjust scoring weights or confidence values.
   *
   * The model may ONLY learn from:
   *   - Real settlement results (WIN/LOSS/PUSH from actual game outcomes)
   *   - Signal state recorded at prediction time (bookmaker count, line movement, etc.)
   *   - External source conditions (bookmaker market depth, coverage)
   *
   * The model MUST NOT learn from:
   *   - Its own prior confidence scores without outcome validation
   *   - Its own prior reasoning text
   *   - Its own prior pick grades in isolation from real outcomes
   *   - Bootstrap-era snapshots (these are excluded by isBootstrap=false filter)
   */
  readonly canLearnFromOutcomes: boolean;

  /**
   * When true: the isotonic calibrator (calibration-apply.ts) is active and
   * confidence scores are mapped to calibrated win probabilities.
   *
   * Defaults to false via CALIBRATION_ADJUSTMENTS_ENABLED env var.
   * Activation requires completing the audited MODEL_VERSION sequence in
   * docs/path-to-70.md §7 — never set this without that audit trail.
   */
  readonly canApplyCalibrationAdjustments: boolean;

  /** Minimum settled canonical picks needed for learning data to be meaningful. */
  readonly minSettledPicksForLearning: number;

  /** The underlying config for callers that need specific values. */
  readonly config: PlatformConfig;
}

export function getReadinessGates(): ReadinessGates {
  const config = getPlatformConfig();
  return {
    canScore:                        true,
    canPersistPicks:                 true,
    canPersistCanonicalHistory:      config.canonicalHistoryEnabled,
    canUseDerivedHistory:            config.derivedModelHistoryEnabled,
    canExposePublicPicks:            config.publicPicksEnabled,
    canPromoteFeaturedPicks:         config.featuredPickPromotionEnabled,
    canPublishContent:               config.publicBlogEnabled,
    canExposePerformanceStats:       config.performanceStatsEnabled,
    isBootstrapMode:                 !config.canonicalHistoryEnabled,
    confidenceDisplayMode:           config.confidenceDisplayMode,
    minDataQualityForGameLog:        config.minDataQualityForGameLog,
    canLearnFromOutcomes:            config.outcomeLearningEnabled,
    canApplyCalibrationAdjustments:  config.calibrationAdjustmentsEnabled,
    minSettledPicksForLearning:      config.minSettledPicksForLearning,
    config,
  };
}

/**
 * Returns a structured 503 error body for routes blocked by bootstrap mode.
 * Pair with `{ status: 503 }` in the route handler.
 */
export function bootstrapGateResponse(featureName: string): {
  error: string;
  bootstrapMode: true;
  hint: string;
} {
  return {
    error: `${featureName} is disabled in bootstrap mode.`,
    bootstrapMode: true,
    hint: "Set the appropriate environment flag to enable this feature. See .env.example for the bootstrap progression guide.",
  };
}
