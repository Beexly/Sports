import { describe, expect, it } from "vitest";
import {
  blownLeadMonitor,
  ksCritical05,
  ksStatistic,
  loserPeakCdf,
} from "./blown-lead-monitor-2601.js";

// Sample losers' peaks from the theoretical CDF by inversion.
function samplePeaks(p0: number, n: number, seed: number): number[] {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const u = s / 2147483648;
    // invert F(h) = 1 - p0(1-h)/(h(1-p0))  =>  h = p0 / (p0 + (1-u)(1-p0))
    const h = p0 / (p0 + (1 - u) * (1 - p0));
    out.push(Math.min(1, Math.max(p0, h)));
  }
  return out;
}

describe("blown lead monitor", () => {
  it("theoretical CDF is a valid CDF", () => {
    expect(loserPeakCdf(0.2, 0.4)).toBe(0);
    expect(loserPeakCdf(1, 0.4)).toBe(1);
    expect(loserPeakCdf(0.4, 0.4)).toBeCloseTo(0, 9);
    const mid = loserPeakCdf(0.7, 0.4);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(loserPeakCdf(0.8, 0.4)).toBeGreaterThan(mid); // monotone
  });

  it("KS does not reject samples drawn from the law", () => {
    const peaks = samplePeaks(0.4, 500, 7);
    const ks = ksStatistic(peaks, (h) => loserPeakCdf(h, 0.4));
    expect(ks).toBeLessThan(ksCritical05(500));
  });

  it("KS rejects a miscalibrated path distribution", () => {
    // losers that always peak near 99%: paths far too live
    const peaks = new Array(300).fill(0.99);
    const ks = ksStatistic(peaks, (h) => loserPeakCdf(h, 0.4));
    expect(ks).toBeGreaterThan(ksCritical05(300));
  });

  it("monitor adopts on law-consistent data with low overshoot", () => {
    const games: Array<{ pFavorite: number; loserPeakWp: number }> = [];
    for (const p of [0.75, 0.65, 0.55]) {
      for (const peak of samplePeaks(1 - p, 300, Math.round(p * 1000))) {
        games.push({ pFavorite: p, loserPeakWp: Math.min(peak, 0.94) });
      }
    }
    const v = blownLeadMonitor(games);
    expect(v.consistentTiers).toBeGreaterThanOrEqual(2);
    expect(v.overshootOk).toBe(true);
    expect(v.adopt).toBe(true);
  });

  it("monitor rejects when overshoot is rampant", () => {
    const games = Array.from({ length: 100 }, () => ({ pFavorite: 0.75, loserPeakWp: 0.99 }));
    const v = blownLeadMonitor(games);
    expect(v.overshootOk).toBe(false);
    expect(v.adopt).toBe(false);
  });

  it("handles empty input", () => {
    const v = blownLeadMonitor([]);
    expect(v.adopt).toBe(false);
    expect(Number.isNaN(v.overshootShare)).toBe(true);
    expect(Number.isNaN(ksStatistic([], (h) => h))).toBe(true);
    expect(Number.isNaN(loserPeakCdf(0.5, 1.5))).toBe(true);
  });
});
