/**
 * RPOE covariate bind tests — rushPctOverExpected → RushTdSample.
 *
 * H2 EDGE: books price rush TDs on goal-line volume but miss the
 * efficiency-over-expectation signal. This bind couples the covariate bus
 * weekly NGS `rushPctOverExpected` into `RushTdSample` enrichments for
 * props-hb-rush-td.
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds rushPctOverExpected from latest prior rushing row — not week=0,
 *    not same-week.
 *  - FAILS CLOSED: no prior per-game row → dropped (`no_prior_row`).
 *  - FAILS CLOSED: null / non-finite rushPctOverExpected on the latest prior
 *    row → dropped.
 *  - boundRpoeSamples drops refused and keeps ok samples, order-preserving.
 */
import { describe, expect, it } from "vitest";
import type { CovariateRow } from "../covariate-bus.js";

import {
  RPOE_BIND_METHOD_TAG,
  bindRpoeSamples,
  boundRpoeSamples,
  type RpoeBindRequest,
  type RpoeBindResult,
} from "../props-hb-rpoe-bind.js";

function isDenied(r: RpoeBindResult): r is Extract<RpoeBindResult, { ok: false }> {
  return !r.ok;
}

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "rushing",
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
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    intRate: null,
    fumbleRate: null,
    airYardsPerAttempt: null,
    avgAirYardsToSticks: null,
    missedTackleRate: null,
    passerRating: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<RpoeBindRequest>): RpoeBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    rushTd: { rushAtt: 15, rushTds: 1 },
    ...o,
  };
}

describe("rpoe bind contract", () => {
  it("exposes the method tag and never prices", () => {
    expect(RPOE_BIND_METHOD_TAG).toBe("rpoe_bind_v1");
    const rows = [ngsRow({ week: 2, rushPctOverExpected: 38.5 })];
    const results = bindRpoeSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds rushPctOverExpected from the latest prior rushing row", () => {
    const rows = [
      ngsRow({ week: 0, rushPctOverExpected: 99 }), // season aggregate — poison
      ngsRow({ week: 1, rushPctOverExpected: 31.2 }),
      ngsRow({ week: 2, rushPctOverExpected: 38.5 }), // latest prior → kickoffWeek=3
      ngsRow({ week: 3, rushPctOverExpected: 50.0 }), // same-week → ignored
    ];
    const results = bindRpoeSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.rushPctOverExpected.value).toBe(38.5);
    expect(results[0]!.sample.rushPctOverExpected.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.rushPctOverExpected.provenance).toBe("weekly_ngs_mean");
  });

  it("passes realized model inputs through unchanged", () => {
    const rows = [ngsRow({ week: 2, rushPctOverExpected: 38.5 })];
    const results = bindRpoeSamples(rows, [
      req({ rushTd: { rushAtt: 22, rushTds: 3 } }),
    ]);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.rushAtt).toBe(22);
    expect(results[0]!.sample.rushTds).toBe(3);
  });

  it("FAILS CLOSED: no prior per-game row → no_prior_row", () => {
    const results = bindRpoeSamples(
      [ngsRow({ week: 5, rushPctOverExpected: 40 })],
      [req({ kickoffWeek: 3 })], // only row is in the future
    );
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: null rushPctOverExpected on the latest prior row", () => {
    const rows = [
      ngsRow({ week: 1, rushPctOverExpected: 31.2 }),
      ngsRow({ week: 2, rushPctOverExpected: null }), // latest prior is null
    ];
    const results = bindRpoeSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("drops refused and keeps the ok sample in a batch", () => {
    const rows = [ngsRow({ week: 2, rushPctOverExpected: 44.1 })];
    const results = bindRpoeSamples(rows, [
      req({}), // binds
      req({ gsisId: "00-9999999-2" }), // no prior → dropped
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(false);

    // boundRpoeSamples returns only the ok samples.
    const bound = boundRpoeSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ]);
    expect(bound).toHaveLength(1);
    expect(bound[0]!.rushPctOverExpected.value).toBe(44.1);
  });
});
