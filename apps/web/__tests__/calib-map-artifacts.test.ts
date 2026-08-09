import { describe, expect, it } from "vitest";
import { fitTemperature, temperaturePredict } from "@/lib/calibration/temperature-map";
import { fitPlattIrlS, plattPredict } from "@/lib/calibration/platt-map-artifact";
import { fitPavaMap, blockWilsonIntervals, pavaMapPredict } from "@/lib/calibration/pava-map-fit";
import { bootstrapCalibrationBand } from "@/lib/calibration/bootstrap-calib-ci";

describe("temperature map", () => {
  it("fits finite T and predicts in (0,1)", () => {
    const samples = Array.from({ length: 40 }, (_, i) => ({
      logit: (i - 20) * 0.1,
      outcome: (i > 20 ? 1 : 0) as 0 | 1,
    }));
    const map = fitTemperature(samples);
    expect(map.T).toBeGreaterThanOrEqual(0.5);
    expect(map.T).toBeLessThanOrEqual(5);
    expect(temperaturePredict(0, map.T)).toBeCloseTo(0.5, 2);
  });
});

describe("platt map artifact", () => {
  it("IRLS MAP returns finite A,B", () => {
    const samples = Array.from({ length: 50 }, (_, i) => ({
      score: (i - 25) * 0.08,
      outcome: (i > 25 ? 1 : 0) as 0 | 1,
    }));
    const map = fitPlattIrlS(samples);
    expect(Number.isFinite(map.A)).toBe(true);
    expect(plattPredict(0, map)).toBeGreaterThan(0);
  });
});

describe("pava map + wilson", () => {
  it("builds blocks and intervals", () => {
    const pairs = Array.from({ length: 80 }, (_, i) => ({
      score: 0.1 + (0.8 * i) / 79,
      outcome: (i > 40 ? 1 : 0) as 0 | 1,
    }));
    const { map, fitted } = fitPavaMap(pairs);
    expect(map.blocks.length).toBeGreaterThan(0);
    expect(fitted.length).toBe(80);
    const iv = blockWilsonIntervals(map);
    expect(iv[0]!.lower).toBeLessThanOrEqual(iv[0]!.upper);
    expect(pavaMapPredict(0.5, map)).toBeGreaterThan(0);
  });
});

describe("bootstrap band", () => {
  it("returns grid CI note internal-only", () => {
    const train = Array.from({ length: 60 }, (_, i) => ({
      score: 0.2 + (0.6 * i) / 59,
      outcome: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    }));
    const band = bootstrapCalibrationBand(train, { B: 20, method: "isotonic_pava" });
    expect(band.lower.length).toBe(band.scoreGrid.length);
    expect(band.note).toMatch(/Internal/);
  });
});
