import { describe, expect, it } from "vitest";
import {
  rescoreDetections,
  type PileClassifier,
  type WindowSample,
} from "./cv-temporal-window-classifier.js";
import {
  playerDetection,
  type FrameDetections,
  type VideoFrame,
} from "./cv-detector-contract.js";

function videoFrame(index: number): VideoFrame {
  return {
    index,
    t: index / 30,
    pixels: [[index]],
    width: 1,
    height: 1,
  };
}

function detFrame(index: number, confidences: number[]): FrameDetections {
  return {
    frameIndex: index,
    t: index / 30,
    detections: confidences.map((c, k) =>
      playerDetection(k * 50, 0, 40, 60, "KC", c),
    ),
  };
}

const fixedClassifier = (p: number): PileClassifier & { calls: number } => {
  const c = {
    name: "fixture",
    calls: 0,
    score(_s: WindowSample): number {
      c.calls++;
      return p;
    },
  };
  return c;
};

describe("cv-temporal-window-classifier (K6)", () => {
  it("rescores only sub-threshold detections: [0.3,0.6,0.2] → [0.9,0.6,0.9]", () => {
    const clf = fixedClassifier(0.9);
    const video = [videoFrame(0), videoFrame(1), videoFrame(2)];
    const frames = [detFrame(0, [0.3]), detFrame(1, [0.6]), detFrame(2, [0.2])];
    const out = rescoreDetections(frames, video, clf, { pileThreshold: 0.5, N: 1 });
    const confs = out.map((f) => f.detections[0]!.confidence);
    const flags = out.map((f) => f.detections[0]!.rescored);
    expect(confs).toEqual([0.9, 0.6, 0.9]);
    expect(flags).toEqual([true, false, true]);
    expect(clf.calls).toBe(2);
  });

  it("never lowers a confidence (max of original and window score)", () => {
    const clf = fixedClassifier(0.1); // window disagrees
    const video = [videoFrame(0)];
    const frames = [detFrame(0, [0.4])];
    const out = rescoreDetections(frames, video, clf, { pileThreshold: 0.5, N: 1 });
    expect(out[0]!.detections[0]!.confidence).toBe(0.4);
    expect(out[0]!.detections[0]!.rescored).toBe(true);
  });

  it("edge padding: N=2 on frame 0 of 3 → 5 crops, frame 0 repeated", () => {
    const seen: WindowSample[] = [];
    const clf: PileClassifier = {
      name: "capture",
      score: (s) => {
        seen.push(s);
        return 0.9;
      },
    };
    const video = [videoFrame(0), videoFrame(1), videoFrame(2)];
    const frames = [detFrame(0, [0.1]), detFrame(1, [0.9]), detFrame(2, [0.9])];
    rescoreDetections(frames, video, clf, { pileThreshold: 0.5, N: 2 });
    expect(seen).toHaveLength(1);
    const crops = seen[0]!.crops;
    expect(crops).toHaveLength(5);
    expect(crops.map((c) => c.index)).toEqual([0, 0, 0, 1, 2]);
    expect(seen[0]!.centerFrame).toBe(0);
  });

  it("cost guard: all detections above threshold → 0 classifier calls", () => {
    const clf = fixedClassifier(0.9);
    const video = [videoFrame(0), videoFrame(1)];
    const frames = [detFrame(0, [0.7, 0.8]), detFrame(1, [0.95])];
    const out = rescoreDetections(frames, video, clf, { pileThreshold: 0.5 });
    expect(clf.calls).toBe(0);
    expect(out.flatMap((f) => f.detections).every((d) => !d.rescored)).toBe(true);
  });

  it("rejects non-parallel frames/video", () => {
    const clf = fixedClassifier(0.9);
    expect(() =>
      rescoreDetections([detFrame(0, [0.1])], [videoFrame(0), videoFrame(1)], clf),
    ).toThrow(/parallel/);
  });
});
