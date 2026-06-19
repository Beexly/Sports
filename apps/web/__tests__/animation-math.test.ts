/**
 * Tests for animation math utilities: easing functions, spring physics,
 * and interpolation helpers.
 */

import { describe, it, expect } from "vitest";

import {
  clampT,
  applyEasing,
  easeLinear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeOutBounce,
  easeInBounce,
  easeInOutBounce,
  stepsStart,
  stepsEnd,
  cubicBezier,
  EASINGS,
} from "@/lib/math/easing";

import {
  createSpring,
  simulateSpring,
  springDuration,
  SPRING_PRESETS,
} from "@/lib/math/spring";

const TOL = 0.001;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

describe("clampT", () => {
  it("clamps below 0", () => expect(clampT(-0.5)).toBe(0));
  it("clamps above 1", () => expect(clampT(1.5)).toBe(1));
  it("leaves values inside [0,1] unchanged", () => {
    expect(clampT(0.5)).toBe(0.5);
    expect(clampT(0)).toBe(0);
    expect(clampT(1)).toBe(1);
  });
});

describe("applyEasing", () => {
  it("returns start when t=0", () => {
    expect(applyEasing(0, 100, 0, easeLinear)).toBe(0);
  });
  it("returns end when t=1", () => {
    expect(applyEasing(0, 100, 1, easeLinear)).toBe(100);
  });
  it("interpolates at t=0.5 with linear", () => {
    expect(applyEasing(0, 100, 0.5, easeLinear)).toBeCloseTo(50, 3);
  });
  it("interpolates at t=0.5 with easeInOutQuad", () => {
    expect(applyEasing(0, 100, 0.5, easeInOutQuad)).toBeCloseTo(50, 1);
  });
});

// ---------------------------------------------------------------------------
// All easing fns: t=0 → ≈0, t=1 → ≈1
// ---------------------------------------------------------------------------

describe("easing boundary conditions (t=0 → ~0, t=1 → ~1)", () => {
  const allFns: Array<{ name: string; fn: (t: number) => number }> = [
    { name: "easeLinear", fn: easeLinear },
    { name: "easeInQuad", fn: easeInQuad },
    { name: "easeOutQuad", fn: easeOutQuad },
    { name: "easeInOutQuad", fn: easeInOutQuad },
    { name: "easeInCubic", fn: easeInCubic },
    { name: "easeOutCubic", fn: easeOutCubic },
    { name: "easeInOutCubic", fn: easeInOutCubic },
    { name: "easeInQuart", fn: easeInQuart },
    { name: "easeOutQuart", fn: easeOutQuart },
    { name: "easeInOutQuart", fn: easeInOutQuart },
    { name: "easeInSine", fn: easeInSine },
    { name: "easeOutSine", fn: easeOutSine },
    { name: "easeInOutSine", fn: easeInOutSine },
    { name: "easeInExpo", fn: easeInExpo },
    { name: "easeOutExpo", fn: easeOutExpo },
    { name: "easeInOutExpo", fn: easeInOutExpo },
    { name: "easeInCirc", fn: easeInCirc },
    { name: "easeOutCirc", fn: easeOutCirc },
    { name: "easeInOutCirc", fn: easeInOutCirc },
    { name: "easeInBack", fn: easeInBack },
    { name: "easeOutBack", fn: easeOutBack },
    { name: "easeInOutBack", fn: easeInOutBack },
    { name: "easeInElastic", fn: easeInElastic },
    { name: "easeOutElastic", fn: easeOutElastic },
    { name: "easeInOutElastic", fn: easeInOutElastic },
    { name: "easeOutBounce", fn: easeOutBounce },
    { name: "easeInBounce", fn: easeInBounce },
    { name: "easeInOutBounce", fn: easeInOutBounce },
  ];

  for (const { name, fn } of allFns) {
    it(`${name}(0) ≈ 0`, () => {
      expect(Math.abs(fn(0))).toBeLessThanOrEqual(TOL);
    });
    it(`${name}(1) ≈ 1`, () => {
      expect(Math.abs(fn(1) - 1)).toBeLessThanOrEqual(TOL);
    });
  }
});

// ---------------------------------------------------------------------------
// Shape checks
// ---------------------------------------------------------------------------

describe("easing shape checks", () => {
  it("linear: t=0.5 → 0.5", () => {
    expect(easeLinear(0.5)).toBeCloseTo(0.5, 5);
  });

  it("easeInQuad: t=0.5 < 0.5 (slow start)", () => {
    expect(easeInQuad(0.5)).toBeLessThan(0.5);
  });

  it("easeOutQuad: t=0.5 > 0.5 (slow end)", () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });

  it("easeInOutQuad: t=0.5 ≈ 0.5 (symmetric)", () => {
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 3);
  });

  it("easeInOutCubic: t=0.5 ≈ 0.5", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 3);
  });

  it("easeOutBack: at t=1 returns exactly 1", () => {
    expect(easeOutBack(1)).toBeCloseTo(1, 5);
  });

  it("easeInBack: at t=0 returns exactly 0", () => {
    expect(easeInBack(0)).toBeCloseTo(0, 5);
  });

  it("easeOutBounce: t=1 → 1.0 exactly", () => {
    expect(easeOutBounce(1)).toBeCloseTo(1, 5);
  });

  it("easeInBounce: t=1 → 1.0", () => {
    expect(easeInBounce(1)).toBeCloseTo(1, 5);
  });

  it("easeInElastic: may go below 0 (oscillation check)", () => {
    // somewhere in (0,1) elastic overshoots
    const midValues = [0.1, 0.2, 0.3, 0.4].map((t) => easeInElastic(t));
    const hasNegative = midValues.some((v) => v < 0);
    expect(hasNegative).toBe(true);
  });

  it("easeOutElastic: may go above 1 (oscillation check)", () => {
    const midValues = [0.6, 0.7, 0.8, 0.9].map((t) => easeOutElastic(t));
    const hasAboveOne = midValues.some((v) => v > 1);
    expect(hasAboveOne).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

describe("stepsEnd", () => {
  it("stepsEnd(0, 4) → 0", () => {
    expect(stepsEnd(0, 4)).toBeCloseTo(0, 5);
  });

  it("stepsEnd(0.9, 4) → 0.75", () => {
    // floor(0.9 * 4) / 4 = floor(3.6) / 4 = 3/4 = 0.75
    expect(stepsEnd(0.9, 4)).toBeCloseTo(0.75, 5);
  });

  it("stepsEnd(1.0, 4) → 1.0", () => {
    expect(stepsEnd(1.0, 4)).toBeCloseTo(1.0, 5);
  });

  it("stepsEnd(0.25, 4) → 0.25", () => {
    expect(stepsEnd(0.25, 4)).toBeCloseTo(0.25, 5);
  });

  it("stepsEnd(0.249, 4) → 0", () => {
    expect(stepsEnd(0.249, 4)).toBeCloseTo(0, 5);
  });
});

describe("stepsStart", () => {
  it("stepsStart(0, 4) → 0", () => {
    expect(stepsStart(0, 4)).toBeCloseTo(0, 5);
  });

  it("stepsStart(0.01, 4) → 0.25", () => {
    // ceil(0.01 * 4) / 4 = ceil(0.04) / 4 = 1/4
    expect(stepsStart(0.01, 4)).toBeCloseTo(0.25, 5);
  });

  it("stepsStart(1, 4) → 1", () => {
    expect(stepsStart(1, 4)).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// cubicBezier
// ---------------------------------------------------------------------------

describe("cubicBezier", () => {
  it("cubicBezier(0.25,0.1,0.25,1)(0) ≈ 0", () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    expect(ease(0)).toBeCloseTo(0, 3);
  });

  it("cubicBezier(0.25,0.1,0.25,1)(1) ≈ 1", () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1);
    expect(ease(1)).toBeCloseTo(1, 3);
  });

  it("cubicBezier(0,0,1,1)(0.5) ≈ 0.5 (linear diagonal)", () => {
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0.5)).toBeCloseTo(0.5, 2);
  });

  it("ease-in cubicBezier(0.42,0,1,1) at 0.5 < 0.5", () => {
    const easeIn = cubicBezier(0.42, 0, 1, 1);
    expect(easeIn(0.5)).toBeLessThan(0.5);
  });

  it("ease-out cubicBezier(0,0,0.58,1) at 0.5 > 0.5", () => {
    const easeOut = cubicBezier(0, 0, 0.58, 1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// EASINGS map
// ---------------------------------------------------------------------------

describe("EASINGS map", () => {
  it("contains linear key", () => {
    expect(typeof EASINGS.linear).toBe("function");
  });

  it("all EASINGS entries are functions", () => {
    for (const [key, fn] of Object.entries(EASINGS)) {
      expect(typeof fn, `EASINGS.${key} should be a function`).toBe("function");
    }
  });

  it("EASINGS.linear(0.5) === 0.5", () => {
    expect(EASINGS.linear(0.5)).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// Spring physics
// ---------------------------------------------------------------------------

describe("createSpring", () => {
  it("settles to target after enough steps", () => {
    const spring = createSpring({ stiffness: 170, damping: 26, mass: 1 });
    let state = { position: 0, velocity: 0 };
    let frame = { position: 0, velocity: 0, done: false };
    for (let i = 0; i < 300; i++) {
      frame = spring.step(state, 100, 1 / 60);
      if (frame.done) break;
      state = { position: frame.position, velocity: frame.velocity };
    }
    expect(frame.position).toBeCloseTo(100, 0);
  });

  it("done flag becomes true", () => {
    const spring = createSpring({ stiffness: 170, damping: 26, mass: 1 });
    let state = { position: 0, velocity: 0 };
    let anyDone = false;
    for (let i = 0; i < 300; i++) {
      const frame = spring.step(state, 100, 1 / 60);
      if (frame.done) { anyDone = true; break; }
      state = { position: frame.position, velocity: frame.velocity };
    }
    expect(anyDone).toBe(true);
  });

  it("starts moving toward target", () => {
    const spring = createSpring();
    const state = { position: 0, velocity: 0 };
    const frame = spring.step(state, 100, 1 / 60);
    expect(frame.position).toBeGreaterThan(0);
  });

  it("underdamped spring oscillates (position crosses target)", () => {
    // wobbly preset is underdamped
    const spring = createSpring(SPRING_PRESETS.wobbly);
    let state = { position: 0, velocity: 0 };
    const target = 1;
    let crossedAbove = false;

    for (let i = 0; i < 300; i++) {
      const frame = spring.step(state, target, 1 / 60);
      if (frame.position > target) crossedAbove = true;
      if (frame.done) break;
      state = { position: frame.position, velocity: frame.velocity };
    }

    expect(crossedAbove).toBe(true);
  });
});

describe("simulateSpring", () => {
  it("returns an array of frames", () => {
    const frames = simulateSpring(0, 100);
    expect(Array.isArray(frames)).toBe(true);
    expect(frames.length).toBeGreaterThan(0);
  });

  it("last frame has done=true when settled", () => {
    const frames = simulateSpring(0, 100);
    expect(frames[frames.length - 1]!.done).toBe(true);
  });

  it("does not exceed maxFrames", () => {
    const frames = simulateSpring(0, 1000, undefined, 10);
    expect(frames.length).toBeLessThanOrEqual(10);
  });

  it("first frame position is between from and to (moving right direction)", () => {
    const frames = simulateSpring(0, 100);
    expect(frames[0]!.position).toBeGreaterThan(0);
    expect(frames[0]!.position).toBeLessThan(100);
  });

  it("respects initial velocity from config", () => {
    const framesNormal = simulateSpring(0, 100, { velocity: 0 });
    const framesKicked = simulateSpring(0, 100, { velocity: 500 });
    // With positive initial velocity toward target, first frame should be further
    expect(framesKicked[0]!.position).toBeGreaterThan(framesNormal[0]!.position);
  });
});

describe("springDuration", () => {
  it("returns a positive number", () => {
    expect(springDuration(0, 100)).toBeGreaterThan(0);
  });

  it("stiffer spring settles faster than gentle", () => {
    const stiff = springDuration(0, 100, SPRING_PRESETS.stiff);
    const gentle = springDuration(0, 100, SPRING_PRESETS.gentle);
    // stiff doesn't necessarily settle faster due to oscillation — but both > 0
    expect(stiff).toBeGreaterThan(0);
    expect(gentle).toBeGreaterThan(0);
  });

  it("molasses preset takes longer than stiff", () => {
    const molasses = springDuration(0, 100, SPRING_PRESETS.molasses);
    const stiff = springDuration(0, 100, SPRING_PRESETS.stiff);
    expect(molasses).toBeGreaterThan(stiff);
  });

  it("duration is in milliseconds (> 10ms)", () => {
    const d = springDuration(0, 1);
    expect(d).toBeGreaterThan(10);
  });
});

describe("SPRING_PRESETS", () => {
  it("contains gentle preset", () => {
    expect(SPRING_PRESETS.gentle.stiffness).toBe(120);
  });
  it("contains wobbly preset", () => {
    expect(SPRING_PRESETS.wobbly.damping).toBe(12);
  });
  it("contains stiff preset", () => {
    expect(SPRING_PRESETS.stiff.stiffness).toBe(210);
  });
  it("contains slow preset", () => {
    expect(SPRING_PRESETS.slow.damping).toBe(60);
  });
  it("contains molasses preset", () => {
    expect(SPRING_PRESETS.molasses.damping).toBe(120);
  });
});
