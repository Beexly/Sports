import { describe, expect, it } from "vitest";
import { weatherAdjustment } from "../weather-total-adjustment.js";
import type { WeatherFeatures } from "@sports/prediction-engine/src/edge-lab/loaders/weather-edge.js";

const calm: WeatherFeatures = {
  available: true,
  indoor: false,
  source: "forecast",
  asOfUtc: "2026-10-02T16:00:00Z",
  kickoffUtc: "2026-10-02T20:00:00Z",
  forecastValidHourUtc: "2026-10-02T20:00",
  tempF: 62,
  windMph: 6,
  windGustMph: 9,
  windDirDeg: 180,
  precipInch: 0,
  precipProbPct: 5,
  candidateSignals: { passingSuppressionIndex: 0, kickingDifficultyIndex: 0 },
  provenance: { api: "test", leadTimeHours: 4, note: "fixture" },
};

describe("weather total-signal adjustment", () => {
  it("is reachable from the ingestion package and stays a prior", () => {
    const adj = weatherAdjustment({ ...calm, windMph: 18, tempF: 12 });
    expect(adj.weightStatus).toBe("prior");
    expect(adj.totalPoints).toBe(-2);
    expect(adj.note).toContain("Not calibrated");
  });
});
