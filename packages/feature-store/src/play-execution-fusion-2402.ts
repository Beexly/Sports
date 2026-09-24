/**
 * Play-execution quality: tracking-derived flow features for adaptive fusion
 *
 * Research port: arXiv:2402.09444
 * Normalized lane: multimodal_fusion | Doctrine: PROPRIETARY_EDGE
 *
 * Builds the tracking-derived 'flow' side of the adaptive modality fusion: per-play player-velocity aggregates (mean/max speed, speed dispersion, spacing entropy) from NGS-style tracking frames. Broadcast-video features enter through the fusion weights; this module is the pure tracking leg.
 *
 * ACCEPTANCE GATE: ACCEPT only if adaptive fusion beats BOTH the tracking-only model (Spearman +0.03) AND naive weighted fusion (+0.02) on the 2024 test. Live-data gate -> GSE_EXECUTION_FUSION_ENABLED flag (default false).
 */

export interface TrackingFrame {
  /** per-player speeds (yd/s) at this frame */
  speeds: number[];
  /** pairwise spacing sample (yd) */
  spacings: number[];
}

export interface FlowFeatures {
  meanSpeed: number;
  maxSpeed: number;
  speedDispersion: number; // std of speeds
  spacingEntropy: number; // histogram entropy of spacings
  frameCount: number;
}

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

function std(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

/** Histogram entropy of spacing samples (8 bins over [0, 30] yd). */
function spacingEntropy(spacings: number[]): number {
  if (spacings.length === 0) return 0;
  const bins = new Array(8).fill(0);
  for (const s of spacings) bins[Math.min(7, Math.max(0, Math.floor(s / 30 * 8)))]++;
  const n = spacings.length;
  return -bins.reduce((h, c) => (c === 0 ? h : h + (c / n) * Math.log2(c / n)), 0);
}

/** Aggregate tracking frames into per-play flow features (pure). */
export function extractFlowFeatures(frames: TrackingFrame[]): FlowFeatures {
  const speeds = frames.flatMap((f) => f.speeds);
  const spacings = frames.flatMap((f) => f.spacings);
  return {
    meanSpeed: mean(speeds),
    maxSpeed: speeds.length === 0 ? 0 : Math.max(...speeds),
    speedDispersion: std(speeds),
    spacingEntropy: spacingEntropy(spacings),
    frameCount: frames.length,
  };
}

export interface ModalityWeights {
  tracking: number;
  video: number;
}

/** Adaptive fusion: normalize to a convex combination (video weight supplied by the video leg). */
export function adaptiveFusionWeights(trackingConfidence: number, videoConfidence: number): ModalityWeights {
  const t = Math.max(0, trackingConfidence);
  const v = Math.max(0, videoConfidence);
  const s = t + v;
  if (s === 0) return { tracking: 0.5, video: 0.5 };
  return { tracking: t / s, video: v / s };
}

/** Live-data gate: must beat tracking-only (+0.03 Spearman) and naive fusion (+0.02). */
export const GSE_EXECUTION_FUSION_ENABLED = false;

