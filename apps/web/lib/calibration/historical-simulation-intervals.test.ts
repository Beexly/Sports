import { describe, it, expect } from "vitest";
import {
  empiricalQuantile,
  hsQuantiles,
  hsInterval,
  crpsFromSamples,
  crpss,
  selectMethodPerMarket,
} from "@/lib/calibration/historical-simulation-intervals";

// ============================================================
// arXiv 2608.10620 — HS_in post-processing. Additive only.
// ============================================================

describe("HS_in intervals — 2608.10620", () => {
  it("empiricalQuantile interpolates", () => {
    expect(empiricalQuantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
    expect(empiricalQuantile([], 0.5)).toBeNaN();
  });

  it("hsQuantiles shifts residuals onto the point forecast", () => {
    const qs = hsQuantiles(100, [-2, 0, 2], [0.5]);
    expect(qs[0]).toBeCloseTo(100, 10);
  });

  it("hsInterval is the central interval", () => {
    const r = Array.from({ length: 101 }, (_, i) => i - 50);
    const { lo, hi } = hsInterval(200, r, 0.2);
    expect(lo).toBeCloseTo(200 + empiricalQuantile(r, 0.1), 8);
    expect(hi).toBeCloseTo(200 + empiricalQuantile(r, 0.9), 8);
    expect(lo).toBeLessThan(hi);
  });

  it("crpsFromSamples of a degenerate forecast is absolute error", () => {
    expect(crpsFromSamples([45, 45, 45], 48)).toBeCloseTo(3, 10);
    expect(crpsFromSamples([], 48)).toBeNaN();
  });

  it("crpsFromSamples is non-negative", () => {
    expect(crpsFromSamples([40, 45, 50], 47)).toBeGreaterThanOrEqual(0);
  });

  it("crpss is 0 for ties, positive for wins", () => {
    expect(crpss(1, 1)).toBeCloseTo(0, 10);
    expect(crpss(0.9, 1)).toBeCloseTo(0.1, 10);
  });

  it("selectMethodPerMarket applies the 1pp QR threshold", () => {
    const sel = selectMethodPerMarket([
      { market: "spread", crpsHsIn: 1.0, crpsQr: 0.98 }, // 2pp -> qr
      { market: "total", crpsHsIn: 1.0, crpsQr: 0.995 }, // 0.5pp -> hs-in
    ]);
    expect(sel[0]!.method).toBe("qr");
    expect(sel[1]!.method).toBe("hs-in");
  });
});
