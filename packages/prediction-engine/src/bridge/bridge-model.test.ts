import { describe, expect, it } from "vitest";
import { BRIDGE_FEATURES, fitBridge, MIN_FIT_ROWS, predictBridge, type BridgeFeature } from "./bridge-model.js";

function row(i: number, homeWin: boolean) {
  const features = {} as Record<BridgeFeature, number>;
  BRIDGE_FEATURES.forEach((feature, index) => {
    features[feature] = ((i + index) % 5) - 2;
  });
  features.margin_diff = homeWin ? 8 : -8;
  return { features, homeWin };
}

describe("fitBridge", () => {
  it("fits a direction and reports the real sample count", () => {
    const rows = [];
    for (let i = 0; i < MIN_FIT_ROWS; i++) rows.push(row(i, i % 2 === 0));
    const fit = fitBridge(rows);
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    expect(fit.data.sampleCount).toBe(MIN_FIT_ROWS);
    expect(fit.data.homeSign.margin_diff).toBe(1);
    const high = predictBridge(fit.data, rows[0]!.features);
    const low = predictBridge(fit.data, rows[1]!.features);
    expect(high.ok && low.ok).toBe(true);
    if (!high.ok || !low.ok) return;
    expect(high.data.probability).toBeGreaterThan(0.5);
    expect(low.data.probability).toBeLessThan(0.5);
    expect(high.data.probability).toBeGreaterThan(0);
    expect(high.data.probability).toBeLessThan(1);
    expect(high.data.sampleCount).toBe(MIN_FIT_ROWS);
  });

  it("refuses a fit below the row floor", () => {
    const fit = fitBridge([row(0, true), row(1, false)]);
    expect(fit.ok).toBe(false);
  });

  it("refuses a non-finite feature instead of filling it", () => {
    const rows = [];
    for (let i = 0; i < MIN_FIT_ROWS; i++) rows.push(row(i, i % 2 === 0));
    const fit = fitBridge(rows);
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const features = { ...rows[0]!.features, rest_diff: Number.NaN };
    const predicted = predictBridge(fit.data, features);
    expect(predicted.ok).toBe(false);
  });
});
