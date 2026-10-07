/**
 * PD covariate bind tests.
 *
 * H1 Edge #3 — Pass Deflections.
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds pdRate from latest prior defense row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null pdRate → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_pfr_def_mean).
 *  - Realized inputs (games, pd) passed through unchanged on ok.
 *  - Only reads defense statType rows.
 */
import { describe, expect, it } from "vitest";

import {
  PD_RATE_BIND_METHOD_TAG,
  bindPdSamples,
  boundPdSamples,
  type PdBindRequest,
  type PdBindResult,
} from "../props-hb-pd-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function defRow(o: Partial<CovariateRow>): CovariateRow {
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
    intRate: null,
    fumbleRate: null,
    airYardsPerAttempt: null,

    avgAirYardsToSticks: null,
    missedTackleRate: null,
    passerRating: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    snapShare: null,
    tflRate: null,
    pdRate: 0.21,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<PdBindRequest>): PdBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    pd: { games: 14, pd: 18 },
    ...o,
  };
}

function isDenied(r: PdBindResult): r is Extract<PdBindResult, { ok: false }> {
  return !r.ok;
}

describe("pd-bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PD_RATE_BIND_METHOD_TAG).toBe("pd_rate_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [defRow({ week: 2 })];
    const results = bindPdSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds pdRate from latest prior defense row — not week=0, not same-week", () => {
    const rows = [
      defRow({ week: 0, pdRate: 0.99 }), // season aggregate — poison
      defRow({ week: 2, pdRate: 0.18 }),
      defRow({ week: 3, pdRate: 0.50 }), // same-week as kickoffWeek=3 — ignored
    ];
    const results = bindPdSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pdRate.value).toBe(0.18); // not 0.99, not 0.50
    expect(results[0]!.sample.pdRate.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.pdRate.provenance).toBe("weekly_pfr_def_mean");
  });

  it("FAILS CLOSED: no prior per-game defense row → sample dropped", () => {
    const rows = [defRow({ week: 0 })]; // only aggregate
    const results = bindPdSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundPdSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null pdRate on the latest prior row → dropped", () => {
    const rows = [defRow({ week: 2, pdRate: null })];
    const results = bindPdSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite pdRate → dropped", () => {
    const rows = [defRow({ week: 2, pdRate: NaN })];
    const results = bindPdSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: Infinity pdRate → dropped", () => {
    const rows = [defRow({ week: 2, pdRate: Infinity })];
    const results = bindPdSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (games, pd) passed through unchanged on ok", () => {
    const rows = [defRow({ week: 2 })];
    const results = bindPdSamples(rows, [req({ pd: { games: 12, pd: 15 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.games).toBe(12);
    expect(results[0]!.sample.pd).toBe(15);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [defRow({ week: 2, pdRate: 0.19 })];
    const results = bindPdSamples(rows, [
      req({ gsisId: "00-0030501-2", pd: { games: 14, pd: 18 } }),
      req({ gsisId: "00-9999999-2", pd: { games: 10, pd: 8 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pdRate.value).toBe(0.19);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundPdSamples returns only the ok samples", () => {
    const rows = [defRow({ week: 2, pdRate: 0.22 })];
    expect(boundPdSamples(rows, [req({}), req({ gsisId: "00-9999999-2" })])).toHaveLength(1);
  });

  it("only reads defense statType rows (ignores passing/receiving)", () => {
    const rows = [
      defRow({ week: 2, statType: "passing" as const, pdRate: 0.5 }), // wrong statType
      defRow({ week: 2, statType: "defense", pdRate: 0.18 }),
    ];
    const results = bindPdSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pdRate.value).toBe(0.18); // not 0.5
  });
});
