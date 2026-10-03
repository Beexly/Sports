import { describe, expect, it } from "vitest";
import {
  associateMotionAware,
  bboxIoU,
  buildTracklets,
} from "./cv-tracklet-association.js";
import type { Mat3 } from "./cv-camera-compensation.js";
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

describe("cv-tracklet-association motion-aware (K2)", () => {
  // 6 players, constant world velocity; camera pans 120 px/s in +x.
  // 10 fps stress fixture: 12 px/frame camera shift fragments IoU.
  function panFixture(): {
    frames: FrameDetections[];
    homos: Mat3[];
  } {
    const N = 60;
    const dt = 0.1;
    const camVx = 120;
    const players = [
      { x: 100, y: 100, vx: 30, vy: 10 },
      { x: 200, y: 150, vx: -20, vy: 15 },
      { x: 300, y: 80, vx: 50, vy: -5 },
      { x: 400, y: 200, vx: -40, vy: -10 },
      { x: 150, y: 250, vx: 10, vy: 30 },
      { x: 350, y: 120, vx: -15, vy: -25 },
    ];
    const frames: FrameDetections[] = [];
    for (let k = 0; k < N; k++) {
      const t = k * dt;
      const dets = players.map((p, i) =>
        playerDetection(
          p.x + p.vx * t + camVx * t,
          p.y + p.vy * t,
          16, 32,
          `T${i}`,
        ),
      );
      frames.push({ frameIndex: k, t, detections: dets });
    }
    const homos: Mat3[] = [];
    for (let k = 0; k < N - 1; k++) {
      homos.push({ m: [1, 0, camVx * dt, 0, 1, 0, 0, 0, 1] });
    }
    return { frames, homos };
  }

  it("pan fixture: legacy IoU fragments (>=20), motion-aware holds 6", () => {
    const { frames, homos } = panFixture();
    const legacy = buildTracklets(frames, { minIou: 0.3, minTrackletFrames: 1 });
    expect(legacy.length).toBeGreaterThanOrEqual(20);

    const motion = associateMotionAware(frames, {
      homographies: homos,
      pxPerMeter: 20,
      vMaxMps: 10,
      minTrackletFrames: 2,
    });
    expect(motion).toHaveLength(6);
    for (const trk of motion) {
      expect(trk.frames.length).toBeGreaterThan(50);
    }
  });

  it("pile-coast: 10-frame gap splits legacy, motion-aware survives as 1", () => {
    // One player at 20 px/s; detections missing frames 10..19.
    const N = 30;
    const dt = 1 / 30;
    const perFrame: ReturnType<typeof playerDetection>[][] = [];
    for (let k = 0; k < N; k++) {
      if (k >= 10 && k < 20) perFrame.push([]);
      else perFrame.push([playerDetection(50 + 20 * k * dt, 100, 16, 32, "KC")]);
    }
    const frames = perFrame.map((dets, i) => ({
      frameIndex: i,
      t: i * dt,
      detections: dets,
    }));

    const legacy = buildTracklets(frames, { maxGapFrames: 5, minTrackletFrames: 1 });
    expect(legacy).toHaveLength(2);

    const motion = associateMotionAware(frames, {
      coastFrames: 15,
      pxPerMeter: 20,
      vMaxMps: 10,
      minTrackletFrames: 1,
    });
    expect(motion).toHaveLength(1);
    expect(motion[0]?.frames).toHaveLength(20); // 10 before + 10 after, gap coasted
  });

  it("crossing players: no ID switch", () => {
    // A moves left->right at y=100; B moves right->left at y=130.
    // They cross in x at frame 15 but stay 30px apart in y.
    const N = 30;
    const dt = 1 / 30;
    const perFrame: ReturnType<typeof playerDetection>[][] = [];
    for (let k = 0; k < N; k++) {
      perFrame.push([
        playerDetection(50 + 8 * k, 100, 16, 32, "A"),
        playerDetection(50 + 8 * (N - 1 - k), 130, 16, 32, "B"),
      ]);
    }
    const frames = perFrame.map((dets, i) => ({
      frameIndex: i,
      t: i * dt,
      detections: dets,
    }));
    const motion = associateMotionAware(frames, {
      pxPerMeter: 20,
      vMaxMps: 10,
      minTrackletFrames: 2,
    });
    expect(motion).toHaveLength(2);
    // The tracklet born on the left (A) must still be moving right at the end.
    const leftBorn = motion.reduce((a, b) =>
      (a.frames[0]?.xPx ?? 0) < (b.frames[0]?.xPx ?? 0) ? a : b,
    );
    const rightBorn = motion.reduce((a, b) =>
      (a.frames[0]?.xPx ?? 0) > (b.frames[0]?.xPx ?? 0) ? a : b,
    );
    const lx0 = leftBorn.frames[0]?.xPx ?? 0;
    const lx1 = leftBorn.frames[leftBorn.frames.length - 1]?.xPx ?? 0;
    const rx0 = rightBorn.frames[0]?.xPx ?? 0;
    const rx1 = rightBorn.frames[rightBorn.frames.length - 1]?.xPx ?? 0;
    expect(lx1).toBeGreaterThan(lx0); // A kept going right
    expect(rx1).toBeLessThan(rx0); // B kept going left
    // And they never shared an identity: foot-point y-lanes stay separated
    // (A: bbox y=100 → foot 132; B: bbox y=130 → foot 162).
    for (const f of leftBorn.frames) expect(f.yPx).toBeLessThan(147);
    for (const f of rightBorn.frames) expect(f.yPx).toBeGreaterThan(147);
  });
});
