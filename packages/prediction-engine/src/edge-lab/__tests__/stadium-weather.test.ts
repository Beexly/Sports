import { describe, expect, it } from "vitest";
import { flagsFrom, parseObservedEra5Hour, weatherAdjustment } from "../stadium-weather.js";
import type { WeatherFeatures } from "../loaders/weather-edge.js";

function features(partial: Partial<WeatherFeatures>): WeatherFeatures {
  return {
    available: true,
    indoor: false,
    source: "historical-forecast",
    asOfUtc: "2024-01-13T16:00:00Z",
    kickoffUtc: "2024-01-13T20:30:00Z",
    forecastValidHourUtc: "2024-01-13T20:00",
    tempF: 40,
    windMph: 8,
    windGustMph: 12,
    windDirDeg: 270,
    precipInch: 0,
    precipProbPct: 10,
    candidateSignals: { passingSuppressionIndex: 0.1, kickingDifficultyIndex: 0.1 },
    provenance: { api: "test", leadTimeHours: 4, note: "fixture" },
    ...partial,
  };
}

describe("stadium weather flags and priors", () => {
  it("flags the Arrowhead 2024-01-13 observed hour without treating it as a pick feature", () => {
    const hour = parseObservedEra5Hour({
      time: ["2024-01-13T20:00"],
      temperature_2m: [4.5],
      wind_speed_10m: [15.6],
      wind_gusts_10m: [31.8],
      precipitation: [0],
      relative_humidity_2m: [52],
    }, "2024-01-13T20:00");
    expect(hour).not.toBeNull();
    expect(hour?.usableAsPickFeature).toBe(false);
    expect(hour?.tempF).toBe(4.5);
    expect(hour?.windMph).toBe(15.6);
    const flags = flagsFrom({
      indoor: false,
      available: true,
      windMph: hour?.windMph ?? null,
      tempF: hour?.tempF ?? null,
      precipInch: hour?.precipInch ?? null,
    });
    expect(flags.windOver15).toBe(true);
    expect(flags.extremeCold).toBe(true);
    expect(flags.weatherIrrelevant).toBe(false);
  });

  it("a dome is weather-irrelevant even if the outdoor grid is windy", () => {
    const adj = weatherAdjustment(features({
      indoor: true,
      source: "indoor-neutral",
      windMph: 23.1,
      tempF: 28.9,
    }));
    expect(adj.applied).toBe(false);
    expect(adj.totalPoints).toBeNull();
    expect(adj.reasons).toContain("dome-or-closed-roof");
    expect(adj.note).toContain("Not a measured wind of 0");
  });

  it("an outage does not zero the total", () => {
    const adj = weatherAdjustment(features({
      available: false,
      source: "unavailable",
      windMph: null,
      tempF: null,
      precipInch: null,
    }));
    expect(adj.applied).toBe(false);
    expect(adj.totalPoints).toBeNull();
    expect(adj.reasons).toContain("upstream-unavailable");
  });

  it("a met threshold is a prior, not a calibrated weight", () => {
    const adj = weatherAdjustment(features({ windMph: 18, precipInch: 0.2, tempF: 10 }));
    expect(adj.weightStatus).toBe("prior");
    expect(adj.applied).toBe(true);
    expect(adj.totalPoints).toBe(-3);
    expect(adj.passingDirection).toBe("down");
    expect(adj.note).toContain("Not calibrated");
  });
});
