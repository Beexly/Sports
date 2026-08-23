/**
 * Pressure-rate covariate bind tests.
 *
 * H1 Edge #1 — QB Pressures (hurries + hits + sacks).
 *
 * This bind couples `pressureRate` (from the covariate bus) into `PressureSample`
 * enrichments for the pressures model (props-hb-pressures).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds pressureRate from latest prior defense row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null pressureRate → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_pfr_def_mean).
 *  - Realized inputs (dropbacks, pressures) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  PRESSURE_RATE_BIND_METHOD_TAG,
  bindPressureSamples,
  boundPressureSamples,
  type PressureBindRequest,
  type PressureBindResult,
} from "../props-hb-pressure-rate-bind.js";
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
    pressureRate: 0.18,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<PressureBindRequest>): PressureBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    pressure: { dropbacks: 35, pressures: 6 },
    ...o,
  };
}

function isDenied(r: PressureBindResult): r is Extract<PressureBindResult, { ok: false }> {
  return !r.ok;
}

describe("pressure-rate bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PRESSURE_RATE_BIND_METHOD_TAG).toBe("pressure_rate_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [defenseRow({ week: 2 })];
    const results = bindPressureSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds pressureRate from latest prior defense row — not week=0, not same-week", () => {
    const rows = [
      defenseRow({ week: 0, pressureRate: 99 }), // season aggregate — poison
      defenseRow({ week: 2, pressureRate: 0.23 }),
      defenseRow({ week: 3, pressureRate: 0.50 }), // same-week — ignored
    ];
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pressureRate.value).toBe(0.23); // not 99, not 0.50
    expect(results[0]!.sample.pressureRate.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.pressureRate.provenance).toBe("weekly_pfr_def_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [defenseRow({ week: 0 })]; // only aggregate
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundPressureSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null pressureRate on the latest prior row → dropped", () => {
    const rows = [defenseRow({ week: 2, pressureRate: null })];
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite pressureRate NaN → dropped", () => {
    const rows = [defenseRow({ week: 2, pressureRate: NaN })];
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite pressureRate Infinity → dropped", () => {
    const rows = [defenseRow({ week: 2, pressureRate: Infinity })];
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (dropbacks, pressures) passed through unchanged on ok", () => {
    const rows = [defenseRow({ week: 2 })];
    const results = bindPressureSamples(rows, [req({ pressure: { dropbacks: 40, pressures: 8 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.dropbacks).toBe(40);
    expect(results[0]!.sample.pressures).toBe(8);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      defenseRow({ week: 2, pressureRate: 0.27 }),
    ];
    const results = bindPressureSamples(rows, [
      req({ gsisId: "00-0030501-2", pressure: { dropbacks: 32, pressures: 5 } }),
      req({ gsisId: "00-9999999-2", pressure: { dropbacks: 28, pressures: 7 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pressureRate.value).toBe(0.27);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundPressureSamples returns only the ok samples", () => {
    const rows = [
      defenseRow({ week: 2, pressureRate: 0.29 }),
    ];
    const results = bindPressureSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<PressureBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundPressureSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });

  it("uses statType=defense, not passing/receiving/rushing", () => {
    // A defense row at week 2 should be selected; receiving/passing/rushing rows
    // with the same gsisId must NOT satisfy the statType=defense filter.
    const rows = [
      defenseRow({ week: 2, pressureRate: 0.27 }),
      { ...defenseRow({ week: 2, pressureRate: 0.99 }), statType: "receiving" as const },
      { ...defenseRow({ week: 2, pressureRate: 0.88 }), statType: "passing" as const },
    ];
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pressureRate.value).toBe(0.27); // not 0.99, not 0.88
  });

  it("never crosses same-week boundary — kickoffWeek=2 has no prior per-game", () => {
    const rows = [defenseRow({ week: 2, pressureRate: 0.31 })]; // only same-week
    const results = bindPressureSamples(rows, [req({ kickoffWeek: 2 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });
});
