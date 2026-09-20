import { describe, it, expect } from "vitest";
import {
  detectSteam,
  filterOddsTrajectoryCausal,
  smoothOddsTrajectoryRetrospective,
  type OddsSample,
} from "../market/steam-curvature.js";

const MINUTE = 60_000;

function series(prices: readonly number[], stepMs = MINUTE): OddsSample[] {
  return prices.map((price, i) => ({ atMs: 1_700_000_000_000 + i * stepMs, price }));
}

/** Flat, then a sharp jump, then flat again: the textbook steam shape. */
function steamShape(): OddsSample[] {
  return series([
    0.500, 0.501, 0.499, 0.500, 0.501, 0.500, 0.499, 0.500,
    0.530, 0.558, 0.560, 0.561, 0.560, 0.559, 0.560, 0.561,
    0.560, 0.559, 0.560, 0.560,
  ]);
}

describe("causal vs retrospective: the leakage boundary", () => {
  it("the causal filter's estimate at k does NOT move when a LATER sample changes", () => {
    // This is the whole point of having two modes. A live detector may only
    // use information that existed at decision time.
    const base = steamShape();
    const tampered = base.map((s, i) => (i >= 15 ? { ...s, price: s.price + 0.2 } : s));

    const a = filterOddsTrajectoryCausal(base)!;
    const b = filterOddsTrajectoryCausal(tampered)!;

    for (let k = 0; k < 15; k += 1) {
      expect(b[k]!.position).toBeCloseTo(a[k]!.position, 12);
      expect(b[k]!.velocity).toBeCloseTo(a[k]!.velocity, 12);
      expect(b[k]!.acceleration).toBeCloseTo(a[k]!.acceleration, 12);
    }
  });

  it("the retrospective smoother's estimate at k DOES move when a later sample changes", () => {
    // Not a bug: it is what a smoother is for. It is also precisely why it can
    // never drive a live alert, and why this test exists to keep the two apart.
    const base = steamShape();
    const tampered = base.map((s, i) => (i >= 15 ? { ...s, price: s.price + 0.2 } : s));

    const a = smoothOddsTrajectoryRetrospective(base)!;
    const b = smoothOddsTrajectoryRetrospective(tampered)!;

    const movedEarly = [5, 8, 10, 12].some((k) => Math.abs(b[k]!.position - a[k]!.position) > 1e-6);
    expect(movedEarly).toBe(true);
  });

  it("refuses a missing or unknown mode instead of defaulting to one", () => {
    const s = steamShape();
    // A forgotten mode must never silently resolve to the leaking estimator.
    type Opts = Parameters<typeof detectSteam>[1];
    expect(
      detectSteam(s, { mode: "nope", decelerationWindow: 3, decelerationRatio: 0.5 } as unknown as Opts),
    ).toBeNull();
    expect(detectSteam(s, {} as unknown as Opts)).toBeNull();
  });

  it("stamps every result with the mode that produced it", () => {
    const s = steamShape();
    expect(detectSteam(s, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 })?.mode).toBe("causal");
    expect(detectSteam(s, { mode: "retrospective", decelerationWindow: 3, decelerationRatio: 0.5 })?.mode).toBe("retrospective");
  });
});

describe("steam shape detection", () => {
  it("localises the jump by normalised |acceleration|, where curvature does NOT", () => {
    // The measured correction to the source method, pinned. Curvature divides
    // by (1 + v^2)^{3/2}, so it suppresses the fast segment and peaks in the
    // flat tail instead. If someone switches the statistic back to curvature,
    // this test fails and says why.
    const d = detectSteam(steamShape(), { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 })!;
    const accelPeak = d.trajectory.reduce(
      (best, p, i, arr) => (p.accelerationNormalised > arr[best]!.accelerationNormalised ? i : best),
      0,
    );
    // The jump occupies indices 8-10.
    expect(accelPeak).toBeGreaterThanOrEqual(8);
    expect(accelPeak).toBeLessThanOrEqual(11);
    // Curvature points somewhere else entirely, in the settled tail.
    expect(d.maxCurvatureIndex).toBeGreaterThan(accelPeak + 3);
  });

  it("requires both thresholds, because neither has a validated default", () => {
    const s = steamShape();
    expect(
      detectSteam(s, { mode: "causal" } as unknown as Parameters<typeof detectSteam>[1]),
    ).toBeNull();
    expect(
      detectSteam(s, { mode: "causal", decelerationWindow: 3 } as unknown as Parameters<typeof detectSteam>[1]),
    ).toBeNull();
  });

  it("does NOT fire on a line that simply trends fast without stalling", () => {
    // A steady climb has velocity but no deceleration. Calling that steam is
    // the false positive the whole deceleration test exists to prevent.
    const trend = series(Array.from({ length: 20 }, (_, i) => 0.5 + i * 0.004));
    const d = detectSteam(trend, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 });
    expect(d).not.toBeNull();
    expect(d!.detected).toBe(false);
  });

  it("reports no_movement on a perfectly flat line rather than erroring", () => {
    const flat = series(Array.from({ length: 20 }, () => 0.5));
    const d = detectSteam(flat, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 });
    expect(d).not.toBeNull();
    expect(d!.detected).toBe(false);
    expect(d!.reason).toBe("no_braking_observed");
    expect(d!.peakBraking).toBe(0);
  });

  it("withholds a verdict on a line still accelerating at the final sample", () => {
    // Late jump: the line never slows inside the observed window, so there is
    // no braking event to anchor a verdict on. Reporting steam here would be
    // a guess about what happens after the data ends.
    const late = series([
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      0.5, 0.5, 0.53, 0.56,
    ]);
    const d = detectSteam(late, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 });
    expect(d).not.toBeNull();
    expect(d!.detected).toBe(false);
    expect(d!.reason).toBe("no_braking_observed");
  });
});

describe("malformed input is refused, never smoothed over", () => {
  it("returns null for non-increasing timestamps", () => {
    const bad: OddsSample[] = [
      { atMs: 1000, price: 0.5 },
      { atMs: 900, price: 0.51 },
      { atMs: 2000, price: 0.52 },
      { atMs: 3000, price: 0.53 },
      { atMs: 4000, price: 0.54 },
      { atMs: 5000, price: 0.55 },
      { atMs: 6000, price: 0.56 },
      { atMs: 7000, price: 0.57 },
    ];
    expect(detectSteam(bad, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 })).toBeNull();
    expect(filterOddsTrajectoryCausal(bad)).toBeNull();
    expect(smoothOddsTrajectoryRetrospective(bad)).toBeNull();
  });

  it("returns null for non-finite values and for too-short series", () => {
    const nan = series([0.5, 0.5, Number.NaN, 0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(detectSteam(nan, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 })).toBeNull();
    expect(detectSteam(series([0.5, 0.5, 0.5]), { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 })).toBeNull();
    expect(filterOddsTrajectoryCausal(series([0.5, 0.5]))).toBeNull();
  });
});

describe("smoothing before differentiating is not optional", () => {
  it("suppresses the curvature that raw second differences would invent from noise", () => {
    // A flat line with small alternating jitter. Differentiating it raw gives
    // large spurious second differences; that is the false-positive engine the
    // smoother exists to shut off.
    const jittered = series(
      Array.from({ length: 24 }, (_, i) => 0.5 + (i % 2 === 0 ? 0.002 : -0.002)),
    );
    const prices = jittered.map((s) => s.price);
    let rawMaxSecondDiff = 0;
    for (let i = 2; i < prices.length; i += 1) {
      const d2 = Math.abs((prices[i] as number) - 2 * (prices[i - 1] as number) + (prices[i - 2] as number));
      if (d2 > rawMaxSecondDiff) rawMaxSecondDiff = d2;
    }
    // Raw second differences per second, to compare like with like.
    const dtSec = MINUTE / 1000;
    const rawAccel = rawMaxSecondDiff / (dtSec * dtSec);

    const filtered = filterOddsTrajectoryCausal(jittered)!;
    const smoothedMaxAccel = Math.max(...filtered.map((p) => Math.abs(p.acceleration)));

    expect(smoothedMaxAccel).toBeLessThan(rawAccel);
    // And the detector does not call pure jitter a steam move.
    expect(detectSteam(jittered, { mode: "causal", decelerationWindow: 3, decelerationRatio: 0.5 })!.detected).toBe(false);
  });
});
