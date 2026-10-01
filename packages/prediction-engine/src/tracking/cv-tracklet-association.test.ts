import { describe, expect, it } from "vitest";
import {
  bboxIoU,
  buildTracklets,
} from "./cv-tracklet-association.js";
import { playerDetection, type FrameDetections } from "./cv-detector-contract.js";

function framesWith(
  perFrame: ReadonlyArray<ReturnType<typeof playerDetection>[]>,
): FrameDetections[] {
  return perFrame.map((dets, i) => ({ frameIndex: i, t: i * 0.1, detections: dets }));
}

describe("cv-tracklet-association", () => {
  it("bboxIoU: identical boxes → 1, disjoint → 0, half-overlap → 1/3", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(bboxIoU(a, a)).toBeCloseTo(1, 10);
    expect(bboxIoU(a, { x: 50, y: 50, width: 10, height: 10 })).toBe(0);
    expect(bboxIoU(a, { x: 5, y: 0, width: 10, height: 10 })).toBeCloseTo(1 / 3, 10);
  });

  it("one player gliding 2px/frame → a single 5-frame tracklet", () => {
    const perFrame = [0, 1, 2, 3, 4].map((k) => [
      playerDetection(10 + 2 * k, 8, 8, 12, "KC"),
    ]);
    const tracklets = buildTracklets(framesWith(perFrame));
    expect(tracklets).toHaveLength(1);
    expect(tracklets[0]?.frames).toHaveLength(5);
    expect(tracklets[0]?.id).toBe("trk-0001");
    expect(tracklets[0]?.team).toBe("KC");
    // Foot points track the motion: x = 10 + 2k + 4, y = 8 + 12.
    expect(tracklets[0]?.frames[4]?.xPx).toBeCloseTo(22, 10);
    expect(tracklets[0]?.frames[4]?.yPx).toBe(20);
  });

  it("two players on separate rows → two tracklets, no identity swap", () => {
    const perFrame = [0, 1, 2, 3, 4].map((k) => [
      playerDetection(10 + 2 * k, 8, 8, 12, "KC"),
      playerDetection(40 - 2 * k, 24, 8, 12, "PHI"),
    ]);
    const tracklets = buildTracklets(framesWith(perFrame));
    expect(tracklets).toHaveLength(2);
    const kc = tracklets.find((t) => t.team === "KC");
    const phi = tracklets.find((t) => t.team === "PHI");
    expect(kc?.frames).toHaveLength(5);
    expect(phi?.frames).toHaveLength(5);
    // KC moves right, PHI moves left — identities hold to the last frame.
    expect(kc?.frames[4]?.xPx).toBeGreaterThan(kc?.frames[0]?.xPx ?? 0);
    expect(phi?.frames[4]?.xPx).toBeLessThan(phi?.frames[0]?.xPx ?? 0);
  });

  it("a one-frame blip is dropped by minTrackletFrames", () => {
    const perFrame = [
      [playerDetection(10, 8, 8, 12, "KC")],
      [playerDetection(12, 8, 8, 12, "KC"), playerDetection(50, 30, 8, 12, "PHI")],
      [playerDetection(14, 8, 8, 12, "KC")],
    ];
    const tracklets = buildTracklets(framesWith(perFrame));
    expect(tracklets).toHaveLength(1);
    expect(tracklets[0]?.team).toBe("KC");
  });

  it("a 2-frame occlusion gap keeps the identity (maxGapFrames tolerance)", () => {
    // Player ducks behind another player for 2 frames and reappears nearby:
    // IoU still links it, so the gap does not split the identity. (A player
    // that sprints far during the gap correctly starts a new tracklet —
    // bridging that needs motion prediction, a documented follow-up.)
    const kc = (k: number) => playerDetection(10 + 2 * k, 8, 8, 12, "KC");
    const perFrame = [
      [kc(0)],
      [kc(1)],
      [], // occluded
      [], // occluded
      [kc(2)], // reappears near the last-seen box
    ];
    const tracklets = buildTracklets(framesWith(perFrame));
    expect(tracklets).toHaveLength(1);
    expect(tracklets[0]?.frames).toHaveLength(3);
  });

  it("a long disappearance retires the tracklet; return starts a new id", () => {
    const kc = (k: number) => playerDetection(10 + 2 * k, 8, 8, 12, "KC");
    const perFrame = [
      [kc(0)],
      [kc(1)],
      [], [], [], [], [], [], // 6-frame gap > default maxGapFrames (5)
      [kc(8)],
      [kc(9)],
    ];
    const tracklets = buildTracklets(framesWith(perFrame));
    expect(tracklets).toHaveLength(2);
    expect(tracklets[0]?.id).not.toBe(tracklets[1]?.id);
  });
});
