/**
 * cv-temporal-window-classifier.ts — K6: temporal-window rescoring.
 *
 * The Kaggle NFL impact-detection winner's recipe, repurposed for pile
 * disambiguation: a per-frame detector finds candidate boxes; a
 * classifier sees the box's 2N+1-frame temporal neighborhood (not just
 * the ambiguous single frame) and re-scores only sub-threshold
 * detections. Detections above the pile threshold pass through untouched
 * (cost guard: no wasted compute on easy frames).
 *
 * Model-agnostic contract: real weights live outside the repo; tests use
 * a fixture classifier. Edge frames are padded by repeating the edge
 * frame so every sample has exactly 2N+1 crops.
 */

import type {
  BoundingBox,
  Detection,
  FrameDetections,
  VideoFrame,
} from "./cv-detector-contract.js";

export interface WindowSample {
  /** Index of the center frame in the video array. */
  readonly centerFrame: number;
  /** 2N+1 crops centered on centerFrame (edge-padded), same box. */
  readonly crops: readonly VideoFrame[];
  readonly box: BoundingBox;
}

export interface PileClassifier {
  readonly name: string;
  /** P(person | box, temporal window), 0..1. */
  score(sample: WindowSample): number;
}

export interface RescoreOptions {
  /** Re-score detections below this confidence. Default 0.5. */
  readonly pileThreshold?: number;
  /** Half-window size; sample has 2N+1 crops. Default 2. */
  readonly N?: number;
}

export type RescoredDetection = Detection & { readonly rescored: boolean };

export interface RescoredFrameDetections {
  readonly frameIndex: number;
  readonly t: number;
  readonly detections: readonly RescoredDetection[];
}

/**
 * Re-score sub-threshold detections with the temporal-window classifier.
 * `video` must be parallel to `frames` (video[i] is frames[i]'s pixels).
 * Pure function; never mutates inputs.
 */
export function rescoreDetections(
  frames: readonly FrameDetections[],
  video: readonly VideoFrame[],
  classifier: PileClassifier,
  options: RescoreOptions = {},
): RescoredFrameDetections[] {
  const pileThreshold = options.pileThreshold ?? 0.5;
  const N = options.N ?? 2;
  if (frames.length !== video.length) {
    throw new Error(
      `rescoreDetections: frames (${frames.length}) and video (${video.length}) must be parallel`,
    );
  }

  const cropWindow = (center: number): VideoFrame[] => {
    const crops: VideoFrame[] = [];
    for (let k = -N; k <= N; k++) {
      const idx = Math.min(video.length - 1, Math.max(0, center + k));
      crops.push(video[idx]!);
    }
    return crops;
  };

  return frames.map((frame, i) => ({
    frameIndex: frame.frameIndex,
    t: frame.t,
    detections: frame.detections.map((d) => {
      if (d.confidence >= pileThreshold) {
        return { ...d, rescored: false };
      }
      const p = classifier.score({
        centerFrame: i,
        crops: cropWindow(i),
        box: d.bbox,
      });
      return {
        ...d,
        confidence: Math.max(d.confidence, p),
        rescored: true,
      };
    }),
  }));
}
