/**
 * Fumble covariate bind tests.
 *
 * H2 Edge — Fumbles.
 *
 * Tests:
 *  - Method tag + priced: false.
 *  - Binds fumbleRate from latest prior defense row.
 *  - Refuses when no prior row (fail-closed).
 *  - Refuses when fumbleRate is null/non-finite (fail-closed).
 *  - boundFumbleSamples drops refused entries.
 */
import { describe, it, expect } from "vitest";
import {
  FUMBLE_BIND_METHOD_TAG,
  bindFumbleSamples,
  boundFumbleSamples,
} from "../props-hb-fumble-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function defRow(overrides: { week: number; fumbleRate: number | null; gsisId?: string }): CovariateRow {
  return {
    gsisId: overrides.gsisId ?? "00-001",
    season: 2025,
    week: overrides.week,
    statType: "defense",
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    avgYac: null,
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    intRate: null,
    fumbleRate: overrides.fumbleRate,
    airYardsPerAttempt: null,
    avgExpectedYac: null,
    expectedRushYards: null,
  } as CovariateRow;
}

function req(overrides?: { kickoffWeek?: number; gsisId?: string }) {
  return {
    gsisId: overrides?.gsisId ?? "00-001",
    season: 2025,
    kickoffWeek: overrides?.kickoffWeek ?? 3,
    fumble: { touches: 85, fumbles: 1 },
  };
}

describe("fumble-bind contract", () => {
  it("method tag + priced:false", () => {
    const rows = [defRow({ week: 1, fumbleRate: 0.012 })];
    const results = bindFumbleSamples(rows, [req()]);
    expect(results[0]).toMatchObject({
      methodTag: FUMBLE_BIND_METHOD_TAG,
      priced: false,
    });
  });

  it("binds fumbleRate from latest prior defense row", () => {
    const rows = [
      defRow({ week: 0, fumbleRate: 0.99 }),   // poison
      defRow({ week: 1, fumbleRate: 0.010 }),
      defRow({ week: 2, fumbleRate: 0.012 }),  // latest prior → kickoffWeek=3
      defRow({ week: 3, fumbleRate: 0.50 }),    // same-week → ignored
    ];
    const results = bindFumbleSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.fumbleRate.value).toBe(0.012);
    expect(results[0]!.sample.fumbleRate.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.fumbleRate.provenance).toBe("weekly_pfr_def_mean");
  });

  it("refuses when no prior row exists", () => {
    const results = bindFumbleSamples([], [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when fumbleRate is null", () => {
    const rows = [defRow({ week: 1, fumbleRate: null })];
    const results = bindFumbleSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when fumbleRate is non-finite", () => {
    const rows = [defRow({ week: 1, fumbleRate: NaN })];
    const results = bindFumbleSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("boundFumbleSamples drops refused entries", () => {
    const rows = [defRow({ week: 1, fumbleRate: 0.012 })];
    const requests = [
      req(),
      { ...req(), gsisId: "00-002" }, // no prior → refused
    ];
    const samples = boundFumbleSamples(rows, requests);
    expect(samples.length).toBe(1);
    expect(samples[0]!.fumbleRate.value).toBe(0.012);
  });

  it("passes through realized touches/fumbles unchanged", () => {
    const rows = [defRow({ week: 2, fumbleRate: 0.012 })];
    const results = bindFumbleSamples(rows, [req()]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.touches).toBe(85);
    expect(results[0]!.sample.fumbles).toBe(1);
  });
});
