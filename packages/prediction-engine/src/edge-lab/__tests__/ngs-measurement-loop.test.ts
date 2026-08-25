import { describe, expect, it } from "vitest";
import {
  NGS_MEASURE_METHOD_TAG,
  measureExpectedAgainstNgs,
  measureSeparationAgainstNgs,
} from "../ngs-measurement-loop.js";
import type { PlayerExpectedMetric } from "../../expected-metrics/types.js";

describe("measureSeparationAgainstNgs", () => {
  it("joins on playerId and reports skill vs climatology", () => {
    const pred = [
      { playerId: "a", value: 3.0 },
      { playerId: "b", value: 1.5 },
      { playerId: "c", value: 2.5 },
    ];
    const truth = [
      { playerId: "a", actual: 3.1 },
      { playerId: "b", actual: 1.4 },
      { playerId: "c", actual: 2.4 },
      { playerId: "d", actual: 9 },
    ];
    const r = measureSeparationAgainstNgs(pred, truth);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.n).toBe(3);
    expect(r.pearson).toBeGreaterThan(0.9);
    expect(r.skillVsClimatology).not.toBeNull();
    expect(r.skillVsClimatology!).toBeGreaterThan(0);
    expect(r.priced).toBe(false);
    expect(NGS_MEASURE_METHOD_TAG).toBe("ngs_measurement_loop_v1");
  });

  it("refuses an empty join rather than inventing correlation", () => {
    const r = measureSeparationAgainstNgs([{ playerId: "x", value: 1 }], [{ playerId: "y", actual: 2 }]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("empty");
  });
});

describe("measureExpectedAgainstNgs", () => {
  it("graduates a CPOE series that tracks NGS", () => {
    const ours: PlayerExpectedMetric[] = [
      { playerId: "1", plays: 200, actualMean: 0.65, expectedMean: 0.6, overExpected: 0.05, overExpectedTotal: 10 },
      { playerId: "2", plays: 200, actualMean: 0.55, expectedMean: 0.6, overExpected: -0.05, overExpectedTotal: -10 },
      { playerId: "3", plays: 200, actualMean: 0.7, expectedMean: 0.62, overExpected: 0.08, overExpectedTotal: 16 },
      { playerId: "4", plays: 180, actualMean: 0.5, expectedMean: 0.58, overExpected: -0.08, overExpectedTotal: -14 },
      { playerId: "5", plays: 160, actualMean: 0.66, expectedMean: 0.61, overExpected: 0.05, overExpectedTotal: 8 },
      { playerId: "6", plays: 150, actualMean: 0.52, expectedMean: 0.59, overExpected: -0.07, overExpectedTotal: -10 },
      { playerId: "7", plays: 140, actualMean: 0.72, expectedMean: 0.63, overExpected: 0.09, overExpectedTotal: 12 },
      { playerId: "8", plays: 130, actualMean: 0.48, expectedMean: 0.57, overExpected: -0.09, overExpectedTotal: -11 },
      { playerId: "9", plays: 120, actualMean: 0.64, expectedMean: 0.6, overExpected: 0.04, overExpectedTotal: 5 },
      { playerId: "10", plays: 110, actualMean: 0.54, expectedMean: 0.59, overExpected: -0.05, overExpectedTotal: -5 },
      { playerId: "11", plays: 100, actualMean: 0.68, expectedMean: 0.61, overExpected: 0.07, overExpectedTotal: 7 },
      { playerId: "12", plays: 90, actualMean: 0.51, expectedMean: 0.58, overExpected: -0.07, overExpectedTotal: -6 },
    ];
    const truth = ours.map((m) => ({ playerId: m.playerId, value: m.overExpected + 0.002 }));
    const r = measureExpectedAgainstNgs("cpoe", ours, truth);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.graduation.verdict).toBe("graduated");
    expect(r.priced).toBe(false);
  });

  it("fails when ours are noise vs NGS", () => {
    const ours: PlayerExpectedMetric[] = Array.from({ length: 14 }, (_, i) => ({
      playerId: String(i),
      plays: 100,
      actualMean: 0.5,
      expectedMean: 0.5,
      overExpected: i % 2 === 0 ? 0.2 : -0.2,
      overExpectedTotal: 0,
    }));
    const truth = ours.map((m, i) => ({ playerId: m.playerId, value: i * 0.01 }));
    const r = measureExpectedAgainstNgs("cpoe", ours, truth);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.graduation.verdict).toBe("failed");
  });
});
