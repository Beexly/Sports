/**
 * Completions-air-yards-diff covariate bind tests.
 *
 * H0 item 6 — remaining process covariates from PROP_COVARIATE_GAP.
 *
 * This bind couples `avgAirYardsDifferential` (from the covariate bus) into
 * `CompSample` enrichments for the completions model (props-hb-comp).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgAirYardsDifferential from latest prior passing row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgAirYardsDifferential → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (attempts, completions) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  COMP_AIR_YARDS_DIFF_BIND_METHOD_TAG,
  bindCompAirYardsDiffSamples,
  boundCompAirYardsDiffSamples,
  type CompAirYardsDiffBindRequest,
  type CompAirYardsDiffBindResult,
} from "../props-hb-comp-air-yards-diff-bind.js";
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
    airYardsPerAttempt: null,

    avgAirYardsToSticks: null,
    missedTackleRate: null,
    passerRating: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<CompAirYardsDiffBindRequest>): CompAirYardsDiffBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    comp: { attempts: 35, completions: 28 },
    ...o,
  };
}

function isDenied(r: CompAirYardsDiffBindResult): r is Extract<CompAirYardsDiffBindResult, { ok: false }> {
  return !r.ok;
}

describe("comp-air-yards-diff bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(COMP_AIR_YARDS_DIFF_BIND_METHOD_TAG).toBe("comp_air_yards_diff_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindCompAirYardsDiffSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgAirYardsDifferential from latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgAirYardsDifferential: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgAirYardsDifferential: 1.5 }),
      ngsRow({ week: 3, avgAirYardsDifferential: 5.0 }), // same-week — ignored
    ];
    const results = bindCompAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgAirYardsDifferential.value).toBe(1.5); // not 99, not 5.0
    expect(results[0]!.sample.avgAirYardsDifferential.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgAirYardsDifferential.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindCompAirYardsDiffSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundCompAirYardsDiffSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgAirYardsDifferential on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: null })];
    const results = bindCompAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgAirYardsDifferential → dropped", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: NaN })];
    const results = bindCompAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgAirYardsDifferential Infinity → dropped", () => {
    const rows = [ngsRow({ week: 2, avgAirYardsDifferential: Infinity })];
    const results = bindCompAirYardsDiffSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (attempts, completions) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindCompAirYardsDiffSamples(rows, [req({ comp: { attempts: 40, completions: 32 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(40);
    expect(results[0]!.sample.completions).toBe(32);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, avgAirYardsDifferential: 1.7 }),
    ];
    const results = bindCompAirYardsDiffSamples(rows, [
      req({ gsisId: "00-0030501-2", comp: { attempts: 35, completions: 28 } }),
      req({ gsisId: "00-9999999-2", comp: { attempts: 30, completions: 25 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgAirYardsDifferential.value).toBe(1.7);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundCompAirYardsDiffSamples returns only the ok samples", () => {
    const rows = [
      ngsRow({ week: 2, avgAirYardsDifferential: 2.1 }),
    ];
    const results = bindCompAirYardsDiffSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<CompAirYardsDiffBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundCompAirYardsDiffSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });
});
