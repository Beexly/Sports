/**
 * Aggressiveness covariate bind tests.
 *
 * H2 EDGE THESIS: books price pass TDs off season totals and calendar games,
 * missing the *how* of the throw. NGS aggressiveness is the % of a QB's throws
 * into tight coverage (<1 yd intended-receiver separation). A QB forcing throws
 * into tight windows at ~25% is threading the needle — higher TD variance AND
 * higher interception risk. The market does not separate a QB throwing TDs into
 * wide-open coverage from one forcing them into tight windows. This bind
 * couples the covariate bus weekly NGS `aggressiveness` into `PassTdSample`
 * enrichments for props-hb-pass-td.
 *
 * Tests:
 *  - Method tag + priced: false invariant.
 *  - Binds aggressiveness from the latest prior passing row — not week=0,
 *    not same-week.
 *  - FAILS CLOSED: no prior per-game row → dropped (`no_prior_row`).
 *  - FAILS CLOSED: null / NaN / non-finite aggressiveness on the latest prior
 *    row → dropped (`null_aggressiveness`), never imputed.
 *  - `boundAggressivenessSamples` drops the refused samples.
 *  - Realized inputs (attempts, passTds) passed through unchanged.
 *  - Grain + provenance correctness (week_t_for_tplus1 / weekly_ngs_mean).
 */
import { describe, expect, it } from "vitest";

import {
  AGGRESSIVENESS_BIND_METHOD_TAG,
  bindAggressivenessSamples,
  boundAggressivenessSamples,
  type AggressivenessBindRequest,
  type AggressivenessBindResult,
} from "../props-hb-aggressiveness-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
    // ── receiving (not used by passing bind)
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    // ── passing ──
    avgTimeToThrow: null,
    aggressiveness: 25.0,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    avgAirYardsToSticks: null,
    // ── rushing
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    ryoePerAtt: null,
    // ── yac
    avgYac: null,
    // ── defense (PFR)
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    intRate: null,
    fumbleRate: null,
    airYardsPerAttempt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    passerRating: null,
    missedTackleRate: null,
    // ── y-axis (NEVER exposed as p)
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<AggressivenessBindRequest>): AggressivenessBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    passTd: { attempts: 38, passTds: 4 },
    ...o,
  };
}

function isDenied(r: AggressivenessBindResult): r is Extract<AggressivenessBindResult, { ok: false }> {
  return !r.ok;
}

describe("aggressiveness bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(AGGRESSIVENESS_BIND_METHOD_TAG).toBe("aggressiveness_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindAggressivenessSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds aggressiveness from the latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, aggressiveness: 99 }), // season aggregate — poison
      ngsRow({ week: 2, aggressiveness: 18.5 }),
      ngsRow({ week: 3, aggressiveness: 5.0 }), // same-week — ignored
    ];
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.aggressiveness.value).toBe(18.5); // not 99, not 5.0
    expect(results[0]!.sample.aggressiveness.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.aggressiveness.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    // The caller never sees a 0/invented value — the convenience drops it.
    expect(boundAggressivenessSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null aggressiveness on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: null })];
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_aggressiveness");
  });

  it("FAILS CLOSED: NaN aggressiveness on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: NaN })];
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_aggressiveness");
  });

  it("FAILS CLOSED: non-finite (Infinity) aggressiveness → dropped", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: Infinity })];
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("null_aggressiveness");
  });

  it("realized inputs (attempts, passTds) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindAggressivenessSamples(rows, [
      req({ passTd: { attempts: 22, passTds: 1 } }),
    ]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(22);
    expect(results[0]!.sample.passTds).toBe(1);
    expect(results[0]!.sample.aggressiveness.value).toBe(25.0);
  });

  it("binds from the latest eligible week when several prior weeks exist", () => {
    const rows = [
      ngsRow({ week: 1, aggressiveness: 12.0 }),
      ngsRow({ week: 2, aggressiveness: 24.5 }),
      ngsRow({ week: 4, aggressiveness: 31.0 }),
    ];
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 5 })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.aggressiveness.value).toBe(31.0);
  });

  it("drops refused and keeps the ok sample in a batch", () => {
    const rows = [
      ngsRow({ week: 2, aggressiveness: 27.3 }),
    ];
    const results = bindAggressivenessSamples(rows, [
      req({}), // binds
      req({ gsisId: "00-9999999-2" }), // no prior → dropped
      req({ passTd: { attempts: 30, passTds: 2 }, kickoffWeek: 4 }), // late, still ok
    ]);
    expect(results.length).toBe(3);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.aggressiveness.value).toBe(27.3);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
    expect(results[2]!.ok).toBe(true);
    if (!results[2]!.ok) throw new Error("expected ok");
    expect(results[2]!.sample.attempts).toBe(30);

    // boundAggressivenessSamples returns only the ok samples.
    const bound = boundAggressivenessSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
      req({ passTd: { attempts: 30, passTds: 2 }, kickoffWeek: 4 }),
    ]);
    expect(bound).toHaveLength(2);
    // Both ok requests bind from the same latest prior row (week 2), so BOTH
    // samples carry aggressiveness 27.3 — only the no-prior request is dropped.
    expect(bound.filter((s) => s.aggressiveness.value === 27.3)).toHaveLength(2);
  });

  it("boundAggressivenessSamples returns only the ok samples (drops refused)", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: null })];
    const results = bindAggressivenessSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(
      results.filter((r): r is Extract<AggressivenessBindResult, { ok: true }> => r.ok),
    ).toHaveLength(0);
    expect(boundAggressivenessSamples(rows, [req({}), req({ gsisId: "00-9999999-2" })])).toHaveLength(0);
  });

  it("methodTag is attached to both ok and refused results", () => {
    const rows = [ngsRow({ week: 2 })];
    const ok = bindAggressivenessSamples(rows, [req({})])[0];
    const refused = bindAggressivenessSamples([], [req({})])[0];
    expect(ok!.methodTag).toBe(AGGRESSIVENESS_BIND_METHOD_TAG);
    expect(refused!.methodTag).toBe(AGGRESSIVENESS_BIND_METHOD_TAG);
  });

  it("refused samples never expose an aggressiveness cell (fail-closed)", () => {
    const rows = [ngsRow({ week: 2, aggressiveness: null })];
    const results = bindAggressivenessSamples(rows, [req({})]);
    expect(results[0]!.ok).toBe(false);
    // No sample to leak — the refused variant has no `sample` field.
    expect("sample" in results[0]!).toBe(false);
  });

  it("only passing rows feed the covariate (statType gate)", () => {
    // A receiving-row aggressiveness (semantically meaningless) must NOT be
    // selected: latestPriorRow requires statType === "passing".
    const rows = [
      ngsRow({ statType: "receiving", week: 2, aggressiveness: 99 }), // ignored
      ngsRow({ week: 2, aggressiveness: 19.2 }),
      ngsRow({ week: 1, aggressiveness: 10.0 }), // latest eligible is week 2
    ];
    const results = bindAggressivenessSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.aggressiveness.value).toBe(19.2);
  });
});