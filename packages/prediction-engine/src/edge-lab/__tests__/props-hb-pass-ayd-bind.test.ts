/**
 * Pass-yards air-yards-diff covariate bind tests.
 *
 * H2 Edge item — air-yards differential as a pass-yards process signal.
 *
 * This bind couples `avgAirYardsDifferential` (from the covariate bus) into
 * `PassYardsSample` enrichments for the passing-yards model
 * (props-hb-pass-yards).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgAirYardsDifferential from latest prior passing row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgAirYardsDifferential → dropped.
 *  - Non-finite values (NaN, Infinity) → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (attempts, yards) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  PASS_AIR_YARDS_DIFF_BIND_METHOD_TAG,
  bindPassAirYardsDiffSamples,
  boundPassAirYardsDiffSamples,
  type PassAirYardsDiffBindRequest,
  type PassAirYardsDiffBindResult,
} from "../props-hb-pass-ayd-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    avgCompletedAirYards: 6.7,
    avgAirYardsDifferential: 1.7,
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    avgYac: null,
    pressureRate: null,
    intRate: null,
    fumbleRate: null,

    missedTackleRate: null,
    airYardsPerAttempt: null,

    passerRating: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ryoePerAtt: null,
    ...o,
  } as CovariateRow;
}

function req(o: Partial<PassAirYardsDiffBindRequest>): PassAirYardsDiffBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    pass: { attempts: 35, yards: 280 },
    ...o,
  };
}

function isDenied(r: PassAirYardsDiffBindResult): r is Extract<PassAirYardsDiffBindResult, { ok: false }> {
  return !r.ok;
}

describe("pass-air-yards-diff bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PASS_AIR_YARDS_DIFF_BIND_METHOD_TAG).toBe("pass_air_yards_diff_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindPassAirYardsDiffSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgAirYardsDifferential from latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgAirYardsDifferential: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgAirYardsDifferential: 1.5 }),
      ngsRow({ week: 3, avgAirYardsDifferential: 5.0 }), // same-week — ignored
    ];
    const results = bindPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgAirYardsDifferential.value).toBe(1.5); // not 99, not 5.0
    expect(results[0]!.sample.avgAirYardsDifferential.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgAirYardsDifferential.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgAirYardsDifferential on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: null })];
    const results = bindPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgAirYardsDifferential NaN → dropped", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: NaN })];
    const results = bindPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgAirYardsDifferential Infinity → dropped", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: Infinity })];
    const results = bindPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (attempts, yards) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindPassAirYardsDiffSamples(rows, [req({ pass: { attempts: 40, yards: 320 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(40);
    expect(results[0]!.sample.yards).toBe(320);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, avgAirYardsDifferential: 1.7 }),
    ];
    const results = bindPassAirYardsDiffSamples(rows, [
      req({ gsisId: "00-0030501-2", pass: { attempts: 35, yards: 280 } }),
      req({ gsisId: "00-9999999-2", pass: { attempts: 30, yards: 240 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgAirYardsDifferential.value).toBe(1.7);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundPassAirYardsDiffSamples returns only the ok samples (drops refused)", () => {
    const rows = [
      ngsRow({ week: 2, avgAirYardsDifferential: 2.1 }),
    ];
    const results = bindPassAirYardsDiffSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<PassAirYardsDiffBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundPassAirYardsDiffSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });

  it("covariate cell carries grain + provenance, not a bare float", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: 1.3 })];
    const samples = boundPassAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(samples.length).toBe(1);
    const cell = samples[0]!.avgAirYardsDifferential;
    // Cell is { value, grain, provenance } — not a bare number.
    expect(typeof cell).toBe("object");
    expect(cell).toHaveProperty("value", 1.3);
    expect(cell).toHaveProperty("grain", "week_t_for_tplus1");
    expect(cell).toHaveProperty("provenance", "weekly_ngs_mean");
  });
});
