/**
 * INT covariate bind tests.
 *
 * H2 Edge — Interceptions.
 *
 * Tests:
 *  - Method tag + priced: false invariant.
 *  - Binds intRate from latest prior defense row — not week=0, not same-week.
 *  - Refuses when no prior row exists (fail-closed).
 *  - Refuses when intRate is null/non-finite (fail-closed).
 *  - boundIntSamples drops refused entries.
 *  - Covariate cell carries correct grain + provenance.
 */
import { describe, it, expect } from "vitest";
import {
  INT_BIND_METHOD_TAG,
  bindIntSamples,
  boundIntSamples,
} from "../props-hb-int-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

// Build a valid CovariateRow with only the defense fields populated.
// We cast to CovariateRow for test convenience — the bind only reads
// gsidId, season, week, statType, and intRate.
function defRow(overrides: { week: number; intRate: number | null; gsisId?: string }): CovariateRow {
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
    intRate: overrides.intRate,
    avgExpectedYac: null,
    expectedRushYards: null,
  } as CovariateRow;
}

function req(overrides?: { kickoffWeek?: number; gsisId?: string }) {
  return {
    gsisId: overrides?.gsisId ?? "00-001",
    season: 2025,
    kickoffWeek: overrides?.kickoffWeek ?? 3,
    int: { attempts: 80, ints: 3 },
  };
}

describe("int-bind contract", () => {
  it("method tag + priced:false invariant", () => {
    const rows = [defRow({ week: 1, intRate: 0.045 })];
    const results = bindIntSamples(rows, [req()]);
    expect(results[0]).toMatchObject({
      methodTag: INT_BIND_METHOD_TAG,
      priced: false,
    });
  });

  it("binds intRate from latest prior defense row — not week=0, not same-week", () => {
    const rows = [
      defRow({ week: 0, intRate: 0.99 }),   // season aggregate — poison
      defRow({ week: 1, intRate: 0.030 }),   // valid prior
      defRow({ week: 2, intRate: 0.045 }),   // valid prior (latest)
      defRow({ week: 3, intRate: 0.50 }),    // same-week as kickoffWeek=3 — ignored
    ];
    const results = bindIntSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.intRate.value).toBe(0.045);
    expect(results[0]!.sample.intRate.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.intRate.provenance).toBe("weekly_pfr_def_mean");
  });

  it("refuses when no prior row exists (fail-closed)", () => {
    const rows: CovariateRow[] = [];
    const results = bindIntSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when intRate is null (fail-closed, never imputed)", () => {
    const rows = [defRow({ week: 1, intRate: null })];
    const results = bindIntSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when intRate is non-finite (fail-closed)", () => {
    const rows = [defRow({ week: 1, intRate: NaN })];
    const results = bindIntSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("boundIntSamples drops refused entries", () => {
    const rows = [defRow({ week: 1, intRate: 0.045 })];
    const requests = [
      req(),                                    // ok
      { ...req(), gsisId: "00-002" },           // no prior row → refused
    ];
    const samples = boundIntSamples(rows, requests);
    expect(samples.length).toBe(1);
    expect(samples[0]!.intRate.value).toBe(0.045);
  });

  it("sample passes through realized attempts/ints unchanged", () => {
    const rows = [defRow({ week: 2, intRate: 0.045 })];
    const results = bindIntSamples(rows, [req()]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(80);
    expect(results[0]!.sample.ints).toBe(3);
  });
});
