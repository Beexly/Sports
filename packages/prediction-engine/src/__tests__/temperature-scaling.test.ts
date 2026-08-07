import { describe, expect, it } from "vitest";
import { applyTemperature, fitTemperature } from "../temperature-scaling.js";

describe("applyTemperature", () => {
  it("T=1 leaves probability unchanged (within clamp)", () => {
    expect(applyTemperature(0.8, 1)).toBeCloseTo(0.8, 5);
    expect(applyTemperature(0.2, 1)).toBeCloseTo(0.2, 5);
  });

  it("T>1 softens extremes", () => {
    const soft = applyTemperature(0.9, 2);
    expect(soft).toBeLessThan(0.9);
    expect(soft).toBeGreaterThan(0.5);
  });
});

describe("fitTemperature", () => {
  it("returns null on empty or single-class samples", () => {
    expect(fitTemperature([])).toBeNull();
    expect(fitTemperature([{ p: 0.9, y: 1 }, { p: 0.8, y: 1 }])).toBeNull();
  });

  it("fits T>1 when overconfident forecasts miss often", () => {
    // Stated high confidence but ~50% outcomes → needs softening
    const samples = Array.from({ length: 40 }, (_, i) => ({
      p: 0.9,
      y: (i % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    const model = fitTemperature(samples);
    expect(model).not.toBeNull();
    expect(model!.T).toBeGreaterThan(1);
    const cal = model!.predict(0.9);
    expect(cal).toBeLessThan(0.9);
  });
});
