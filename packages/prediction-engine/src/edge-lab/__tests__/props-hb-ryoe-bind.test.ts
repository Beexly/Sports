/**
 * RYOE (rush yards over expected per attempt) covariate bind tests.
 *
 * H2 Edge — Rush TDs.
 *
 * Tests:
 *  - Method tag + priced: false.
 *  - Binds ryoePerAtt from latest prior rushing row.
 *  - Refuses when no prior row (fail-closed).
 *  - Refuses when ryoePerAtt is null/non-finite (fail-closed).
 *  - boundRyoeSamples drops refused entries.
 *  - Passes through realized rushAtt/rushTds unchanged.
 *  - Only rushing rows feed the metric (statType gate).
 */
import { describe, it, expect } from "vitest";
import {
  RYOE_BIND_METHOD_TAG,
  bindRyoeSamples,
  boundRyoeSamples,
  type RyoeBindRequest,
  type RyoeBindResult,
} from "../props-hb-ryoe-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(overrides: { week: number; ryoePerAtt: number | null; gsisId?: string }): CovariateRow {
  return {
    gsisId: overrides.gsisId ?? "00-0030501-2",
    season: 2024,
    week: overrides.week,
    statType: "rushing",
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    pctAttemptsGte8Defenders: 0.55,
    avgTimeToLos: 2.3,
    avgYac: null,
    pressureRate: null,
    intRate: null,
    fumbleRate: null,
    airYardsPerAttempt: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ryoePerAtt: overrides.ryoePerAtt,
  } as CovariateRow;
}

function req(overrides?: { kickoffWeek?: number; gsisId?: string }): RyoeBindRequest {
  return {
    gsisId: overrides?.gsisId ?? "00-0030501-2",
    season: 2024,
    kickoffWeek: overrides?.kickoffWeek ?? 3,
    rushTd: { rushAtt: 18, rushTds: 2 },
  };
}

function isDenied(r: RyoeBindResult): r is Extract<RyoeBindResult, { ok: false }> {
  return !r.ok;
}

describe("ryoe-bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(RYOE_BIND_METHOD_TAG).toBe("ryoe_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: 0.9 })];
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]!.priced).toBe(false);
  });

  it("method tag + priced:false", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: 0.9 })];
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]).toMatchObject({
      methodTag: RYOE_BIND_METHOD_TAG,
      priced: false,
    });
  });

  it("binds ryoePerAtt from latest prior rushing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, ryoePerAtt: 9.99 }),           // season aggregate — poison
      ngsRow({ week: 1, ryoePerAtt: 0.6 }),
      ngsRow({ week: 2, ryoePerAtt: 1.1 }),            // latest prior → kickoffWeek=3
      ngsRow({ week: 3, ryoePerAtt: 5.0 }),            // same-week → ignored
    ];
    const results = bindRyoeSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.ryoePerAtt.value).toBe(1.1); // not 9.99, not 5.0
    expect(results[0]!.sample.ryoePerAtt.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.ryoePerAtt.provenance).toBe("weekly_ngs_mean");
  });

  it("refuses when no prior row exists (fail-closed)", () => {
    const results = bindRyoeSamples([], [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when only week=0 aggregate exists (no per-game history)", () => {
    const rows = [ngsRow({ week: 0, ryoePerAtt: 1.0 })];
    const results = bindRyoeSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when ryoePerAtt is null", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: null })];
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when ryoePerAtt is non-finite (NaN)", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: NaN })];
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("refuses when ryoePerAtt is non-finite (Infinity)", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: Infinity })];
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]).toMatchObject({ ok: false, refuse: "no_prior_row" });
  });

  it("boundRyoeSamples drops refused entries", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: 0.8 })];
    const requests = [
      req(),
      { ...req(), gsisId: "00-9999999-2" }, // no prior → refused
    ];
    const samples = boundRyoeSamples(rows, requests);
    expect(samples.length).toBe(1);
    expect(samples[0]!.ryoePerAtt.value).toBe(0.8);
  });

  it("boundRyoeSamples returns only the ok samples", () => {
    const rows = [
      ngsRow({ week: 2, ryoePerAtt: 0.8 }),
      ngsRow({ week: 2, ryoePerAtt: null, gsisId: "00-1111111-2" }),
    ];
    const results = bindRyoeSamples(rows, [
      req({ gsisId: "00-0030501-2" }),
      req({ gsisId: "00-1111111-2" }),
    ]);
    expect(results.filter((r): r is Extract<RyoeBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(
      boundRyoeSamples(rows, [
        req({ gsisId: "00-0030501-2" }),
        req({ gsisId: "00-1111111-2" }),
      ]),
    ).toHaveLength(1);
  });

  it("passes through realized rushAtt/rushTds unchanged", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: 1.1 })];
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.rushAtt).toBe(18);
    expect(results[0]!.sample.rushTds).toBe(2);
  });

  it("only rushing rows feed the metric (statType gate)", () => {
    const rows = [
      { ...ngsRow({ week: 2, ryoePerAtt: 0.8 }), statType: "receiving" as const },
      { ...ngsRow({ week: 2, ryoePerAtt: 0.8 }), statType: "defense" as const },
    ];
    // Same gsisId + season but wrong statType → no prior row
    const results = bindRyoeSamples(rows, [req()]);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("batch: one bad drops, good binds", () => {
    const rows = [ngsRow({ week: 2, ryoePerAtt: 0.8 })];
    const results = bindRyoeSamples(rows, [
      req(),
      { ...req(), gsisId: "00-9999999-2" }, // no prior → refused
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.ryoePerAtt.value).toBe(0.8);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });
});
