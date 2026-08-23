/**
 * Sack-TTT covariate bind tests.
 *
 * H0 item 6 — remaining process covariates from PROP_COVARIATE_GAP.
 *
 * This bind couples `avgTimeToThrow` (from the covariate bus) into `SackSample`
 * enrichments for the sacks model (props-hb-sacks).
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds avgTimeToThrow from latest prior passing row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null avgTimeToThrow → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (dropbacks, sacks) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  SACK_TTT_BIND_METHOD_TAG,
  bindSackTttSamples,
  boundSackTttSamples,
  type SackTttBindRequest,
  type SackTttBindResult,
} from "../props-hb-sack-ttt-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "passing",
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    pctAttemptsGte8Defenders: null,
    avgTimeToLos: null,
    avgYac: null,
    pressureRate: null,
    snapShare: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<SackTttBindRequest>): SackTttBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    sack: { dropbacks: 35, sacks: 2 },
    ...o,
  };
}

function isDenied(r: SackTttBindResult): r is Extract<SackTttBindResult, { ok: false }> {
  return !r.ok;
}

describe("sack-ttt bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(SACK_TTT_BIND_METHOD_TAG).toBe("sack_ttt_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindSackTttSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds avgTimeToThrow from latest prior passing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, avgTimeToThrow: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgTimeToThrow: 2.3 }),
      ngsRow({ week: 3, avgTimeToThrow: 5.0 }), // same-week — ignored
    ];
    const results = bindSackTttSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgTimeToThrow.value).toBe(2.3); // not 99, not 5.0
    expect(results[0]!.sample.avgTimeToThrow.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgTimeToThrow.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindSackTttSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundSackTttSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null avgTimeToThrow on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: null })];
    const results = bindSackTttSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgTimeToThrow → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: NaN })];
    const results = bindSackTttSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgTimeToThrow Infinity → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToThrow: Infinity })];
    const results = bindSackTttSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (dropbacks, sacks) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindSackTttSamples(rows, [req({ sack: { dropbacks: 40, sacks: 3 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.dropbacks).toBe(40);
    expect(results[0]!.sample.sacks).toBe(3);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, avgTimeToThrow: 2.7 }),
    ];
    const results = bindSackTttSamples(rows, [
      req({ gsisId: "00-0030501-2", sack: { dropbacks: 32, sacks: 1 } }),
      req({ gsisId: "00-9999999-2", sack: { dropbacks: 28, sacks: 3 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgTimeToThrow.value).toBe(2.7);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundSackTttSamples returns only the ok samples", () => {
    const rows = [
      ngsRow({ week: 2, avgTimeToThrow: 2.9 }),
    ];
    const results = bindSackTttSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<SackTttBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundSackTttSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });
});
