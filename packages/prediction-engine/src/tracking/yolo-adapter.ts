/**
 * YOLO-backed Detector behind the detector contract.
 *
 * The Python stage (yolo-detect.py) runs open-weights YOLO over video and
 * emits one JSON object per line in the detector-contract shape. This adapter
 * loads that output and serves it through `Detector.detect(frame)`, so the
 * rest of the pipeline (association → homography → metrics) consumes real
 * detections without any change.
 *
 * Boundary rationale: there is no maintained pure-TS YOLO runtime with open
 * weights; the Python side is the upstream "frame producer + detector" and
 * the TS side sees only this JSON contract.
 */

import type {
  Detection,
  DetectionClass,
  Detector,
  VideoFrame,
} from "./cv-detector-contract.js";

export interface YoloJsonDetection {
  readonly bbox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly confidence: number;
  readonly classId: DetectionClass;
  readonly teamHint?: string;
}

export interface YoloJsonFrame {
  readonly frameIndex: number;
  readonly t: number;
  readonly detections: readonly YoloJsonDetection[];
}

/**
 * Validate one parsed JSON frame defensively: malformed rows are dropped
 * rather than trusted, because the JSON crosses a process boundary.
 */
export function sanitizeYoloFrame(raw: unknown): YoloJsonFrame | null {
  if (typeof raw !== "object" || raw == null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.frameIndex !== "number" || typeof r.t !== "number") return null;
  if (!Array.isArray(r.detections)) return null;
  const detections: YoloJsonDetection[] = [];
  for (const d of r.detections) {
    if (typeof d !== "object" || d == null) continue;
    const dd = d as Record<string, unknown>;
    const b = dd.bbox as Record<string, unknown> | undefined;
    if (b == null) continue;
    const x = b.x, y = b.y, w = b.width, h = b.height;
    if (
      typeof x !== "number" || typeof y !== "number" ||
      typeof w !== "number" || typeof h !== "number" ||
      !(w > 0) || !(h > 0)
    ) {
      continue;
    }
    const confidence = typeof dd.confidence === "number" ? dd.confidence : 0;
    const classId: DetectionClass =
      dd.classId === "ball" || dd.classId === "ref" || dd.classId === "other"
        ? dd.classId
        : "player";
    detections.push({
      bbox: { x, y, width: w, height: h },
      confidence: Math.min(1, Math.max(0, confidence)),
      classId,
      ...(typeof dd.teamHint === "string" ? { teamHint: dd.teamHint } : {}),
    });
  }
  return { frameIndex: r.frameIndex, t: r.t, detections };
}

/** Parse a JSONL string (or array of parsed lines) into sanitized frames. */
export function parseYoloJsonl(
  lines: ReadonlyArray<string | unknown>,
): YoloJsonFrame[] {
  const frames: YoloJsonFrame[] = [];
  for (const line of lines) {
    let raw: unknown = line;
    if (typeof line === "string") {
      const trimmed = line.trim();
      if (trimmed === "") continue;
      try {
        raw = JSON.parse(trimmed);
      } catch {
        continue;
      }
    }
    const f = sanitizeYoloFrame(raw);
    if (f != null) frames.push(f);
  }
  frames.sort((a, b) => a.frameIndex - b.frameIndex);
  return frames;
}

/**
 * Detector over precomputed YOLO JSONL frames.
 *
 * `detect(frame)` looks up by `frame.index`. Frames the Python stage skipped
 * (stride) simply have no entry and emit nothing — the association layer's
 * maxGapFrames is the mechanism that tolerates that.
 */
export class YoloFileDetector implements Detector {
  readonly name = "yolo-file-detector";
  private readonly byIndex: Map<number, YoloJsonFrame>;

  constructor(frames: readonly YoloJsonFrame[]) {
    this.byIndex = new Map(frames.map((f) => [f.frameIndex, f]));
  }

  detect(frame: VideoFrame): Detection[] {
    const f = this.byIndex.get(frame.index);
    if (f == null) return [];
    return f.detections.map((d) => ({
      bbox: { ...d.bbox },
      confidence: d.confidence,
      classId: d.classId,
      ...(d.teamHint !== undefined ? { teamHint: d.teamHint } : {}),
    }));
  }

  get frameCount(): number {
    return this.byIndex.size;
  }
}
