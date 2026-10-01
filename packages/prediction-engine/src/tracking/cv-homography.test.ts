import { describe, expect, it } from "vitest";
import {
  fitHomographyDLT,
  projectPoint,
  type Correspondence,
} from "./cv-homography.js";
import type { Homography } from "./cv-movement-primitive.js";

function project(p: { x: number; y: number }, h: Homography): { x: number; y: number } {
  const denom = h.h31 * p.x + h.h32 * p.y + h.h33;
  return {
    x: (h.h11 * p.x + h.h12 * p.y + h.h13) / denom,
    y: (h.h21 * p.x + h.h22 * p.y + h.h23) / denom,
  };
}

describe("cv-homography (DLT)", () => {
  it("recovers a known projective transform: reprojection error ≈ 0", () => {
    // A genuine perspective map (nonzero h31/h32 — the case the
    // bounding-box approximation cannot represent).
    const truth: Homography = {
      h11: 1.2, h12: 0.3, h13: 10,
      h21: -0.2, h22: 0.9, h23: -5,
      h31: 0.001, h32: -0.002, h33: 1,
    };
    const src = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 60 },
      { x: 0, y: 60 },
      { x: 50, y: 30 },
      { x: 25, y: 45 },
    ];
    const corr: Correspondence[] = src.map((p) => {
      const q = project(p, truth);
      return { xPx: p.x, yPx: p.y, xM: q.x, yM: q.y };
    });

    const fitted = fitHomographyDLT(corr);
    for (const c of corr) {
      const q = projectPoint({ xPx: c.xPx, yPx: c.yPx }, fitted);
      expect(q.xM).toBeCloseTo(c.xM, 6);
      expect(q.yM).toBeCloseTo(c.yM, 6);
    }
  });

  it("fits an axis-aligned scale exactly (sanity)", () => {
    const corr: Correspondence[] = [
      { xPx: 0, yPx: 0, xM: 0, yM: 0 },
      { xPx: 100, yPx: 0, xM: 10, yM: 0 },
      { xPx: 0, yPx: 50, xM: 0, yM: 5 },
      { xPx: 100, yPx: 50, xM: 10, yM: 5 },
    ];
    const fitted = fitHomographyDLT(corr);
    const q = projectPoint({ xPx: 50, yPx: 25 }, fitted);
    expect(q.xM).toBeCloseTo(5, 9);
    expect(q.yM).toBeCloseTo(2.5, 9);
  });

  it("throws on fewer than 4 correspondences instead of silently returning identity", () => {
    const corr: Correspondence[] = [
      { xPx: 0, yPx: 0, xM: 0, yM: 0 },
      { xPx: 100, yPx: 0, xM: 10, yM: 0 },
      { xPx: 0, yPx: 50, xM: 0, yM: 5 },
    ];
    expect(() => fitHomographyDLT(corr)).toThrow(/at least 4/);
  });
});
