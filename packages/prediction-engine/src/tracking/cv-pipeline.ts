/**
 * End-to-end broadcast-video movement pipeline (weight-free stages).
 *
 * frames → detector → per-frame detections → tracklet association →
 * camera-motion compensation → field homography → per-player movement
 * metrics (distance, top speed, average speed in real-world meters).
 *
 * This composes the primitives from cv-movement-primitive.ts with the new
 * detector contract (cv-detector-contract.ts), IoU association
 * (cv-tracklet-association.ts), and DLT homography (cv-homography.ts).
 * Everything runs on fixture frames today: the detector is the swappable
 * boundary where a real YOLO/RT-DETR build drops in later, and the homography
 * comes from fitHomographyDLT() on detected yardlines (or a provided one).
 *
 * Camera-motion alignment note: motion fields are computed per consecutive
 * video-frame pair and aligned to each tracklet frame by timestamp, so
 * tracklets with occlusion gaps still compensate against the correct pair.
 * (compensateCameraMotion() itself indexes positionally; the alignment happens
 * here, before the call.)
 *
 * Output MovementMetric[] is the composition point for NGS-style validation
 * and the engine's tracking surface — wiring those producers is follow-up
 * work, deliberately not done here.
 */

import {
  compensateCameraMotion,
  deriveMovementMetrics,
  estimateCameraMotion,
  perspectiveTransform,
  type CameraMotionField,
  type Homography,
  type MovementMetric,
  type Tracklet,
} from "./cv-movement-primitive.js";
import {
  buildTracklets,
  type AssociationOptions,
} from "./cv-tracklet-association.js";
import type { Detector, VideoFrame } from "./cv-detector-contract.js";

export interface MovementPipelineInput {
  readonly frames: readonly VideoFrame[];
  readonly detector: Detector;
  /** Field homography (pixels → meters), e.g. from fitHomographyDLT(). */
  readonly homography: Homography;
  readonly association?: AssociationOptions;
  /** Estimate + subtract camera motion. Default true. */
  readonly compensateMotion?: boolean;
}

export interface MovementPipelineOutput {
  /** Tracklets with xM/yM filled (camera-compensated, world coordinates). */
  readonly tracklets: Tracklet[];
  readonly metrics: MovementMetric[];
  /** Per video-frame camera motion; index 0 is always zero. */
  readonly cameraMotion: CameraMotionField[];
  readonly detectionsPerFrame: number[];
}

const ZERO_MOTION: CameraMotionField = { dx: 0, dy: 0, magnitude: 0 };

export function runMovementPipeline(
  input: MovementPipelineInput,
): MovementPipelineOutput {
  const { frames, detector, homography } = input;
  if (frames.length === 0) {
    throw new Error("runMovementPipeline: need at least one frame");
  }
  const compensateMotion = input.compensateMotion ?? true;

  // 1. Detect.
  const perFrame = frames.map((f) => ({
    frameIndex: f.index,
    t: f.t,
    detections: detector.detect(f),
  }));
  const detectionsPerFrame = perFrame.map((p) => p.detections.length);

  // 2. Associate into tracklets.
  const tracklets = buildTracklets(perFrame, input.association);

  // 3. Camera motion per consecutive frame pair, aligned by video frame.
  const tToIndex = new Map<number, number>(frames.map((f) => [f.t, f.index]));
  const cameraMotion: CameraMotionField[] = frames.map((f, k) => {
    if (k === 0 || !compensateMotion) return { ...ZERO_MOTION };
    const prev = frames[k - 1];
    if (prev == null) return { ...ZERO_MOTION };
    return estimateCameraMotion(
      prev.pixels as number[][],
      f.pixels as number[][],
    );
  });

  // 4. Compensate each tracklet against the motion of its own frames.
  const compensated: Tracklet[] = tracklets.map((trk) => {
    const fields = trk.frames.map(
      (fp) => cameraMotion[tToIndex.get(fp.t) ?? 0] ?? ZERO_MOTION,
    );
    return compensateCameraMotion(trk, fields);
  });

  // 5. Pixels → meters through the field homography.
  const world: Tracklet[] = compensated.map((trk) => {
    const projected = perspectiveTransform(
      trk.frames.map((f) => ({ xPx: f.xPx, yPx: f.yPx })),
      homography,
    );
    return {
      ...trk,
      frames: trk.frames.map((f, i) => ({
        ...f,
        xM: projected[i]?.xM ?? null,
        yM: projected[i]?.yM ?? null,
      })),
    };
  });

  // 6. Metrics.
  const metrics = deriveMovementMetrics(world);

  return { tracklets: world, metrics, cameraMotion, detectionsPerFrame };
}
