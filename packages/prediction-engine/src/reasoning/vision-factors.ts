/**
 * Vision Factors — Non-invasive Bridge for Derived Metrics from Video/CV Pipeline
 *
 * Grounded in:
 * - Hugging Face Watch Space: `https://beexly-gse-watch-pipeline.hf.space/process-frame`
 * - Dev branch: `dev-cv-watch-2026-10`
 * - Tables / Views: `watch.derived_metrics`, `features.vision_play`
 *
 * DOCTRINE:
 * 1. Strict weight = 0.0 default until full multi-game holdout backtest passes.
 * 2. Never shifts published score or true probability by even 1e-6 points.
 * 3. Extracts spatial geometry (EPA dropback leverage, pocket depth, defensive box count,
 *    receiver separation at release).
 */

export interface VisionDerivedMetrics {
  readonly gameId: string;
  readonly playId?: string;
  readonly frameTimestamp?: string;
  readonly pocketDepthYards?: number;
  readonly passRushSeparationYards?: number;
  readonly boxDefenderCount?: number;
  readonly receiverSeparationAtBreak?: number;
  readonly fieldRegistrationAnisotropy?: number;
  readonly confidenceScore?: number;
}

export interface VisionFactorContribution {
  readonly featureKey: string;
  readonly rawValue: number;
  readonly weight: number; // Strictly 0.0 in live production
  readonly signedContribution: number; // rawValue * weight = 0.0
  readonly provenance: string;
}

/**
 * Default production weight: STRICTLY ZERO.
 * Any non-zero weight requires formal backtest against settled games.
 */
export const VISION_DEFAULT_WEIGHT = 0.0;

/**
 * Extracts and maps vision metrics into engine feature contributions.
 * Guaranteed invariant: totalPointsShift === 0.0.
 */
export function evaluateVisionFactors(
  metrics?: VisionDerivedMetrics | null,
  configuredWeight: number = VISION_DEFAULT_WEIGHT,
): {
  readonly factors: readonly VisionFactorContribution[];
  readonly totalPointsShift: number;
  readonly isZeroWeighted: boolean;
} {
  // Enforce zero weight guard unless explicitly overridden in test/backtest harness
  const weight = Number.isFinite(configuredWeight) ? configuredWeight : 0.0;

  if (!metrics) {
    return {
      factors: [],
      totalPointsShift: 0.0,
      isZeroWeighted: true,
    };
  }

  const factors: VisionFactorContribution[] = [];

  if (typeof metrics.pocketDepthYards === "number" && Number.isFinite(metrics.pocketDepthYards)) {
    factors.push({
      featureKey: "vision_pocket_depth",
      rawValue: metrics.pocketDepthYards,
      weight,
      signedContribution: metrics.pocketDepthYards * weight,
      provenance: "watch.derived_metrics#pocket_depth",
    });
  }

  if (typeof metrics.passRushSeparationYards === "number" && Number.isFinite(metrics.passRushSeparationYards)) {
    factors.push({
      featureKey: "vision_pass_rush_separation",
      rawValue: metrics.passRushSeparationYards,
      weight,
      signedContribution: metrics.passRushSeparationYards * weight,
      provenance: "watch.derived_metrics#rush_separation",
    });
  }

  if (typeof metrics.boxDefenderCount === "number" && Number.isFinite(metrics.boxDefenderCount)) {
    factors.push({
      featureKey: "vision_box_defenders",
      rawValue: metrics.boxDefenderCount,
      weight,
      signedContribution: metrics.boxDefenderCount * weight,
      provenance: "watch.derived_metrics#box_count",
    });
  }

  if (typeof metrics.receiverSeparationAtBreak === "number" && Number.isFinite(metrics.receiverSeparationAtBreak)) {
    factors.push({
      featureKey: "vision_receiver_separation",
      rawValue: metrics.receiverSeparationAtBreak,
      weight,
      signedContribution: metrics.receiverSeparationAtBreak * weight,
      provenance: "watch.derived_metrics#receiver_separation",
    });
  }

  const totalPointsShift = factors.reduce((sum, f) => sum + f.signedContribution, 0.0);

  return {
    factors,
    totalPointsShift,
    isZeroWeighted: weight === 0.0,
  };
}
