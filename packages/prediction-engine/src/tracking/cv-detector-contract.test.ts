import { describe, expect, it } from "vitest";
import {
  FixtureDetector,
  boxCenter,
  footPoint,
  playerDetection,
  type VideoFrame,
} from "./cv-detector-contract.js";

function frame(index: number): VideoFrame {
  return { index, t: index * 0.1, pixels: [[0]], width: 64, height: 40 };
}

describe("cv-detector-contract", () => {
  it("footPoint uses the bottom-center of the box (feet on the field plane)", () => {
    const d = playerDetection(10, 20, 6, 12, "KC");
    expect(footPoint(d)).toEqual({ xPx: 13, yPx: 32 });
  });

  it("boxCenter uses the box center", () => {
    const d = playerDetection(10, 20, 6, 12, "KC");
    expect(boxCenter(d)).toEqual({ xPx: 13, yPx: 26 });
  });

  it("FixtureDetector emits the scripted detections per frame index", () => {
    const script = [
      [playerDetection(0, 0, 8, 12, "KC")],
      [playerDetection(2, 0, 8, 12, "KC"), playerDetection(40, 24, 8, 12, "PHI")],
    ];
    const det = new FixtureDetector(script);
    expect(det.detect(frame(0))).toHaveLength(1);
    expect(det.detect(frame(1))).toHaveLength(2);
    expect(det.detect(frame(1))[1]?.teamHint).toBe("PHI");
    // Missing script entries emit nothing (no crash, no phantom players).
    expect(det.detect(frame(7))).toHaveLength(0);
  });

  it("FixtureDetector returns a copy, not the script array itself", () => {
    const script = [[playerDetection(0, 0, 8, 12, "KC")]];
    const det = new FixtureDetector(script);
    const out = det.detect(frame(0));
    out.pop();
    expect(det.detect(frame(0))).toHaveLength(1);
  });
});
