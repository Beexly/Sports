/**
 * Detector contract for the broadcast-video movement pipeline.
 *
 * The pipeline reasons about *detections* (boxes), never about pixels, so the
 * detector is a swappable boundary: a real YOLO / RT-DETR build drops in
 * behind this interface without touching association, calibration, or metrics.
 *
 * No model weights live in this repo. Everything here runs on fixtures.
 * Original implementation for GSE; learn-only with respect to public
 * reference repos — no code ported.
 */

export interface BoundingBox {
  /** Top-left corner, pixels. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type DetectionClass = "player" | "ball" | "ref" | "other";

export interface Detection {
  readonly bbox: BoundingBox;
  /** Detector confidence, 0..1. */
  readonly confidence: number;
  readonly classId: DetectionClass;
  /** Optional team hint from jersey color / roster prior ("KC", "PHI", ...). */
  readonly teamHint?: string;
}

export interface FrameDetections {
  readonly frameIndex: number;
  /** Timestamp, seconds. */
  readonly t: number;
  readonly detections: readonly Detection[];
}

/** Grayscale fixture frame. Production frames arrive decoded upstream. */
export interface VideoFrame {
  readonly index: number;
  readonly t: number;
  readonly pixels: readonly (readonly number[])[];
  readonly width: number;
  readonly height: number;
}

export interface Detector {
  readonly name: string;
  detect(frame: VideoFrame): Detection[];
}

/**
 * Bottom-center of the box — the foot position. Feet sit on the field plane,
 * so this is the right point to push through the field homography (better
 * than the box center, which floats above the plane for tall players).
 */
export function footPoint(d: Detection): { xPx: number; yPx: number } {
  return {
    xPx: d.bbox.x + d.bbox.width / 2,
    yPx: d.bbox.y + d.bbox.height,
  };
}

export function boxCenter(d: Detection): { xPx: number; yPx: number } {
  return {
    xPx: d.bbox.x + d.bbox.width / 2,
    yPx: d.bbox.y + d.bbox.height / 2,
  };
}

/**
 * Deterministic scripted detector. `script[i]` is the detection list emitted
 * for frame i; missing entries emit nothing. Used for pipeline tests and for
 * validating association + calibration end-to-end without model weights.
 */
export class FixtureDetector implements Detector {
  readonly name = "fixture-detector";

  constructor(private readonly script: ReadonlyArray<readonly Detection[]>) {}

  detect(frame: VideoFrame): Detection[] {
    return [...(this.script[frame.index] ?? [])];
  }
}

/** Convenience: build a scripted player detection. */
export function playerDetection(
  x: number,
  y: number,
  w: number,
  h: number,
  teamHint: string,
  confidence = 0.95,
): Detection {
  return {
    bbox: { x, y, width: w, height: h },
    confidence,
    classId: "player",
    teamHint,
  };
}
