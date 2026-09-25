import { describe, expect, it } from "vitest";
import {
  NGS_FEATURE_WEIGHTS,
  NGS_TEAM_CONFIDENCE,
  NGS_TEAM_WEIGHT,
  compareNgsTeams,
  normalizeNgsFeatures,
  ngsFeaturesToLedgerSignals,
} from "@sports/types";

const CAPTURED = "2026-09-24T12:00:00.000Z";

describe("NGS feature contract", () => {
  it("normalizes every available family to a bounded, weighted signal", () => {
    const features = normalizeNgsFeatures({
      cpoe: 5,
      avgSeparation: 5,
      avgYacAboveExpectation: 3,
      rushYardsOverExpectedPerAtt: 2,
      avgTimeToThrow: 5,
      avgCushion: 5,
    });
    expect(features).toHaveLength(6);
    expect(features.map((f) => f.key)).toEqual([
      "ngs.cpoe",
      "ngs.separation",
      "ngs.yac_above_expectation",
      "ngs.ryoe_per_attempt",
      "ngs.time_to_throw",
      "ngs.cushion",
    ]);
    expect(features.filter((f) => f.key !== "ngs.time_to_throw").every((f) => f.value === 1)).toBe(true);
    expect(features.find((f) => f.key === "ngs.time_to_throw")?.value).toBe(-1);
    expect(features.every((f) => f.weight > 0 && f.confidence > 0)).toBe(true);
  });

  it("omits missing values and maps the ledger rows without losing lineage fields", () => {
    const signals = ngsFeaturesToLedgerSignals({ cpoe: 2, avgSeparation: null }, CAPTURED);
    expect(signals).toEqual([
      {
        key: "ngs.cpoe",
        value: 0.4,
        weight: NGS_FEATURE_WEIGHTS.cpoe,
        confidence: 0.85,
        capturedAt: CAPTURED,
      },
    ]);
  });

  it("creates a directional team differential and records bounded team policy", () => {
    const comparison = compareNgsTeams(
      { cpoe: 5, separation: 5 },
      { cpoe: -5, separation: -5 },
    );
    expect(comparison.available).toBe(true);
    expect(comparison.homeMinusAway).toBe(1);
    expect(NGS_TEAM_WEIGHT).toBeGreaterThan(0);
    expect(NGS_TEAM_CONFIDENCE).toBeGreaterThan(0);
  });
});
