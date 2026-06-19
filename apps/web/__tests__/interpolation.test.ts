import { describe, it, expect } from "vitest";
import {
  lerp,
  inverseLerp,
  clamp,
  remap,
  smoothstep,
  smootherstep,
  linearInterpolate,
  bilinearInterpolate,
  nearestNeighbor,
  stepInterpolate,
  lagrangeInterpolate,
  newtonForwardDifference,
  nevilleInterpolate,
  cubicSplineNatural,
  monotonicCubic,
  catmullRom,
  hermite,
  cosineInterpolate,
  cubicInterpolate,
  quadraticBezier,
  cubicBezier,
  lerpArray,
  slerp,
  interpolateColors,
  resample,
  movingInterpolateFill,
  findBracket,
  type Point,
} from "@/lib/math/interpolation";

const EPS = 1e-9;

describe("lerp", () => {
  it("midpoint of 0 and 10 is 5", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it("t=0 returns a", () => {
    expect(lerp(3, 9, 0)).toBe(3);
  });
  it("t=1 returns b", () => {
    expect(lerp(3, 9, 1)).toBe(9);
  });
  it("quarter point", () => {
    expect(lerp(0, 100, 0.25)).toBe(25);
  });
  it("negative range", () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
  it("extrapolates beyond 1", () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });
  it("extrapolates below 0", () => {
    expect(lerp(0, 10, -1)).toBe(-10);
  });
  it("equal endpoints", () => {
    expect(lerp(5, 5, 0.7)).toBe(5);
  });
});

describe("inverseLerp", () => {
  it("recovers t for midpoint", () => {
    expect(inverseLerp(0, 10, 5)).toBe(0.5);
  });
  it("returns 0 at a", () => {
    expect(inverseLerp(2, 8, 2)).toBe(0);
  });
  it("returns 1 at b", () => {
    expect(inverseLerp(2, 8, 8)).toBe(1);
  });
  it("returns 0 when a === b", () => {
    expect(inverseLerp(5, 5, 5)).toBe(0);
  });
  it("roundtrips with lerp", () => {
    const a = 3;
    const b = 17;
    const t = 0.37;
    const v = lerp(a, b, t);
    expect(inverseLerp(a, b, v)).toBeCloseTo(t, 12);
  });
  it("roundtrips with lerp on negatives", () => {
    const a = -20;
    const b = -5;
    const t = 0.8;
    const v = lerp(a, b, t);
    expect(inverseLerp(a, b, v)).toBeCloseTo(t, 12);
  });
  it("extrapolated value gives t > 1", () => {
    expect(inverseLerp(0, 10, 20)).toBe(2);
  });
});

describe("clamp", () => {
  it("returns value within bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below min", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it("clamps above max", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("returns min at min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });
  it("returns max at max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
  it("handles negative range", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
  });
  it("clamps to negative min", () => {
    expect(clamp(-50, -10, -1)).toBe(-10);
  });
});

describe("remap", () => {
  it("maps midpoint across ranges", () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });
  it("maps min to outMin", () => {
    expect(remap(0, 0, 10, 20, 40)).toBe(20);
  });
  it("maps max to outMax", () => {
    expect(remap(10, 0, 10, 20, 40)).toBe(40);
  });
  it("inverts direction", () => {
    expect(remap(0, 0, 10, 100, 0)).toBe(100);
  });
  it("maps to negative output", () => {
    expect(remap(5, 0, 10, -100, 100)).toBe(0);
  });
  it("handles degenerate input range (returns outMin)", () => {
    expect(remap(5, 5, 5, 10, 20)).toBe(10);
  });
});

describe("smoothstep", () => {
  it("is 0 at edge0", () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
  });
  it("is 1 at edge1", () => {
    expect(smoothstep(0, 1, 1)).toBe(1);
  });
  it("is 0.5 at midpoint", () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 12);
  });
  it("clamps below edge0", () => {
    expect(smoothstep(0, 1, -5)).toBe(0);
  });
  it("clamps above edge1", () => {
    expect(smoothstep(0, 1, 5)).toBe(1);
  });
  it("works on shifted edges", () => {
    expect(smoothstep(10, 20, 15)).toBeCloseTo(0.5, 12);
  });
  it("returns monotonic increasing values", () => {
    const a = smoothstep(0, 1, 0.25);
    const b = smoothstep(0, 1, 0.75);
    expect(b).toBeGreaterThan(a);
  });
  it("handles edge0 === edge1 below", () => {
    expect(smoothstep(5, 5, 4)).toBe(0);
  });
  it("handles edge0 === edge1 at/above", () => {
    expect(smoothstep(5, 5, 5)).toBe(1);
  });
});

describe("smootherstep", () => {
  it("is 0 at edge0", () => {
    expect(smootherstep(0, 1, 0)).toBe(0);
  });
  it("is 1 at edge1", () => {
    expect(smootherstep(0, 1, 1)).toBe(1);
  });
  it("is 0.5 at midpoint", () => {
    expect(smootherstep(0, 1, 0.5)).toBeCloseTo(0.5, 12);
  });
  it("clamps below", () => {
    expect(smootherstep(0, 1, -1)).toBe(0);
  });
  it("clamps above", () => {
    expect(smootherstep(0, 1, 2)).toBe(1);
  });
  it("monotonic", () => {
    expect(smootherstep(0, 1, 0.8)).toBeGreaterThan(smootherstep(0, 1, 0.2));
  });
  it("degenerate edges below", () => {
    expect(smootherstep(3, 3, 2)).toBe(0);
  });
  it("degenerate edges at", () => {
    expect(smootherstep(3, 3, 3)).toBe(1);
  });
});

describe("linearInterpolate", () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 10 },
    { x: 2, y: 20 },
  ];
  it("returns NaN on empty", () => {
    expect(linearInterpolate([], 5)).toBeNaN();
  });
  it("passes through first knot", () => {
    expect(linearInterpolate(pts, 0)).toBe(0);
  });
  it("passes through middle knot", () => {
    expect(linearInterpolate(pts, 1)).toBe(10);
  });
  it("passes through last knot", () => {
    expect(linearInterpolate(pts, 2)).toBe(20);
  });
  it("interpolates between knots", () => {
    expect(linearInterpolate(pts, 0.5)).toBe(5);
  });
  it("interpolates in second segment", () => {
    expect(linearInterpolate(pts, 1.5)).toBe(15);
  });
  it("extrapolates flat below range", () => {
    expect(linearInterpolate(pts, -10)).toBe(0);
  });
  it("extrapolates flat above range", () => {
    expect(linearInterpolate(pts, 100)).toBe(20);
  });
  it("single point returns its y", () => {
    expect(linearInterpolate([{ x: 3, y: 7 }], 100)).toBe(7);
  });
  it("handles non-uniform spacing", () => {
    const p: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 100 },
    ];
    expect(linearInterpolate(p, 3)).toBe(30);
  });
});

describe("bilinearInterpolate", () => {
  it("returns corner q11 at (x1,y1)", () => {
    expect(bilinearInterpolate(1, 2, 3, 4, 0, 1, 0, 1, 0, 0)).toBe(1);
  });
  it("returns corner q22 at (x2,y2)", () => {
    expect(bilinearInterpolate(1, 2, 3, 4, 0, 1, 0, 1, 1, 1)).toBe(4);
  });
  it("returns corner q21 at (x2,y1)", () => {
    expect(bilinearInterpolate(1, 2, 3, 4, 0, 1, 0, 1, 1, 0)).toBe(3);
  });
  it("returns corner q12 at (x1,y2)", () => {
    expect(bilinearInterpolate(1, 2, 3, 4, 0, 1, 0, 1, 0, 1)).toBe(2);
  });
  it("center is the average of all corners", () => {
    expect(
      bilinearInterpolate(0, 0, 10, 10, 0, 1, 0, 1, 0.5, 0.5),
    ).toBeCloseTo(5, 12);
  });
  it("degenerate cell returns q11", () => {
    expect(bilinearInterpolate(7, 1, 1, 1, 2, 2, 3, 3, 2, 3)).toBe(7);
  });
  it("interpolates along x only", () => {
    expect(
      bilinearInterpolate(0, 0, 100, 100, 0, 1, 0, 1, 0.25, 0),
    ).toBeCloseTo(25, 12);
  });
});

describe("nearestNeighbor", () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 10 },
    { x: 2, y: 20 },
  ];
  it("returns NaN on empty", () => {
    expect(nearestNeighbor([], 1)).toBeNaN();
  });
  it("picks the closest point", () => {
    expect(nearestNeighbor(pts, 0.9)).toBe(10);
  });
  it("picks closest near the start", () => {
    expect(nearestNeighbor(pts, 0.4)).toBe(0);
  });
  it("picks closest near the end", () => {
    expect(nearestNeighbor(pts, 1.9)).toBe(20);
  });
  it("clamps below range", () => {
    expect(nearestNeighbor(pts, -100)).toBe(0);
  });
  it("clamps above range", () => {
    expect(nearestNeighbor(pts, 100)).toBe(20);
  });
  it("exact match returns that y", () => {
    expect(nearestNeighbor(pts, 1)).toBe(10);
  });
});

describe("stepInterpolate", () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 10 },
    { x: 2, y: 20 },
  ];
  it("returns NaN on empty", () => {
    expect(stepInterpolate([], 1)).toBeNaN();
  });
  it("holds last value (px <= x)", () => {
    expect(stepInterpolate(pts, 1.5)).toBe(10);
  });
  it("returns value at exact knot", () => {
    expect(stepInterpolate(pts, 1)).toBe(10);
  });
  it("before first point returns first y", () => {
    expect(stepInterpolate(pts, -5)).toBe(0);
  });
  it("after last point holds last y", () => {
    expect(stepInterpolate(pts, 100)).toBe(20);
  });
  it("just below a knot holds previous", () => {
    expect(stepInterpolate(pts, 1.99)).toBe(10);
  });
});

describe("lagrangeInterpolate", () => {
  it("returns NaN on empty", () => {
    expect(lagrangeInterpolate([], 1)).toBeNaN();
  });
  it("recovers a known quadratic y = x^2", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
    ];
    expect(lagrangeInterpolate(pts, 1.5)).toBeCloseTo(2.25, 9);
    expect(lagrangeInterpolate(pts, 4)).toBeCloseTo(16, 9);
  });
  it("passes through all knots", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ];
    for (const p of pts) {
      expect(lagrangeInterpolate(pts, p.x)).toBeCloseTo(p.y, 9);
    }
  });
  it("recovers a linear function", () => {
    const pts: Point[] = [
      { x: 0, y: 1 },
      { x: 2, y: 5 },
    ];
    expect(lagrangeInterpolate(pts, 1)).toBeCloseTo(3, 9);
  });
  it("single point returns its y", () => {
    expect(lagrangeInterpolate([{ x: 5, y: 42 }], 100)).toBe(42);
  });
  it("recovers cubic y = x^3", () => {
    const pts: Point[] = [
      { x: -1, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 8 },
    ];
    expect(lagrangeInterpolate(pts, 1.5)).toBeCloseTo(3.375, 9);
  });
});

describe("newtonForwardDifference", () => {
  it("returns NaN on empty", () => {
    expect(newtonForwardDifference([], 1)).toBeNaN();
  });
  it("single point returns y", () => {
    expect(newtonForwardDifference([{ x: 2, y: 9 }], 5)).toBe(9);
  });
  it("recovers quadratic on equally spaced points", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
    ];
    expect(newtonForwardDifference(pts, 1.5)).toBeCloseTo(2.25, 9);
  });
  it("passes through knots", () => {
    const pts: Point[] = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 7 },
    ];
    expect(newtonForwardDifference(pts, 0)).toBeCloseTo(1, 9);
    expect(newtonForwardDifference(pts, 1)).toBeCloseTo(3, 9);
    expect(newtonForwardDifference(pts, 2)).toBeCloseTo(7, 9);
  });
  it("matches lagrange on same data", () => {
    const pts: Point[] = [
      { x: 0, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 6 },
      { x: 3, y: 11 },
    ];
    expect(newtonForwardDifference(pts, 1.7)).toBeCloseTo(
      lagrangeInterpolate(pts, 1.7),
      9,
    );
  });
  it("recovers a line", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
    ];
    expect(newtonForwardDifference(pts, 0.5)).toBeCloseTo(1, 9);
  });
});

describe("nevilleInterpolate", () => {
  it("returns NaN on empty", () => {
    expect(nevilleInterpolate([], 1)).toBeNaN();
  });
  it("recovers quadratic", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ];
    expect(nevilleInterpolate(pts, 1.5)).toBeCloseTo(2.25, 9);
  });
  it("passes through knots", () => {
    const pts: Point[] = [
      { x: 1, y: 2 },
      { x: 3, y: 8 },
      { x: 5, y: 18 },
    ];
    for (const p of pts) {
      expect(nevilleInterpolate(pts, p.x)).toBeCloseTo(p.y, 9);
    }
  });
  it("matches lagrange", () => {
    const pts: Point[] = [
      { x: 0, y: 1 },
      { x: 2, y: 5 },
      { x: 4, y: 17 },
      { x: 6, y: 37 },
    ];
    expect(nevilleInterpolate(pts, 3)).toBeCloseTo(
      lagrangeInterpolate(pts, 3),
      9,
    );
  });
  it("single point returns y", () => {
    expect(nevilleInterpolate([{ x: 9, y: 11 }], 0)).toBe(11);
  });
});

describe("cubicSplineNatural", () => {
  it("returns NaN evaluator on empty", () => {
    const f = cubicSplineNatural([]);
    expect(f(1)).toBeNaN();
  });
  it("single point returns constant", () => {
    const f = cubicSplineNatural([{ x: 0, y: 5 }]);
    expect(f(100)).toBe(5);
  });
  it("two points behave linearly", () => {
    const f = cubicSplineNatural([
      { x: 0, y: 0 },
      { x: 2, y: 4 },
    ]);
    expect(f(1)).toBeCloseTo(2, 9);
  });
  it("passes through all knots", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
    ];
    const f = cubicSplineNatural(pts);
    for (const p of pts) {
      expect(f(p.x)).toBeCloseTo(p.y, 9);
    }
  });
  it("interpolates between knots smoothly", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
    ];
    const f = cubicSplineNatural(pts);
    const v = f(1.5);
    expect(v).toBeGreaterThan(1);
    expect(v).toBeLessThan(4);
  });
  it("extrapolates flat below range", () => {
    const f = cubicSplineNatural([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ]);
    expect(f(-5)).toBe(0);
  });
  it("extrapolates flat above range", () => {
    const f = cubicSplineNatural([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ]);
    expect(f(50)).toBe(4);
  });
  it("recovers a straight line exactly", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
    ];
    const f = cubicSplineNatural(pts);
    expect(f(1.5)).toBeCloseTo(3, 6);
    expect(f(2.5)).toBeCloseTo(5, 6);
  });
});

describe("monotonicCubic", () => {
  it("returns NaN evaluator on empty", () => {
    expect(monotonicCubic([])(1)).toBeNaN();
  });
  it("single point returns constant", () => {
    expect(monotonicCubic([{ x: 1, y: 8 }])(99)).toBe(8);
  });
  it("two points behave linearly", () => {
    const f = monotonicCubic([
      { x: 0, y: 0 },
      { x: 4, y: 8 },
    ]);
    expect(f(2)).toBeCloseTo(4, 9);
  });
  it("passes through all knots", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 5 },
    ];
    const f = monotonicCubic(pts);
    for (const p of pts) {
      expect(f(p.x)).toBeCloseTo(p.y, 9);
    }
  });
  it("preserves monotonicity (no overshoot) on increasing data", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 10 },
      { x: 4, y: 10 },
    ];
    const f = monotonicCubic(pts);
    // Sample densely; values must remain within [0, 10].
    for (let i = 0; i <= 40; i++) {
      const x = i / 10;
      const v = f(x);
      expect(v).toBeGreaterThanOrEqual(-EPS);
      expect(v).toBeLessThanOrEqual(10 + EPS);
    }
  });
  it("is non-decreasing on monotone increasing data", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 10 },
    ];
    const f = monotonicCubic(pts);
    let prev = f(0);
    for (let i = 1; i <= 30; i++) {
      const v = f((i / 30) * 3);
      expect(v).toBeGreaterThanOrEqual(prev - EPS);
      prev = v;
    }
  });
  it("extrapolates flat outside range", () => {
    const f = monotonicCubic([
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
    ]);
    expect(f(-1)).toBe(1);
    expect(f(10)).toBe(3);
  });
});

describe("catmullRom", () => {
  it("t=0 returns p1", () => {
    expect(catmullRom(0, 1, 2, 3, 0)).toBeCloseTo(1, 12);
  });
  it("t=1 returns p2", () => {
    expect(catmullRom(0, 1, 2, 3, 1)).toBeCloseTo(2, 12);
  });
  it("midpoint of a straight line", () => {
    expect(catmullRom(0, 1, 2, 3, 0.5)).toBeCloseTo(1.5, 12);
  });
  it("symmetric data interpolates between p1 and p2", () => {
    const v = catmullRom(0, 0, 4, 4, 0.5);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(4);
  });
  it("constant control points yield the constant", () => {
    expect(catmullRom(5, 5, 5, 5, 0.3)).toBeCloseTo(5, 12);
  });
});

describe("hermite", () => {
  it("t=0 returns p0", () => {
    expect(hermite(1, 5, 2, 3, 0)).toBeCloseTo(1, 12);
  });
  it("t=1 returns p1", () => {
    expect(hermite(1, 5, 2, 3, 1)).toBeCloseTo(5, 12);
  });
  it("zero tangents give smoothstep-like curve at midpoint", () => {
    expect(hermite(0, 10, 0, 0, 0.5)).toBeCloseTo(5, 12);
  });
  it("matches a line with matching tangents", () => {
    // line y = x from 0 to 1, slope 1
    expect(hermite(0, 1, 1, 1, 0.5)).toBeCloseTo(0.5, 12);
  });
  it("constant endpoints with zero tangents stay constant", () => {
    expect(hermite(3, 3, 0, 0, 0.7)).toBeCloseTo(3, 12);
  });
});

describe("cosineInterpolate", () => {
  it("t=0 returns a", () => {
    expect(cosineInterpolate(2, 8, 0)).toBeCloseTo(2, 12);
  });
  it("t=1 returns b", () => {
    expect(cosineInterpolate(2, 8, 1)).toBeCloseTo(8, 12);
  });
  it("midpoint equals linear midpoint", () => {
    expect(cosineInterpolate(0, 10, 0.5)).toBeCloseTo(5, 12);
  });
  it("eases near the start (below linear for rising curve early)", () => {
    const v = cosineInterpolate(0, 10, 0.25);
    expect(v).toBeLessThan(2.5);
  });
  it("eases near the end", () => {
    const v = cosineInterpolate(0, 10, 0.75);
    expect(v).toBeGreaterThan(7.5);
  });
});

describe("cubicInterpolate", () => {
  it("t=0 returns y1", () => {
    expect(cubicInterpolate(0, 1, 2, 3, 0)).toBeCloseTo(1, 12);
  });
  it("t=1 returns y2", () => {
    expect(cubicInterpolate(0, 1, 2, 3, 1)).toBeCloseTo(2, 12);
  });
  it("midpoint of linear data", () => {
    expect(cubicInterpolate(0, 1, 2, 3, 0.5)).toBeCloseTo(1.5, 12);
  });
  it("constant data stays constant", () => {
    expect(cubicInterpolate(4, 4, 4, 4, 0.6)).toBeCloseTo(4, 12);
  });
  it("matches catmullRom formulation at midpoint", () => {
    expect(cubicInterpolate(0, 1, 4, 9, 0.5)).toBeCloseTo(
      catmullRom(0, 1, 4, 9, 0.5),
      9,
    );
  });
});

describe("quadraticBezier", () => {
  it("t=0 returns p0", () => {
    expect(quadraticBezier(0, 5, 10, 0)).toBeCloseTo(0, 12);
  });
  it("t=1 returns p2", () => {
    expect(quadraticBezier(0, 5, 10, 1)).toBeCloseTo(10, 12);
  });
  it("midpoint formula", () => {
    // 0.25*p0 + 0.5*p1 + 0.25*p2
    expect(quadraticBezier(0, 10, 0, 0.5)).toBeCloseTo(5, 12);
  });
  it("straight line collinear control point", () => {
    expect(quadraticBezier(0, 5, 10, 0.5)).toBeCloseTo(5, 12);
  });
  it("stays within hull bounds for convex control", () => {
    const v = quadraticBezier(0, 10, 0, 0.25);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(10);
  });
});

describe("cubicBezier", () => {
  it("t=0 returns p0", () => {
    expect(cubicBezier(0, 3, 6, 9, 0)).toBeCloseTo(0, 12);
  });
  it("t=1 returns p3", () => {
    expect(cubicBezier(0, 3, 6, 9, 1)).toBeCloseTo(9, 12);
  });
  it("straight line of collinear points", () => {
    expect(cubicBezier(0, 3, 6, 9, 0.5)).toBeCloseTo(4.5, 12);
  });
  it("midpoint of symmetric S-curve", () => {
    // p0=0,p1=0,p2=1,p3=1 -> at 0.5 should be 0.5
    expect(cubicBezier(0, 0, 1, 1, 0.5)).toBeCloseTo(0.5, 12);
  });
  it("constant points stay constant", () => {
    expect(cubicBezier(7, 7, 7, 7, 0.4)).toBeCloseTo(7, 12);
  });
});

describe("lerpArray", () => {
  it("element-wise interpolation at midpoint", () => {
    expect(lerpArray([0, 0, 0], [10, 20, 30], 0.5)).toEqual([5, 10, 15]);
  });
  it("t=0 returns first vector", () => {
    expect(lerpArray([1, 2], [3, 4], 0)).toEqual([1, 2]);
  });
  it("t=1 returns second vector", () => {
    expect(lerpArray([1, 2], [3, 4], 1)).toEqual([3, 4]);
  });
  it("throws on mismatched lengths", () => {
    expect(() => lerpArray([1, 2], [1, 2, 3], 0.5)).toThrow();
  });
  it("handles empty arrays", () => {
    expect(lerpArray([], [], 0.5)).toEqual([]);
  });
  it("extrapolates element-wise", () => {
    expect(lerpArray([0, 0], [10, 10], 2)).toEqual([20, 20]);
  });
});

describe("slerp", () => {
  it("t=0 returns a", () => {
    expect(slerp(0, Math.PI / 2, 0)).toBeCloseTo(0, 12);
  });
  it("t=1 returns b", () => {
    expect(slerp(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2, 12);
  });
  it("midpoint of small arc", () => {
    expect(slerp(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 12);
  });
  it("takes the shortest path across the 0/2PI wrap", () => {
    // from 0.1 rad to (2PI - 0.1) rad, shortest path goes backwards through 0
    const a = 0.1;
    const b = 2 * Math.PI - 0.1;
    const mid = slerp(a, b, 0.5);
    // midpoint should be ~0 (or 2PI), i.e. small absolute value near 0
    const normalized = ((mid % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const distToZero = Math.min(normalized, 2 * Math.PI - normalized);
    expect(distToZero).toBeCloseTo(0, 9);
  });
  it("interpolates negative direction shortest path", () => {
    const a = 0;
    const b = (3 * Math.PI) / 2; // 270 deg; shortest is -90 deg
    const mid = slerp(a, b, 0.5);
    expect(mid).toBeCloseTo(-Math.PI / 4, 9);
  });
});

describe("interpolateColors", () => {
  it("t=0 returns first color", () => {
    expect(interpolateColors([0, 0, 0], [255, 255, 255], 0)).toEqual([
      0, 0, 0,
    ]);
  });
  it("t=1 returns second color", () => {
    expect(interpolateColors([0, 0, 0], [255, 255, 255], 1)).toEqual([
      255, 255, 255,
    ]);
  });
  it("midpoint is gray", () => {
    expect(interpolateColors([0, 0, 0], [255, 255, 255], 0.5)).toEqual([
      127.5, 127.5, 127.5,
    ]);
  });
  it("interpolates channels independently", () => {
    expect(interpolateColors([255, 0, 0], [0, 0, 255], 0.5)).toEqual([
      127.5, 0, 127.5,
    ]);
  });
  it("returns a tuple of length 3", () => {
    const c = interpolateColors([10, 20, 30], [40, 50, 60], 0.5);
    expect(c).toHaveLength(3);
    expect(c).toEqual([25, 35, 45]);
  });
});

describe("resample", () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 100 },
  ];
  it("returns empty with fewer than 2 points", () => {
    expect(resample([{ x: 0, y: 0 }], 5)).toEqual([]);
  });
  it("returns empty with count <= 0", () => {
    expect(resample(pts, 0)).toEqual([]);
  });
  it("returns empty with negative count", () => {
    expect(resample(pts, -3)).toEqual([]);
  });
  it("produces the requested count of samples", () => {
    expect(resample(pts, 11)).toHaveLength(11);
  });
  it("endpoints match the data range", () => {
    const out = resample(pts, 5);
    expect(out[0]?.x).toBeCloseTo(0, 12);
    expect(out[0]?.y).toBeCloseTo(0, 12);
    expect(out[4]?.x).toBeCloseTo(10, 12);
    expect(out[4]?.y).toBeCloseTo(100, 12);
  });
  it("evenly spaces x values", () => {
    const out = resample(pts, 3);
    expect(out[1]?.x).toBeCloseTo(5, 12);
    expect(out[1]?.y).toBeCloseTo(50, 12);
  });
  it("count of 1 returns a single start sample", () => {
    const out = resample(pts, 1);
    expect(out).toHaveLength(1);
    expect(out[0]?.x).toBeCloseTo(0, 12);
  });
  it("works across multiple segments", () => {
    const p: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ];
    const out = resample(p, 5);
    expect(out).toHaveLength(5);
    expect(out[2]?.y).toBeCloseTo(10, 9);
  });
});

describe("movingInterpolateFill", () => {
  it("returns empty for empty input", () => {
    expect(movingInterpolateFill([])).toEqual([]);
  });
  it("returns zeros when all values are null", () => {
    expect(movingInterpolateFill([null, null, null])).toEqual([0, 0, 0]);
  });
  it("leaves a fully-known series unchanged", () => {
    expect(movingInterpolateFill([1, 2, 3])).toEqual([1, 2, 3]);
  });
  it("fills a single null between neighbors", () => {
    expect(movingInterpolateFill([0, null, 10])).toEqual([0, 5, 10]);
  });
  it("fills multiple consecutive nulls linearly", () => {
    expect(movingInterpolateFill([0, null, null, 30])).toEqual([
      0, 10, 20, 30,
    ]);
  });
  it("flat-extrapolates leading nulls", () => {
    expect(movingInterpolateFill([null, null, 5, 7])).toEqual([5, 5, 5, 7]);
  });
  it("flat-extrapolates trailing nulls", () => {
    expect(movingInterpolateFill([5, 7, null, null])).toEqual([5, 7, 7, 7]);
  });
  it("handles both ends and interior gaps", () => {
    expect(movingInterpolateFill([null, 0, null, 4, null])).toEqual([
      0, 0, 2, 4, 4,
    ]);
  });
  it("single known value spreads flat", () => {
    expect(movingInterpolateFill([null, 9, null])).toEqual([9, 9, 9]);
  });
});

describe("findBracket", () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 10 },
    { x: 2, y: 20 },
  ];
  it("returns null with fewer than 2 points", () => {
    expect(findBracket([{ x: 0, y: 0 }], 0)).toBeNull();
  });
  it("returns null below range", () => {
    expect(findBracket(pts, -1)).toBeNull();
  });
  it("returns null above range", () => {
    expect(findBracket(pts, 5)).toBeNull();
  });
  it("brackets a value in the first segment", () => {
    expect(findBracket(pts, 0.5)).toEqual({ lower: 0, upper: 1 });
  });
  it("brackets a value in the second segment", () => {
    expect(findBracket(pts, 1.5)).toEqual({ lower: 1, upper: 2 });
  });
  it("brackets at the lower boundary", () => {
    expect(findBracket(pts, 0)).toEqual({ lower: 0, upper: 1 });
  });
  it("brackets at the upper boundary", () => {
    const result = findBracket(pts, 2);
    expect(result).not.toBeNull();
    expect(result?.upper).toBe(2);
  });
  it("brackets exactly at an interior knot", () => {
    const result = findBracket(pts, 1);
    expect(result).not.toBeNull();
    // x === 1 falls on the boundary of the first segment
    expect(result?.lower).toBe(0);
  });
});

describe("empty / degenerate inputs", () => {
  it("linearInterpolate empty -> NaN", () => {
    expect(linearInterpolate([], 0)).toBeNaN();
  });
  it("nearestNeighbor empty -> NaN", () => {
    expect(nearestNeighbor([], 0)).toBeNaN();
  });
  it("stepInterpolate empty -> NaN", () => {
    expect(stepInterpolate([], 0)).toBeNaN();
  });
  it("lagrangeInterpolate empty -> NaN", () => {
    expect(lagrangeInterpolate([], 0)).toBeNaN();
  });
  it("newtonForwardDifference empty -> NaN", () => {
    expect(newtonForwardDifference([], 0)).toBeNaN();
  });
  it("nevilleInterpolate empty -> NaN", () => {
    expect(nevilleInterpolate([], 0)).toBeNaN();
  });
  it("cubicSplineNatural empty -> NaN evaluator", () => {
    expect(cubicSplineNatural([])(0)).toBeNaN();
  });
  it("monotonicCubic empty -> NaN evaluator", () => {
    expect(monotonicCubic([])(0)).toBeNaN();
  });
  it("resample empty -> []", () => {
    expect(resample([], 5)).toEqual([]);
  });
  it("findBracket empty -> null", () => {
    expect(findBracket([], 0)).toBeNull();
  });
});

describe("cross-checks between methods", () => {
  it("linearInterpolate and lerp agree on a single segment", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 10 },
    ];
    expect(linearInterpolate(pts, 0.3)).toBeCloseTo(lerp(0, 10, 0.3), 12);
  });
  it("lagrange, neville and newton agree on shared polynomial data", () => {
    const pts: Point[] = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
      { x: 3, y: 10 },
    ];
    const x = 1.4;
    const a = lagrangeInterpolate(pts, x);
    const b = nevilleInterpolate(pts, x);
    const c = newtonForwardDifference(pts, x);
    expect(b).toBeCloseTo(a, 8);
    expect(c).toBeCloseTo(a, 8);
  });
  it("natural spline through linear data matches linear interp", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 10 },
      { x: 3, y: 15 },
    ];
    const f = cubicSplineNatural(pts);
    expect(f(1.3)).toBeCloseTo(linearInterpolate(pts, 1.3), 6);
  });
  it("catmullRom and hermite agree for the equivalent tangents", () => {
    // Catmull-Rom uses tangents m1=(p2-p0)/2, m2=(p3-p1)/2.
    const p0 = 0;
    const p1 = 1;
    const p2 = 3;
    const p3 = 6;
    const m0 = (p2 - p0) / 2;
    const m1 = (p3 - p1) / 2;
    const t = 0.4;
    expect(catmullRom(p0, p1, p2, p3, t)).toBeCloseTo(
      hermite(p1, p2, m0, m1, t),
      9,
    );
  });
});
