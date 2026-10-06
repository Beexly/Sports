/**
 * Multidata drivers — tests (arXiv 2304.05294v5).
 *
 * ACCEPTANCE GATE: lagged-correlation selection recovers the truly
 * predictive lagged feature; Jaccard is 1 on identical sets and 0 on
 * disjoint ones; stratified union adds cluster interactions; stability
 * averages pairwise Jaccard; the verdict adopts/rejects per the gate.
 */
import { describe, expect, it } from "vitest";
import {
  driverStability,
  driverVerdict,
  jaccard,
  laggedCorrelationSelect,
  stratifiedUnion,
} from "./multidata-drivers";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("laggedCorrelationSelect", () => {
  it("recovers the predictive lagged feature", () => {
    const rand = mulberry32(351);
    const n = 300;
    const driver: number[] = [];
    const noise1: number[] = [];
    const noise2: number[] = [];
    const target: number[] = [];
    for (let t = 0; t < n; t++) {
      driver.push(rand());
      noise1.push(rand());
      noise2.push(rand());
    }
    for (let t = 0; t < n; t++) {
      // Target depends on the driver's value 1 week ago.
      target.push(t === 0 ? rand() : (driver[t - 1] as number) * 2 + (rand() - 0.5) * 0.2);
    }
    const top = laggedCorrelationSelect(
      { epa_driver: driver, noise_a: noise1, noise_b: noise2 },
      target,
      1,
      1,
    );
    expect(top).toEqual(["epa_driver"]);
    expect(() => laggedCorrelationSelect({}, target, 1, 1)).toThrow();
    expect(() => laggedCorrelationSelect({ a: driver }, target, 0, 1)).toThrow();
  });
});

describe("jaccard + driverStability", () => {
  it("measures set overlap", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBeCloseTo(0.5, 12);
    expect(jaccard(new Set(), new Set())).toBe(1);
    const s = driverStability([
      new Set(["a", "b", "c"]),
      new Set(["a", "b", "d"]),
      new Set(["a", "b", "c"]),
    ]);
    // Pairwise: 0.5, 1, 0.5 -> mean 2/3.
    expect(s).toBeCloseTo(2 / 3, 12);
    expect(() => driverStability([new Set(["a"])])).toThrow();
  });
});

describe("stratifiedUnion", () => {
  it("unions drivers with cluster interactions", () => {
    const u = stratifiedUnion({
      "pass-heavy": new Set(["epa_pass", "pace"]),
      "run-heavy": new Set(["epa_run", "pace"]),
    });
    expect(u.has("epa_pass")).toBe(true);
    expect(u.has("pass-heavy:epa_pass")).toBe(true);
    expect(u.has("run-heavy:epa_run")).toBe(true);
    expect(u.has("pace")).toBe(true);
    expect(u.size).toBe(3 + 4); // 3 unique drivers + 4 interactions
  });
});

describe("driverVerdict", () => {
  it("applies the three gate conditions", () => {
    // Adopt: drivers beat all-features with <=50% features, beat the
    // lagged baseline, and are stable.
    expect(driverVerdict(0.20, 0.21, 0.4, 0.23, 0.6)).toBe("adopt");
    // Reject: lagged baseline wins.
    expect(driverVerdict(0.23, 0.21, 0.4, 0.22, 0.6)).toBe("reject");
    // Reject: unstable driver sets.
    expect(driverVerdict(0.20, 0.21, 0.4, 0.23, 0.3)).toBe("reject");
    // Inconclusive: stable but too many features.
    expect(driverVerdict(0.20, 0.21, 0.7, 0.23, 0.6)).toBe("inconclusive");
  });
});
