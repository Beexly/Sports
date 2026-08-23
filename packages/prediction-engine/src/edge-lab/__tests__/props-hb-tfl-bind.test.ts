/**
 * TFL covariate bind tests.
 *
 * H1 Edge #2 — TFL (tackles for loss).
 *
 * Tests:
 *  - Method tag + priced: false.
 *  - Binds tflRate from latest prior defense row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → dropped.
 *  - FAILS CLOSED: null/non-finite tflRate → dropped.
 *  - Batch: one bad drops, good binds.
 *  - Grain + provenance (weekly_pfr_def_mean).
 *  - Realized inputs (snaps, tfl) passed through unchanged on ok.
 */
import { describe, expect, it } from "vitest";

import {
  TFL_BIND_METHOD_TAG,
  bindTflSamples,
  boundTflSamples,
  type TflBindRequest,
  type TflBindResult,
} from "../props-hb-tfl-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function defRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "defense",
    snapShare: 0.68,
    pressureRate: 0.18,
    tflRate: 0.024,
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
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<TflBindRequest>): TflBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    tfl: { snaps: 400, tfl: 8 },
    ...o,
  };
}

function isDenied(r: TflBindResult): r is Extract<TflBindResult, { ok: false }> {
  return !r.ok;
}

describe("tfl bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(TFL_BIND_METHOD_TAG).toBe("tfl_rate_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [defRow({ week: 2 })];
    const results = bindTflSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds tflRate from latest prior defense row — not week=0, not same-week", () => {
    const rows = [
      defRow({ week: 0, tflRate: 0.99 }), // season aggregate — poison
      defRow({ week: 2, tflRate: 0.021 }),
      defRow({ week: 3, tflRate: 0.095 }), // same-week — ignored
    ];
    const results = bindTflSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.tflRate.value).toBe(0.021); // not 0.99, not 0.095
    expect(results[0]!.sample.tflRate.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.tflRate.provenance).toBe("weekly_pfr_def_mean");
  });

  it("FAILS CLOSED: no prior per-game defense row → dropped", () => {
    const rows = [defRow({ week: 0 })]; // only aggregate
    const results = bindTflSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundTflSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null tflRate → dropped", () => {
    const rows = [defRow({ week: 2, tflRate: null })];
    const results = bindTflSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(false);
  });

  it("FAILS CLOSED: non-finite tflRate → dropped", () => {
    const rows = [defRow({ week: 2, tflRate: NaN })];
    const results = bindTflSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(false);
  });

  it("realized inputs (snaps, tfl) passed through unchanged on ok", () => {
    const rows = [defRow({ week: 2 })];
    const results = bindTflSamples(rows, [req({ tfl: { snaps: 400, tfl: 8 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.snaps).toBe(400);
    expect(results[0]!.sample.tfl).toBe(8);
  });

  it("batch: one bad drops, good binds", () => {
    const rows = [defRow({ week: 2, tflRate: 0.023 })];
    const results = bindTflSamples(rows, [
      req({ gsisId: "00-0030501-2", tfl: { snaps: 400, tfl: 8 } }),
      req({ gsisId: "00-9999999-2", tfl: { snaps: 350, tfl: 5 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.tflRate.value).toBe(0.023);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundTflSamples returns only ok samples", () => {
    const rows = [defRow({ week: 2, tflRate: 0.023 })];
    expect(boundTflSamples(rows, [req({}), req({ gsisId: "00-9999999-2" })])).toHaveLength(1);
  });
});
