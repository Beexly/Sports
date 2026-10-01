import { describe, expect, it } from "vitest";
import {
  breakAngle,
  nearestDefender,
  positionAt,
  separationMetrics,
} from "./cv-separation-metrics.js";
import type { Tracklet } from "../tracking/cv-movement-primitive.js";

function trk(
  id: string,
  team: string,
  pts: readonly (readonly [number, number, number])[],
): Tracklet {
  return {
    id,
    team,
    role: "player",
    frames: pts.map(([t, xM, yM]) => ({
      t,
      xPx: 0,
      yPx: 0,
      xM,
      yM,
      speed: null,
    })),
  };
}

describe("positionAt", () => {
  it("interpolates between frames", () => {
    const t = trk("a", "KC", [
      [0, 50, 24],
      [2, 54, 24],
    ]);
    const p = positionAt(t, 1)!;
    expect(p.xM).toBeCloseTo(52, 6);
    expect(p.yM).toBeCloseTo(24, 6);
  });

  it("clamps outside the tracklet range", () => {
    const t = trk("a", "KC", [
      [1, 50, 24],
      [2, 54, 24],
    ]);
    expect(positionAt(t, 0)!.xM).toBeCloseTo(50, 6);
    expect(positionAt(t, 5)!.xM).toBeCloseTo(54, 6);
    expect(positionAt({ ...t, frames: [] }, 1)).toBeNull();
  });
});

describe("breakAngle", () => {
  it("reads ~90° for a sharp out cut", () => {
    const pts = [
      { downfieldYd: 0, lateralYd: 0 },
      { downfieldYd: 6, lateralYd: 0.2 },
      { downfieldYd: 6.5, lateralYd: 4.5 },
    ];
    const angle = breakAngle(pts, 1)!;
    expect(angle).toBeGreaterThan(75);
    expect(angle).toBeLessThan(105);
  });

  it("returns null without a valid break", () => {
    const pts = [
      { downfieldYd: 0, lateralYd: 0 },
      { downfieldYd: 12, lateralYd: 0.3 },
    ];
    expect(breakAngle(pts, 0)).toBeNull();
    expect(breakAngle(pts, 5)).toBeNull();
  });
});

describe("nearestDefender", () => {
  it("finds the closest opponent in yards", () => {
    const near = trk("d1", "PHI", [[10, 50, 24]]);
    const far = trk("d2", "PHI", [[10, 60, 24]]);
    const nd = nearestDefender({ xM: 52, yM: 24 }, 10, [near, far])!;
    expect(nd.trackletId).toBe("d1");
    expect(nd.distanceYd).toBeCloseTo(2 / 0.9144, 1);
  });

  it("returns null with no defenders", () => {
    expect(nearestDefender({ xM: 52, yM: 24 }, 10, [])).toBeNull();
  });
});

describe("separationMetrics", () => {
  it("computes break angle and separations for an out route", () => {
    // Receiver runs an out; defender trails 2 yards behind at the break.
    const fieldPolyline = [
      { xM: 50, yM: 24, t: 0 },
      { xM: 55.5, yM: 24.2, t: 2 },
      { xM: 56, yM: 28.5, t: 3.5 },
    ];
    const defender = trk("d1", "PHI", [
      [2, 53.7, 24.2], // ~2 yd behind at the break
      [3.5, 54.5, 27.5],
    ]);
    const m = separationMetrics({
      route: {
        trackletId: "wr1",
        route: "out",
        confidence: 0.8,
        breakPoint: null,
        depthYards: 6.5,
        releaseT: 0,
      },
      fieldPolyline,
      breakIdx: 1,
      offenseTeam: "KC",
      allTracklets: [defender],
    });
    expect(m.trackletId).toBe("wr1");
    expect(m.breakAngleDeg).toBeGreaterThan(70);
    expect(m.sepAtBreakYd).toBeCloseTo(2 / 0.9144, 0);
    expect(m.nearestDefenderAtBreak).toBe("d1");
    expect(m.sepAtCatchYd).not.toBeNull();
  });
});
