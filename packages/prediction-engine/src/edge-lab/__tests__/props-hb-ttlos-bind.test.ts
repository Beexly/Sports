/**
 * TtLOS covariate bind tests.
 *
 * H2 Edge — Rush Attempts (swarm-PRE-6: ttlos -> rushAttempts, SIGN − soft).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgTimeToLos from latest prior rushing row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null / undefined / non-finite avgTimeToLos → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_ngs_mean, week_t_for_tplus1).
 *  - Realized inputs (games, attempts) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  TTLOS_BIND_METHOD_TAG,
  bindTtlosSamples,
  boundTtlosSamples,
  type TtlosBindRequest,
  type TtlosBindResult,
} from "../props-hb-ttlos-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function rushRow(o: Partial<CovariateRow>): CovariateRow {
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
    avgTimeToLos: 2.4,
    avgYac: null,
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    intRate: null,
    fumbleRate: null,
    airYardsPerAttempt: null,
    missedTackleRate: null,
    passerRating: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  } as CovariateRow;
}

function req(o: Partial<TtlosBindRequest>): TtlosBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    rushAttempts: { games: 2, attempts: 31 },
    ...o,
  };
}

function isDenied(r: TtlosBindResult): r is Extract<TtlosBindResult, { ok: false }> {
  return !r.ok;
}

describe("ttlos bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(TTLOS_BIND_METHOD_TAG).toBe("ttlos_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [rushRow({ week: 2 })];
    const results = bindTtlosSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgTimeToLos from latest prior rushing row (not week=0, not same-week)", () => {
    const rows = [
      rushRow({ week: 0, avgTimeToLos: 9.9 }), // season aggregate — must be skipped
      rushRow({ week: 1, avgTimeToLos: 2.1 }),
      rushRow({ week: 2, avgTimeToLos: 2.5 }),
    ];
    const results = bindTtlosSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(true);
    if (results[0]!.ok) {
      expect(results[0]!.sample.avgTimeToLos.value).toBe(2.5); // latest strictly-prior week
    }
  });

  it("never reads the same-week row", () => {
    const rows = [rushRow({ week: 3, avgTimeToLos: 7.7 })];
    const results = bindTtlosSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("fails closed: no prior row → no_prior_row", () => {
    const rows: CovariateRow[] = [];
    const results = bindTtlosSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(false);
    if (!results[0]!.ok) expect(results[0]!.refuse).toBe("no_prior_row");
  });

  it("fails closed: null avgTimeToLos → dropped", () => {
    const rows = [rushRow({ week: 2, avgTimeToLos: null })];
    const results = bindTtlosSamples(rows, [req({})]);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("fails closed: non-finite avgTimeToLos → dropped", () => {
    const rows = [rushRow({ week: 2, avgTimeToLos: Number.NaN })];
    const results = bindTtlosSamples(rows, [req({})]);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("batch: bad row drops, good rows bind; realized inputs pass through unchanged", () => {
    const rows = [
      rushRow({ gsisId: "A", week: 2, avgTimeToLos: 2.3 }),
      rushRow({ gsisId: "B", week: 2, avgTimeToLos: null }),
      rushRow({ gsisId: "C", week: 2, avgTimeToLos: 3.1 }),
    ];
    const requests = [
      req({ gsisId: "A" }),
      req({ gsisId: "B" }),
      req({ gsisId: "C", rushAttempts: { games: 4, attempts: 55 } }),
    ];
    const results = bindTtlosSamples(rows, requests);
    expect(results.length).toBe(3);
    expect(isDenied(results[1]!)).toBe(true);
    expect(results[0]!.ok && results[2]!.ok).toBe(true);
    if (results[0]!.ok) {
      expect(results[0]!.sample.games).toBe(2);
      expect(results[0]!.sample.attempts).toBe(31);
    }
    if (results[2]!.ok) {
      expect(results[2]!.sample.games).toBe(4);
      expect(results[2]!.sample.attempts).toBe(55);
      expect(results[2]!.sample.avgTimeToLos.grain).toBe("week_t_for_tplus1");
      expect(results[2]!.sample.avgTimeToLos.provenance).toBe("weekly_ngs_mean");
    }
    // boundTtlosSamples collects only ok samples
    const bound = boundTtlosSamples(rows, requests);
    expect(bound.length).toBe(2);
    expect(bound[0]!.avgTimeToLos.value).toBe(2.3);
  });
});
