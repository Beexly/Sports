/**
 * Rec-TD-cushion covariate bind tests.
 *
 * H0 item 6 — remaining process covariates from PROP_COVARIATE_GAP.
 *
 * This bind couples `avgCushion` (from the covariate bus) into `RecTdSample`
 * enrichments for the receiving-TD model (props-hb-rec-td).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgCushion from latest prior receiving row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgCushion → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (targets, recTds) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  REC_TD_CUSHION_BIND_METHOD_TAG,
  bindRecTdCushionSamples,
  boundRecTdCushionSamples,
  type RecTdCushionBindRequest,
  type RecTdCushionBindResult,
} from "../props-hb-rec-td-cushion-bind.js";
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
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
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
    ...o,
  };
}

function req(o: Partial<RecTdCushionBindRequest>): RecTdCushionBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    recTd: { targets: 8, recTds: 1 },
    ...o,
  };
}

function isDenied(r: RecTdCushionBindResult): r is Extract<RecTdCushionBindResult, { ok: false }> {
  return !r.ok;
}

describe("rec-td-cushion bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(REC_TD_CUSHION_BIND_METHOD_TAG).toBe("rec_td_cushion_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindRecTdCushionSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgCushion from latest prior receiving row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgCushion: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgCushion: 4.0 }),
      ngsRow({ week: 3, avgCushion: 1.0 }), // same-week — ignored
    ];
    const results = bindRecTdCushionSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgCushion.value).toBe(4.0); // not 99, not 1.0
    expect(results[0]!.sample.avgCushion.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgCushion.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindRecTdCushionSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundRecTdCushionSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgCushion on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgCushion: null })];
    const results = bindRecTdCushionSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgCushion → dropped", () => {
    const rows = [ngsRow({ week: 2, avgCushion: NaN })];
    const results = bindRecTdCushionSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgCushion Infinity → dropped", () => {
    const rows = [ngsRow({ week: 2, avgCushion: Infinity })];
    const results = bindRecTdCushionSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (targets, recTds) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindRecTdCushionSamples(rows, [req({ recTd: { targets: 12, recTds: 2 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.targets).toBe(12);
    expect(results[0]!.sample.recTds).toBe(2);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, avgCushion: 4.5 }),
    ];
    const results = bindRecTdCushionSamples(rows, [
      req({ gsisId: "00-0030501-2", recTd: { targets: 8, recTds: 1 } }),
      req({ gsisId: "00-9999999-2", recTd: { targets: 6, recTds: 0 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgCushion.value).toBe(4.5);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundRecTdCushionSamples returns only the ok samples", () => {
    const rows = [
      ngsRow({ week: 2, avgCushion: 3.8 }),
    ];
    const results = bindRecTdCushionSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<RecTdCushionBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundRecTdCushionSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });
});
