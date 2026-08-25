/**
 * INT covariate bind tests.
 *
 * H0 item 6 — remaining process covariates from PROP_COVARIATE_GAP.
 *
 * This bind couples `avgTimeToThrow` and `aggressiveness` (from the
 * covariate bus) into `IntSample` enrichments for the INT model.
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds both covariates from the latest prior passing row — not week=0,
 *    not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgTimeToThrow → dropped.
 *  - FAILS CLOSED: null aggressiveness → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (attempts, ints) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  INT_BIND_METHOD_TAG,
  bindIntSamples,
  boundIntSamples,
  type IntBindRequest,
  type IntBindResult,
} from "../props-hb-int-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    avgYac: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<IntBindRequest>): IntBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    int: { attempts: 35, ints: 1 },
    ...o,
  };
}

function isDenied(r: IntBindResult): r is Extract<IntBindResult, { ok: false }> {
  return !r.ok;
}

describe("int bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(INT_BIND_METHOD_TAG).toBe("int_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindIntSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds both covariates from latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgTimeToThrow: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgTimeToThrow: 2.3, aggressiveness: 18.5 }),
      ngsRow({ week: 3, avgTimeToThrow: 5.0, aggressiveness: 25.0 }), // same-week — ignored
    ];
    const results = bindIntSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgTimeToThrow.value).toBe(2.3); // not 99, not 5.0
    expect(results[0]!.sample.aggressiveness.value).toBe(18.5); // not 25.0
    expect(results[0]!.sample.avgTimeToThrow.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgTimeToThrow.provenance).toBe("weekly_ngs_mean");
    expect(results[0]!.sample.aggressiveness.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.aggressiveness.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindIntSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    // The caller never sees an invention:
    expect(boundIntSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgTimeToThrow on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: null })];
    const results = bindIntSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: null aggressiveness on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: null })];
    const results = bindIntSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgTimeToThrow → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: NaN })];
    const results = bindIntSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite aggressiveness → dropped", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: Infinity })];
    const results = bindIntSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (attempts, ints) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindIntSamples(rows, [req({ int: { attempts: 40, ints: 2 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(40);
    expect(results[0]!.sample.ints).toBe(2);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, avgTimeToThrow: 2.5, aggressiveness: 20.0 }),
    ];
    const results = bindIntSamples(rows, [
      req({ gsisId: "00-0030501-2", int: { attempts: 30, ints: 0 } }),
      req({ gsisId: "00-9999999-2", int: { attempts: 25, ints: 1 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgTimeToThrow.value).toBe(2.5);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundIntSamples returns only the ok samples", () => {
    const rows = [
      ngsRow({ week: 2, avgTimeToThrow: 2.7, aggressiveness: 17.5 }),
    ];
    const results = bindIntSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<IntBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundIntSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });
});
