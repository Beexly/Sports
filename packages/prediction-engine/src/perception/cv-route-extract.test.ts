import { describe, expect, it } from "vitest";
import {
  classifyRoute,
  dtwDistance,
  findBreakPoint,
  resamplePolyline,
  type RouteInput,
} from "./cv-route-extract.js";
import type { OffensePoint } from "./cv-field-model.js";

function input(
  id: string,
  waypoints: readonly (readonly [number, number])[],
): RouteInput {
  const points = waypoints.map(([d, l], i) => ({
    downfieldYd: d,
    lateralYd: l,
    t: i * 0.4,
  }));
  return { trackletId: id, points };
}

const OFF: OffensePoint = { downfieldYd: 0, lateralYd: 0 };

describe("dtwDistance", () => {
  it("is zero for identical polylines and symmetric", () => {
    const a = resamplePolyline([
      { ...OFF, downfieldYd: 0 },
      { ...OFF, downfieldYd: 6, lateralYd: 0.2 },
      { ...OFF, downfieldYd: 6.5, lateralYd: 4.5 },
    ]);
    expect(dtwDistance(a, a)).toBe(0);
    const b = resamplePolyline([
      { ...OFF, downfieldYd: 0 },
      { ...OFF, downfieldYd: 12, lateralYd: 0.3 },
    ]);
    expect(dtwDistance(a, b)).toBeCloseTo(dtwDistance(b, a), 10);
    expect(dtwDistance(a, b)).toBeGreaterThan(0);
  });
});

describe("classifyRoute", () => {
  it("classifies a slant", () => {
    const r = classifyRoute(
      input("wr1", [[0, 0], [2, 0.1], [3.5, 0.2], [5.5, 2], [7, 3.5]]),
    );
    expect(r.route).toBe("slant");
    expect(r.confidence).toBeGreaterThan(0.4);
    expect(r.breakPoint).not.toBeNull();
  });

  it("classifies an out — and not a dig", () => {
    const r = classifyRoute(
      input("wr2", [[0, 0], [3, 0.1], [6, 0.2], [6.4, 2.5], [6.5, 4.5]]),
    );
    expect(r.route).toBe("out");
  });

  it("classifies a dig — the mirror of an out", () => {
    const r = classifyRoute(
      input("wr3", [[0, 0], [3, 0.1], [7, 0.2], [7.4, -2.5], [7.5, -5]]),
    );
    expect(r.route).toBe("dig");
  });

  it("classifies a go with no break point", () => {
    const r = classifyRoute(
      input("wr4", [[0, 0], [4, 0.1], [8, 0.2], [12, 0.3]]),
    );
    expect(r.route).toBe("go");
    expect(r.breakPoint).toBeNull();
    expect(r.depthYards).toBeCloseTo(12, 0);
  });

  it("classifies a post vs a corner", () => {
    const post = classifyRoute(
      input("wr5", [[0, 0], [4, 0.2], [8, 0.3], [11, -2], [13, -4]]),
    );
    expect(post.route).toBe("post");
    const corner = classifyRoute(
      input("wr6", [[0, 0], [4, 0.2], [8, 0.3], [10, 2.5], [12, 4.5]]),
    );
    expect(corner.route).toBe("corner");
  });

  it("returns unknown for degenerate input", () => {
    const r = classifyRoute({ trackletId: "x", points: [] });
    expect(r.route).toBe("unknown");
  });
});

describe("findBreakPoint", () => {
  it("finds the cut on an out route", () => {
    const pts = [
      [0, 0], [2, 0.1], [4, 0.15], [6, 0.2], [6.3, 1.5], [6.5, 3], [6.5, 4.5],
    ].map(([d, l], i) => ({ downfieldYd: d, lateralYd: l, t: i * 0.4 }));
    const bp = findBreakPoint(pts);
    expect(bp).not.toBeNull();
    expect(bp!.downfieldYd).toBeGreaterThan(4);
    expect(bp!.downfieldYd).toBeLessThan(8);
  });
});
