/**
 * Passer-rating covariate bind tests.
 *
 * H2 EDGE: books price pass TDs off season totals, missing the weekly
 * passer-rating signal. This bind couples the covariate bus weekly NGS
 * `passerRating` into `PassTdSample` enrichments for props-hb-pass-td.
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds passerRating from the latest prior passing row — not week=0,
 *    not same-week.
 *  - FAILS CLOSED: no prior per-game row → dropped (`no_prior_row`).
 *  - FAILS CLOSED: null / NaN / non-finite passerRating on the latest prior
 *    row → dropped (`null_passer_rating`), never imputed.
 *  - `boundPasserRatingSamples` drops the refused samples.
 *  - Realized inputs (attempts, passTds) passed through unchanged.
 *  - Grain + provenance correctness.
 */
import { describe, expect, it } from "vitest";

import {
  PASSER_RATING_BIND_METHOD_TAG,
  bindPasserRatingSamples,
  boundPasserRatingSamples,
  type PasserRatingBindRequest,
  type PasserRatingBindResult,
} from "../props-hb-passer-rating-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
    // ── receiving
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    // ── passing ──
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,

    avgAirYardsToSticks: null,
    // ── rushing
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    ryoePerAttempt: null,
    // ── yac
    avgYac: null,
    // ── defense (PFR)
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    intRate: null,
    fumbleRate: null,

    missedTackleRate: null,
    airYardsPerAttempt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    passerRating: 100.0,
    // ── y-axis (NEVER exposed as p)
    avgExpectedYac: null,
    expectedRushYards: null,
    ryoePerAtt: null,
    ...o,
  } as CovariateRow;
}

function req(o: Partial<PasserRatingBindRequest>): PasserRatingBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    passTd: { attempts: 38, passTds: 4 },
    ...o,
  };
}

function isDenied(r: PasserRatingBindResult): r is Extract<PasserRatingBindResult, { ok: false }> {
  return !r.ok;
}

describe("passer-rating bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PASSER_RATING_BIND_METHOD_TAG).toBe("passer_rating_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindPasserRatingSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds passerRating from the latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, passerRating: 999 }), // season aggregate — poison
      ngsRow({ week: 2, passerRating: 88.5 }),
      ngsRow({ week: 3, passerRating: 10.1 }), // same-week — ignored
    ];
    const results = bindPasserRatingSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.passerRating.value).toBe(88.5); // not 999, not 10.1
    expect(results[0]!.sample.passerRating.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.passerRating.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindPasserRatingSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    // The caller never sees a 0/invented value — the convenience drops it.
    expect(boundPasserRatingSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null passerRating on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, passerRating: null })];
    const results = bindPasserRatingSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_passer_rating");
  });

  it("FAILS CLOSED: NaN passerRating on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, passerRating: NaN })];
    const results = bindPasserRatingSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_passer_rating");
  });

  it("FAILS CLOSED: non-finite (Infinity) passerRating → dropped", () => {
    const rows = [ngsRow({ week: 2, passerRating: Infinity })];
    const results = bindPasserRatingSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_passer_rating");
  });

  it("realized inputs (attempts, passTds) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindPasserRatingSamples(rows, [
      req({ passTd: { attempts: 22, passTds: 1 } }),
    ]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(22);
    expect(results[0]!.sample.passTds).toBe(1);
    expect(results[0]!.sample.passerRating.value).toBe(100.0);
  });

  it("binds from the latest eligible week when several prior weeks exist", () => {
    const rows = [
      ngsRow({ week: 1, passerRating: 72.0 }),
      ngsRow({ week: 2, passerRating: 115.3 }),
      ngsRow({ week: 4, passerRating: 101.2 }),
    ];
    const results = bindPasserRatingSamples(rows, [req({ kickoffWeek: 5 })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.passerRating.value).toBe(101.2);
  });

  it("drops refused and keeps the ok sample in a batch", () => {
    const rows = [
      ngsRow({ week: 2, passerRating: 118.7 }),
    ];
    const results = bindPasserRatingSamples(rows, [
      req({}), // binds
      req({ gsisId: "00-9999999-2" }), // no prior → dropped
      req({ passTd: { attempts: 30, passTds: 2 }, kickoffWeek: 4 }), // late, still ok
    ]);
    expect(results.length).toBe(3);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.passerRating.value).toBe(118.7);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
    expect(results[2]!.ok).toBe(true);
    if (!results[2]!.ok) throw new Error("expected ok");
    expect(results[2]!.sample.attempts).toBe(30);

    // boundPasserRatingSamples returns only the ok samples.
    const bound = boundPasserRatingSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
      req({ passTd: { attempts: 30, passTds: 2 }, kickoffWeek: 4 }),
    ]);
    expect(bound).toHaveLength(2);
    // Both ok requests bind from the same latest prior row (week 2), so BOTH
    // samples carry passerRating 118.7 — only the no-prior request is dropped.
    expect(bound.filter((s) => s.passerRating.value === 118.7)).toHaveLength(2);
  });

  it("boundPasserRatingSamples returns only the ok samples (drops refused)", () => {
    const rows = [ngsRow({ week: 2, passerRating: null })];
    const results = bindPasserRatingSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(
      results.filter((r): r is Extract<PasserRatingBindResult, { ok: true }> => r.ok),
    ).toHaveLength(0);
    expect(boundPasserRatingSamples(rows, [req({}), req({ gsisId: "00-9999999-2" })])).toHaveLength(0);
  });

  it("methodTag is attached to both ok and refused results", () => {
    const rows = [ngsRow({ week: 2 })];
    const ok = bindPasserRatingSamples(rows, [req({})])[0];
    const refused = bindPasserRatingSamples([], [req({})])[0];
    expect(ok!.methodTag).toBe(PASSER_RATING_BIND_METHOD_TAG);
    expect(refused!.methodTag).toBe(PASSER_RATING_BIND_METHOD_TAG);
  });
});
