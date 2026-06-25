import { describe, it, expect } from "vitest";
import {
  benjaminiHochberg,
  meetsCrossNightConfirmation,
  type PValueEntry,
  type NightlyObservation,
} from "../multiple-testing.js";

function entries(pvalues: readonly number[]): PValueEntry[] {
  return pvalues.map((p, i) => ({ key: `h${i}`, pValue: p }));
}

describe("benjaminiHochberg", () => {
  it("returns an empty summary for an empty family", () => {
    const s = benjaminiHochberg([], 0.05);
    expect(s.familySize).toBe(0);
    expect(s.discoveries).toBe(0);
    expect(s.maxPassingRank).toBe(0);
    expect(s.results).toEqual([]);
  });

  it("rejects an invalid q", () => {
    expect(() => benjaminiHochberg(entries([0.01]), 0)).toThrow(RangeError);
    expect(() => benjaminiHochberg(entries([0.01]), 1.5)).toThrow(RangeError);
    expect(() => benjaminiHochberg(entries([0.01]), Number.NaN)).toThrow(RangeError);
  });

  it("rejects p-values outside [0, 1]", () => {
    expect(() => benjaminiHochberg(entries([-0.01]), 0.05)).toThrow(RangeError);
    expect(() => benjaminiHochberg(entries([1.01]), 0.05)).toThrow(RangeError);
    expect(() => benjaminiHochberg(entries([Number.NaN]), 0.05)).toThrow(RangeError);
  });

  it("declares a lone, clearly significant hypothesis a discovery", () => {
    const s = benjaminiHochberg([{ key: "a", pValue: 0.01 }], 0.05);
    expect(s.discoveries).toBe(1);
    expect(s.results[0]!.discovery).toBe(true);
    expect(s.results[0]!.bhThreshold).toBeCloseTo(0.05, 12);
    expect(s.results[0]!.qValue).toBeCloseTo(0.01, 12);
  });

  it("declares nothing when no p-value clears its critical value", () => {
    const s = benjaminiHochberg(entries([0.2, 0.4, 0.6, 0.8]), 0.05);
    expect(s.discoveries).toBe(0);
    expect(s.results.every((r) => r.discovery === false)).toBe(true);
  });

  it("reproduces the canonical Benjamini-Hochberg (1995) example: rejects the first 4 of 15", () => {
    const canonical = [
      0.0001, 0.0004, 0.0019, 0.0095, 0.0201, 0.0278, 0.0298, 0.0344, 0.0459, 0.324,
      0.4262, 0.5719, 0.6528, 0.759, 1.0,
    ];
    const s = benjaminiHochberg(entries(canonical), 0.05);
    expect(s.familySize).toBe(15);
    expect(s.maxPassingRank).toBe(4);
    expect(s.discoveries).toBe(4);
    // ranks 1..4 are discoveries, rank 5 is not
    expect(s.results.slice(0, 4).every((r) => r.discovery)).toBe(true);
    expect(s.results[4]!.discovery).toBe(false);
  });

  it("is a STEP-UP procedure: an early p-value above its own threshold is still a discovery when a later rank passes", () => {
    // m=2, q=0.05 → thresholds 0.025 (rank 1) and 0.05 (rank 2).
    // p1=0.04 exceeds 0.025, but p2=0.045 ≤ 0.05, so BH steps up and rejects BOTH.
    const s = benjaminiHochberg(
      [
        { key: "a", pValue: 0.045 },
        { key: "b", pValue: 0.04 },
      ],
      0.05,
    );
    expect(s.maxPassingRank).toBe(2);
    expect(s.discoveries).toBe(2);
    const byKey = Object.fromEntries(s.results.map((r) => [r.key, r]));
    expect(byKey.b!.rank).toBe(1);
    expect(byKey.b!.pValue).toBe(0.04);
    expect(byKey.b!.discovery).toBe(true); // above its own 0.025 threshold, still rejected
    expect(byKey.a!.rank).toBe(2);
    expect(byKey.a!.discovery).toBe(true);
  });

  it("produces monotone non-decreasing q-values across rank, clamped to ≤ 1", () => {
    const s = benjaminiHochberg(entries([0.001, 0.02, 0.03, 0.9, 1.0]), 0.1);
    for (let i = 1; i < s.results.length; i += 1) {
      expect(s.results[i]!.qValue).toBeGreaterThanOrEqual(s.results[i - 1]!.qValue);
    }
    expect(s.results.every((r) => r.qValue <= 1)).toBe(true);
    expect(s.results.at(-1)!.qValue).toBe(1); // (m/m)*1.0 = 1
  });

  it("orders results by rank and breaks ties deterministically by key", () => {
    const s = benjaminiHochberg(
      [
        { key: "zeta", pValue: 0.02 },
        { key: "alpha", pValue: 0.02 },
      ],
      0.05,
    );
    expect(s.results[0]!.key).toBe("alpha"); // tie broken by key
    expect(s.results[0]!.rank).toBe(1);
    expect(s.results[1]!.key).toBe("zeta");
    expect(s.results[1]!.rank).toBe(2);
  });
});

describe("meetsCrossNightConfirmation", () => {
  const disc = (pValue: number): NightlyObservation => ({ pValue, discovery: true });
  const miss = (pValue: number): NightlyObservation => ({ pValue, discovery: false });

  it("does not confirm an empty history", () => {
    const r = meetsCrossNightConfirmation([]);
    expect(r.confirmed).toBe(false);
    expect(r.consecutiveDiscoveries).toBe(0);
    expect(r.bestStreakPValue).toBe(Number.POSITIVE_INFINITY);
  });

  it("confirms after K consecutive discoveries that clear the Bonferroni-over-nights bar", () => {
    // 3 nights, alpha 0.05 → bar 0.05/3 ≈ 0.0167; best streak p = 0.001 clears it.
    const r = meetsCrossNightConfirmation([disc(0.004), disc(0.002), disc(0.001)]);
    expect(r.nightsTested).toBe(3);
    expect(r.consecutiveDiscoveries).toBe(3);
    expect(r.bonferroniBar).toBeCloseTo(0.05 / 3, 12);
    expect(r.bestStreakPValue).toBe(0.001);
    expect(r.confirmed).toBe(true);
  });

  it("does not confirm with fewer than the required consecutive nights", () => {
    const r = meetsCrossNightConfirmation([disc(0.001), disc(0.001)]);
    expect(r.consecutiveDiscoveries).toBe(2);
    expect(r.confirmed).toBe(false);
  });

  it("counts only the trailing streak — an earlier miss resets the count", () => {
    const r = meetsCrossNightConfirmation([disc(0.001), miss(0.5), disc(0.001), disc(0.001), disc(0.001)]);
    expect(r.consecutiveDiscoveries).toBe(3);
    expect(r.nightsTested).toBe(5);
    // bar = 0.05/5 = 0.01; best streak p = 0.001 clears it → confirmed
    expect(r.confirmed).toBe(true);
  });

  it("withholds confirmation when the streak is long enough but the p-value can't pay the over-nights penalty", () => {
    // 10 nights tested → bar 0.05/10 = 0.005; streak best p = 0.01 fails it.
    const history = Array.from({ length: 10 }, () => disc(0.01));
    const r = meetsCrossNightConfirmation(history);
    expect(r.consecutiveDiscoveries).toBe(10);
    expect(r.bonferroniBar).toBeCloseTo(0.005, 12);
    expect(r.bestStreakPValue).toBe(0.01);
    expect(r.confirmed).toBe(false);
  });

  it("respects a custom requiredConsecutive", () => {
    const r = meetsCrossNightConfirmation([disc(0.001), disc(0.001)], { requiredConsecutive: 2 });
    expect(r.confirmed).toBe(true);
  });

  it("rejects invalid options", () => {
    expect(() => meetsCrossNightConfirmation([], { alphaPromote: 0 })).toThrow(RangeError);
    expect(() => meetsCrossNightConfirmation([], { requiredConsecutive: 0 })).toThrow(RangeError);
  });
});
