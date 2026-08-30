/**
 * Sticks (air-yards-to-the-sticks) covariate bind tests.
 *
 * H2 Edge — Completions (swarm-PRE-7: sticks -> completions, SIGN − soft).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgAirYardsToSticks from latest prior passing row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null / undefined / non-finite avgAirYardsToSticks → dropped.
 *  - Batch: bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_ngs_mean, week_t_for_tplus1).
 *  - Realized inputs (attempts, completions) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  STICKS_BIND_METHOD_TAG,
  bindSticksSamples,
  boundSticksSamples,
  type SticksBindRequest,
  type SticksBindResult,
} from "../props-hb-sticks-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function passingRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
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

function req(o: Partial<SticksBindRequest>): SticksBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    comp: { attempts: 32, completions: 21 },
    ...o,
  };
}

function isDenied(r: SticksBindResult): r is Extract<SticksBindResult, { ok: false }> {
  return !r.ok;
}

describe("sticks bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(STICKS_BIND_METHOD_TAG).toBe("sticks_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [passingRow({ week: 2 })];
    const results = bindSticksSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgAirYardsToSticks from latest prior passing row (not week=0, not same-week)", () => {
    const rows = [
      passingRow({ week: 0, avgAirYardsToSticks: 99 }), // season aggregate — must be skipped
      passingRow({ week: 1, avgAirYardsToSticks: 4.2 }),
      passingRow({ week: 2, avgAirYardsToSticks: 5.6 }),
    ];
    const results = bindSticksSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(true);
    if (results[0]!.ok) {
      expect(results[0]!.sample.avgAirYardsToSticks.value).toBe(5.6); // latest strictly-prior week
    }
  });

  it("never reads the same-week row", () => {
    const rows = [passingRow({ week: 3, avgAirYardsToSticks: 42 })];
    const results = bindSticksSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("fails closed: no prior row → no_prior_row", () => {
    const rows: CovariateRow[] = [];
    const results = bindSticksSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(false);
    if (!results[0]!.ok) expect(results[0]!.refuse).toBe("no_prior_row");
  });

  it("fails closed: null avgAirYardsToSticks → dropped", () => {
    const rows = [passingRow({ week: 2, avgAirYardsToSticks: null })];
    const results = bindSticksSamples(rows, [req({})]);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("fails closed: non-finite avgAirYardsToSticks → dropped", () => {
    const rows = [passingRow({ week: 2, avgAirYardsToSticks: Number.POSITIVE_INFINITY })];
    const results = bindSticksSamples(rows, [req({})]);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("batch: bad row drops, good rows bind; realized inputs pass through unchanged", () => {
    const rows = [
      passingRow({ gsisId: "A", week: 2, avgAirYardsToSticks: 3.9 }),
      passingRow({ gsisId: "B", week: 2, avgAirYardsToSticks: null }),
      passingRow({ gsisId: "C", week: 2, avgAirYardsToSticks: 6.4 }),
    ];
    const requests = [
      req({ gsisId: "A" }),
      req({ gsisId: "B" }),
      req({ gsisId: "C", comp: { attempts: 40, completions: 25 } }),
    ];
    const results = bindSticksSamples(rows, requests);
    expect(results.length).toBe(3);
    expect(isDenied(results[1]!)).toBe(true);
    expect(results[0]!.ok && results[2]!.ok).toBe(true);
    if (results[0]!.ok) {
      expect(results[0]!.sample.attempts).toBe(32);
      expect(results[0]!.sample.completions).toBe(21);
    }
    if (results[2]!.ok) {
      expect(results[2]!.sample.attempts).toBe(40);
      expect(results[2]!.sample.completions).toBe(25);
      expect(results[2]!.sample.avgAirYardsToSticks.grain).toBe("week_t_for_tplus1");
      expect(results[2]!.sample.avgAirYardsToSticks.provenance).toBe("weekly_ngs_mean");
    }
    // boundSticksSamples collects only ok samples
    const bound = boundSticksSamples(rows, requests);
    expect(bound.length).toBe(2);
    expect(bound[0]!.avgAirYardsToSticks.value).toBe(3.9);
  });
});
