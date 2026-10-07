/**
 * Completed-air-yards covariate bind tests.
 *
 * H2 Edge item — completed air yards (depth-of-target realized in completions)
 * as a pass-yards process signal.
 *
 * This bind couples `avgCompletedAirYards` (from the covariate bus) into
 * `PassYardsSample` enrichments for the passing-yards model
 * (props-hb-pass-yards).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgCompletedAirYards from latest prior passing row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgCompletedAirYards → dropped.
 *  - Non-finite values (NaN, Infinity) → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (attempts, yards) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  PASS_CAY_BIND_METHOD_TAG,
  bindPassCaySamples,
  boundPassCaySamples,
  type PassCayBindRequest,
  type PassCayBindResult,
} from "../props-hb-cay-bind.js";
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
    avgAirYardsToSticks: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,

    passerRating: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ryoePerAtt: null,
    ...o,
  };
}

function req(o: Partial<PassCayBindRequest>): PassCayBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    pass: { attempts: 35, yards: 280 },
    ...o,
  };
}

function isDenied(r: PassCayBindResult): r is Extract<PassCayBindResult, { ok: false }> {
  return !r.ok;
}

describe("pass-completed-air-yards (cay) bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PASS_CAY_BIND_METHOD_TAG).toBe("pass_cay_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindPassCaySamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgCompletedAirYards from latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgCompletedAirYards: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgCompletedAirYards: 6.0 }),
      ngsRow({ week: 3, avgCompletedAirYards: 5.0 }), // same-week — ignored
    ];
    const results = bindPassCaySamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgCompletedAirYards.value).toBe(6.0); // not 99, not 5.0
    expect(results[0]!.sample.avgCompletedAirYards.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgCompletedAirYards.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindPassCaySamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundPassCaySamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgCompletedAirYards on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgCompletedAirYards: null })];
    const results = bindPassCaySamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgCompletedAirYards NaN → dropped", () => {
    const rows = [ngsRow({ week: 2, avgCompletedAirYards: NaN })];
    const results = bindPassCaySamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgCompletedAirYards Infinity → dropped", () => {
    const rows = [ngsRow({ week: 2, avgCompletedAirYards: Infinity })];
    const results = bindPassCaySamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (attempts, yards) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindPassCaySamples(rows, [req({ pass: { attempts: 40, yards: 320 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(40);
    expect(results[0]!.sample.yards).toBe(320);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, avgCompletedAirYards: 9.0 }),
    ];
    const results = bindPassCaySamples(rows, [
      req({ gsisId: "00-0030501-2", pass: { attempts: 35, yards: 280 } }),
      req({ gsisId: "00-9999999-2", pass: { attempts: 30, yards: 240 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgCompletedAirYards.value).toBe(9.0);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundPassCaySamples returns only the ok samples (drops refused)", () => {
    const rows = [
      ngsRow({ week: 2, avgCompletedAirYards: 7.5 }),
    ];
    const results = bindPassCaySamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<PassCayBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundPassCaySamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });

  it("covariate cell carries grain + provenance, not a bare float", () => {
    const rows = [ngsRow({ week: 2, avgCompletedAirYards: 8.3 })];
    const samples = boundPassCaySamples(rows, [req({ kickoffWeek: 3 })]);
    expect(samples.length).toBe(1);
    const cell = samples[0]!.avgCompletedAirYards;
    // Cell is { value, grain, provenance } — not a bare number.
    expect(typeof cell).toBe("object");
    expect(cell).toHaveProperty("value", 8.3);
    expect(cell).toHaveProperty("grain", "week_t_for_tplus1");
    expect(cell).toHaveProperty("provenance", "weekly_ngs_mean");
  });
});
