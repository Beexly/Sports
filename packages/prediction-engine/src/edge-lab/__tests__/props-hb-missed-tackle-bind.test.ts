/**
 * Missed-tackle covariate bind tests.
 *
 * H2 Edge — Receiving TDs (swarm-PRE-3: missed-tackle-rate -> recTD, SIGN +).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds missedTackleRate from latest prior defense row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null / non-finite missedTackleRate → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_pfr_def_mean).
 *  - Realized inputs (targets, recTds) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  MISSED_TACKLE_BIND_METHOD_TAG,
  bindMissedTackleSamples,
  boundMissedTackleSamples,
  type MissedTackleBindRequest,
  type MissedTackleBindResult,
} from "../props-hb-missed-tackle-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function defenseRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "defense",
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

    avgAirYardsToSticks: null,
    missedTackleRate: 0.11,
    passerRating: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<MissedTackleBindRequest>): MissedTackleBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    recTd: { targets: 7, recTds: 1 },
    ...o,
  };
}

function isDenied(r: MissedTackleBindResult): r is Extract<MissedTackleBindResult, { ok: false }> {
  return !r.ok;
}

describe("missed-tackle bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(MISSED_TACKLE_BIND_METHOD_TAG).toBe("missed_tackle_bind_v1");
  });

  it("priced is always false", () => {
    const results = bindMissedTackleSamples([defenseRow({ week: 2 })], [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds the strictly-prior defense row's rate — not week=0, not same-week", () => {
    const rows = [
      defenseRow({ week: 0, missedTackleRate: 0.99 }), // season aggregate — excluded
      defenseRow({ week: 1, missedTackleRate: 0.10 }),
      defenseRow({ week: 2, missedTackleRate: 0.12 }),
      defenseRow({ week: 3, missedTackleRate: 0.50 }), // same-week — excluded
    ];
    const results = bindMissedTackleSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) return;
    expect(results[0]!.sample.missedTackleRate.value).toBe(0.12);
    expect(results[0]!.sample.missedTackleRate.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.missedTackleRate.provenance).toBe("weekly_pfr_def_mean");
  });

  it("fails closed when no prior row exists at all", () => {
    const results = bindMissedTackleSamples([], [req({})]);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!)).toBe(true);
  });

  it("fails closed on null missedTackleRate", () => {
    const rows = [defenseRow({ week: 2, missedTackleRate: null })];
    const results = bindMissedTackleSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(false);
  });

  it("fails closed on non-finite missedTackleRate", () => {
    const rows = [defenseRow({ week: 2, missedTackleRate: Number.NaN })];
    const results = bindMissedTackleSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(false);
  });

  it("batch: bad rows drop, good rows bind", () => {
    const rows = [
      defenseRow({ gsisId: "A", week: 1, missedTackleRate: 0.08 }),
      defenseRow({ gsisId: "B", week: 1, missedTackleRate: null }),
      defenseRow({ gsisId: "C", week: 1, missedTackleRate: 0.15 }),
    ];
    const requests = [
      req({ gsisId: "A" }),
      req({ gsisId: "B" }),
      req({ gsisId: "C" }),
    ];
    const results = bindMissedTackleSamples(rows, requests);
    expect(results).toHaveLength(3);
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(false);
    expect(results[2]!.ok).toBe(true);
  });

  it("realized inputs pass through unchanged; bound convenience collector drops refusals", () => {
    const rows = [
      defenseRow({ gsisId: "A", week: 1, missedTackleRate: 0.08 }),
      defenseRow({ gsisId: "B", week: 1, missedTackleRate: null }),
    ];
    const samples = boundMissedTackleSamples(rows, [
      req({ gsisId: "A", recTd: { targets: 9, recTds: 2 } }),
      req({ gsisId: "B", recTd: { targets: 5, recTds: 0 } }),
    ]);
    expect(samples).toHaveLength(1);
    expect(samples[0]!.targets).toBe(9);
    expect(samples[0]!.recTds).toBe(2);
    expect(samples[0]!.missedTackleRate.value).toBe(0.08);
  });
});
