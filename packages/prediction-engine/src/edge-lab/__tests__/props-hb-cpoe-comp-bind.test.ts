import { describe, expect, it } from "vitest";
import {
  CPOE_COMP_BIND_METHOD_TAG,
  GSE_CPOE_PROVENANCE,
  bindCpoeCompSamples,
  boundCpoeCompSamples,
  type CpoeCompBindRequest,
  type CpoeCompBindResult,
} from "../props-hb-cpoe-comp-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
    avgSeparation: null, // not used by passing bind
    avgCushion: null,
    airYardsShare: null,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    avgYac: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<CpoeCompBindRequest>): CpoeCompBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    comp: { attempts: 35, completions: 24 },
    gseCpoe: 5.7,
    ...o,
  };
}

function isDenied(r: CpoeCompBindResult): r is Extract<CpoeCompBindResult, { ok: false }> {
  return !r.ok;
}

describe("cpoe-comp-bind contract", () => {
  it("exposes the v1 method tag and GSE-CPOE provenance", () => {
    expect(CPOE_COMP_BIND_METHOD_TAG).toBe("cpoe_comp_bind_v1");
    expect(GSE_CPOE_PROVENANCE).toBe("expected_metric_v1");
  });

  it("binds avgTimeToThrow + avgIntendedAirYards + GSE-CPOE from latest prior passing row", () => {
    const rows = [
      ngsRow({ week: 0, avgTimeToThrow: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgTimeToThrow: 2.3, avgIntendedAirYards: 7.1 }),
      ngsRow({ week: 3, avgTimeToThrow: 5.0, avgIntendedAirYards: 12.0 }), // same-week — ignored
    ];
    const results = bindCpoeCompSamples(rows, [req({ kickoffWeek: 3, gseCpoe: 5.7 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgTimeToThrow.value).toBe(2.3);
    expect(results[0]!.sample.avgIntendedAirYards.value).toBe(7.1);
    expect(results[0]!.sample.gseCpoe).toBe(5.7);
    expect(results[0]!.sample.avgTimeToThrow.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgTimeToThrow.provenance).toBe("weekly_ngs_mean");
    expect(results[0]!.priced).toBe(false);
  });

  it("FAILS CLOSED: no prior passing row → sample dropped", () => {
    const rows = [ngsRow({ week: 0, avgTimeToThrow: 2.6 })]; // only aggregate
    const results = bindCpoeCompSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundCpoeCompSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgTimeToThrow on prior row → dropped, never invented", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: null })];
    const results = bindCpoeCompSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_ttt");
    expect(boundCpoeCompSamples(rows, [req({ kickoffWeek: 3 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgIntendedAirYards on prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgIntendedAirYards: null })];
    const results = bindCpoeCompSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_air_yards");
  });

  it("FAILS CLOSED: non-finite GSE-CPOE → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: 2.3, avgIntendedAirYards: 7.1 })];
    const results = bindCpoeCompSamples(rows, [req({ kickoffWeek: 3, gseCpoe: NaN })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("non_finite_cpoe");
  });

  it("preserves attempts/completions on the bound sample", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: 2.3, avgIntendedAirYards: 7.1 })];
    const samples = boundCpoeCompSamples(rows, [req({ kickoffWeek: 3, comp: { attempts: 40, completions: 28 }, gseCpoe: -3.2 })]);
    expect(samples.length).toBe(1);
    expect(samples[0]!.attempts).toBe(40);
    expect(samples[0]!.completions).toBe(28);
    expect(samples[0]!.gseCpoe).toBe(-3.2);
  });

  it("never exposes vendor y-axis (avgExpectedYac / expectedRushYards) — type enforces", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: 2.3, avgIntendedAirYards: 7.1 })];
    const samples = boundCpoeCompSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(samples.length).toBe(1);
    const cell = samples[0]!.avgTimeToThrow;
    expect(cell.value).toBe(2.3);
    expect(cell.provenance).toBe("weekly_ngs_mean");
    // BoundCompSample has no avgExpectedYac field — compile-time proof that
    // vendor y-axis metrics never enter the completions p-path.
    expect("avgExpectedYac" in cell).toBe(false);
    expect("expectedRushYards" in cell).toBe(false);
  });

  it("drops only the failing sample, keeps the rest", () => {
    const rows = [
      ngsRow({ gsisId: "00-0000001-1", season: 2024, week: 2, avgTimeToThrow: 2.5, avgIntendedAirYards: 8.0 }),
      ngsRow({ gsisId: "00-0000002-2", season: 2024, week: 0, avgTimeToThrow: 99, avgIntendedAirYards: 99 }),
    ];
    const requests: CpoeCompBindRequest[] = [
      req({ gsisId: "00-0000001-1", kickoffWeek: 3, comp: { attempts: 30, completions: 20 } }),
      req({ gsisId: "00-0000002-2", kickoffWeek: 1, comp: { attempts: 25, completions: 15 } }), // week 0 only → dropped
    ];
    const results = bindCpoeCompSamples(rows, requests);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
    const bound = boundCpoeCompSamples(rows, requests);
    expect(bound.length).toBe(1);
    expect(bound[0]!.avgTimeToThrow.value).toBe(2.5);
  });
});
