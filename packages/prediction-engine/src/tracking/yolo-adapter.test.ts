import { describe, expect, it } from "vitest";
import {
  parseYoloJsonl,
  sanitizeYoloFrame,
  YoloFileDetector,
} from "./yolo-adapter.js";
import type { VideoFrame } from "./cv-detector-contract.js";

function stubFrame(index: number): VideoFrame {
  return { index, t: index * 0.2, pixels: [], width: 640, height: 360 };
}

describe("yolo-adapter (synthetic JSONL)", () => {
  it("parses valid JSONL lines into frames", () => {
    const lines = [
      JSON.stringify({
        frameIndex: 1,
        t: 0.2,
        detections: [
          {
            bbox: { x: 10, y: 20, width: 30, height: 60 },
            confidence: 0.9,
            classId: "player",
          },
        ],
      }),
      JSON.stringify({ frameIndex: 0, t: 0.0, detections: [] }),
      "",
      "not json at all",
    ];
    const frames = parseYoloJsonl(lines);
    expect(frames).toHaveLength(2);
    // Sorted by frameIndex regardless of input order.
    expect(frames[0]?.frameIndex).toBe(0);
    expect(frames[1]?.frameIndex).toBe(1);
    expect(frames[1]?.detections).toHaveLength(1);
  });

  it("drops malformed detections but keeps the frame", () => {
    const f = sanitizeYoloFrame({
      frameIndex: 3,
      t: 0.6,
      detections: [
        { bbox: { x: 1, y: 2, width: 0, height: 5 }, confidence: 0.5 }, // zero width
        { bbox: { x: 1, y: 2 }, confidence: 0.5 }, // missing dims
        {
          bbox: { x: 5, y: 5, width: 10, height: 20 },
          confidence: 1.7, // clamped
          classId: "weird", // coerced to player
        },
      ],
    });
    expect(f).not.toBeNull();
    expect(f?.detections).toHaveLength(1);
    expect(f?.detections[0]?.confidence).toBe(1);
    expect(f?.detections[0]?.classId).toBe("player");
  });

  it("rejects frames missing index/t", () => {
    expect(sanitizeYoloFrame({ detections: [] })).toBeNull();
    expect(sanitizeYoloFrame(null)).toBeNull();
    expect(sanitizeYoloFrame("nope")).toBeNull();
  });

  it("YoloFileDetector serves detections by frame index", () => {
    const frames = parseYoloJsonl([
      JSON.stringify({
        frameIndex: 0,
        t: 0.0,
        detections: [
          {
            bbox: { x: 10, y: 20, width: 30, height: 60 },
            confidence: 0.9,
            classId: "player",
            teamHint: "KC",
          },
        ],
      }),
    ]);
    const det = new YoloFileDetector(frames);
    expect(det.name).toBe("yolo-file-detector");
    expect(det.frameCount).toBe(1);
    const out = det.detect(stubFrame(0));
    expect(out).toHaveLength(1);
    expect(out[0]?.bbox).toEqual({ x: 10, y: 20, width: 30, height: 60 });
    expect(out[0]?.teamHint).toBe("KC");
    // Unknown index → no detections (association tolerates the gap).
    expect(det.detect(stubFrame(7))).toEqual([]);
  });
});
