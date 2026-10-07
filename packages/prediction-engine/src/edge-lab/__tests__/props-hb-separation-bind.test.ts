/**
 * Catch-separation covariate bind tests.
 *
 * H2 Edge — Catches/Receptions: Books price catches on target volume but miss
 * separation. This bind couples `avgSeparation` (from the covariate bus) into
 * `CatchSample` enrichments for the catch-rate model (props-hb-catch).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgSeparation from latest prior receiving row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgSeparation → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (targets, receptions) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  CATCH_SEPARATION_BIND_METHOD_TAG,
  bindCatchSeparationSamples,
  boundCatchSeparationSamples,
  type CatchSeparationBindRequest,
  type CatchSeparationBindResult,
} from "../props-hb-separation-bind.js";
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

    avgAirYardsToSticks: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    avgYac: null,
    pressureRate: null,
    intRate: null,
    fumbleRate: null,

    missedTackleRate: null,
    airYardsPerAttempt: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,

    passerRating: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<CatchSeparationBindRequest>): CatchSeparationBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    catch: { targets: 8, receptions: 6 },
    ...o,
  };
}

function isDenied(r: CatchSeparationBindResult): r is Extract<CatchSeparationBindResult, { ok: false }> {
  return !r.ok;
}

describe("catch-separation bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(CATCH_SEPARATION_BIND_METHOD_TAG).toBe("catch_separation_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindCatchSeparationSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgSeparation from latest prior receiving row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgSeparation: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgSeparation: 3.5 }),
      ngsRow({ week: 3, avgSeparation: 1.2 }), // same-week as kickoffWeek=3 — ignored
    ];
    const results = bindCatchSeparationSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgSeparation.value).toBe(3.5); // not 99, not 1.2
    expect(results[0]!.sample.avgSeparation.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgSeparation.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate — poison
    const results = bindCatchSeparationSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundCatchSeparationSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgSeparation on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: null })];
    const results = bindCatchSeparationSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: NaN avgSeparation → dropped", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: NaN })];
    const results = bindCatchSeparationSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgSeparation Infinity → dropped", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: Infinity })];
    const results = bindCatchSeparationSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (targets, receptions) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindCatchSeparationSamples(rows, [req({ catch: { targets: 10, receptions: 8 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.targets).toBe(10);
    expect(results[0]!.sample.receptions).toBe(8);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: 3.8 })];
    const results = bindCatchSeparationSamples(rows, [
      req({ gsisId: "00-0030501-2", catch: { targets: 6, receptions: 5 } }),
      req({ gsisId: "00-9999999-2", catch: { targets: 4, receptions: 3 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgSeparation.value).toBe(3.8);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundCatchSeparationSamples returns only the ok samples", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: 3.4 })];
    const results = bindCatchSeparationSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<CatchSeparationBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundCatchSeparationSamples(rows, [req({}), req({ gsisId: "00-9999999-2" })])).toHaveLength(1);
  });
});
