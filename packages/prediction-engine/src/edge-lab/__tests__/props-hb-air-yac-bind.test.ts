import { describe, expect, it } from "vitest";
import {
  YAC_BIND_METHOD_TAG,
  bindYacSamples,
  boundYacSamples,
  type YacBindRequest,
  type YacBindResult,
  type BoundAirYacSample,
} from "../props-hb-air-yac-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 2.5,
    avgCushion: 4.0,
    airYardsShare: 0.18,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: 4.3,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<YacBindRequest>): YacBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    airYac: { receptions: 8, airYards: 80, yac: 16 },
    ...o,
  };
}

describe("yac bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(YAC_BIND_METHOD_TAG).toBe("yac_bind_v1");
  });

  it("binds avgYac from latest prior receiving row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgYac: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgYac: 4.7 }),
      ngsRow({ week: 3, avgYac: 9.0 }), // same-week as kickoffWeek=3 — ignored
    ];
    const results = bindYacSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgYac.value).toBe(4.7); // not 99, not 9.0
    expect(results[0]!.sample.avgYac.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgYac.provenance).toBe("weekly_ngs_mean");
    expect(results[0]!.priced).toBe(false);
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped, never invented", () => {
    const rows = [ngsRow({ week: 0, avgYac: 3.0 })]; // only aggregate
    const results = bindYacSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundYacSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgYac on the prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgYac: null })];
    const results = bindYacSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("preserves air+YAC model inputs (receptions/airYards/yac) on the bound sample", () => {
    const rows = [ngsRow({ week: 2, avgYac: 5.1 })];
    const samples = boundYacSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(samples.length).toBe(1);
    expect(samples[0]!.receptions).toBe(8);
    expect(samples[0]!.airYards).toBe(80);
    expect(samples[0]!.yac).toBe(16);
    expect(samples[0]!.avgYac.value).toBe(5.1);
  });

  it("never exposes vendor y-axis (avgExpectedYac/expectedRushYards) — type enforces", () => {
    const rows = [ngsRow({ week: 2, avgYac: 4.3, avgExpectedYac: 5.5, expectedRushYards: 12 })];
    const samples = boundYacSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(samples.length).toBe(1);
    // avgYac is the covariate; avgExpectedYac / expectedRushYards are NOT in the cell.
    const cell = samples[0]!.avgYac;
    expect(cell.value).toBe(4.3);
    expect(cell.provenance).toBe("weekly_ngs_mean");
    // The BoundAirYacSample type has no avgExpectedYac field — compile-time proof.
    expect("avgExpectedYac" in cell).toBe(false);
  });

  it("drops only the failing sample, keeps the rest", () => {
    const rows = [
      ngsRow({ gsisId: "00-0000001-1", week: 2, avgYac: 3.8 }), // ok
      ngsRow({ gsisId: "00-0000002-2", week: 0, avgYac: 99 }), // only aggregate → dropped
    ];
    const requests: YacBindRequest[] = [
      req({ gsisId: "00-0000001-1", kickoffWeek: 3, airYac: { receptions: 6, airYards: 60, yac: 12 } }),
      req({ gsisId: "00-0000002-2", kickoffWeek: 1, airYac: { receptions: 5, airYards: 50, yac: 10 } }),
    ];
    const results = bindYacSamples(rows, requests);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
    const bound = boundYacSamples(rows, requests);
    expect(bound.length).toBe(1);
    expect(bound[0]!.avgYac.value).toBe(3.8);
  });
});

function isDenied(r: YacBindResult): r is Extract<YacBindResult, { ok: false }> {
  return !r.ok;
}
