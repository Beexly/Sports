/**
 * Rush-yards covariate bind tests.
 *
 * H0 item 6 — remaining process covariates from PROP_COVARIATE_GAP.
 *
 * This bind couples `pctAttemptsGte8Defenders` and `avgTimeToLos` (from the
 * covariate bus) into `RushSample` enrichments for the rushing-yards model.
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds both covariates from the latest prior rushing row — not week=0,
 *    not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null 8-in-box → dropped (never 0.5).
 *  - FAILS CLOSED: null avgTimeToLos → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness.
 *  - Realized inputs (attempts, yards) passed through unchanged.
 */
import { describe, expect, it } from "vitest";

import {
  RUSH_YARDS_BIND_METHOD_TAG,
  bindRushYardsSamples,
  boundRushYardsSamples,
  type RushYardsBindRequest,
  type RushYardsBindResult,
} from "../props-hb-rush-yards-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

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
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: null,
    pressureRate: null,
    snapShare: null,
    tflRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<RushYardsBindRequest>): RushYardsBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    rush: { attempts: 18, yards: 88 },
    ...o,
  };
}

function isDenied(r: RushYardsBindResult): r is Extract<RushYardsBindResult, { ok: false }> {
  return !r.ok;
}

describe("rush-yards bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(RUSH_YARDS_BIND_METHOD_TAG).toBe("rush_yards_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindRushYardsSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds both covariates from latest prior rushing row — not week=0, not same-week", () => {
    const rows = [
      ngsRow({ week: 0, pctAttemptsGte8Defenders: 0.99 }), // season aggregate — poison
      ngsRow({ week: 2, pctAttemptsGte8Defenders: 0.54, avgTimeToLos: 2.2 }),
      ngsRow({ week: 3, pctAttemptsGte8Defenders: 0.30, avgTimeToLos: 1.8 }), // same-week — ignored
    ];
    const results = bindRushYardsSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pctAttemptsGte8Defenders.value).toBe(0.54); // not 0.99, not 0.30
    expect(results[0]!.sample.avgTimeToLos.value).toBe(2.2); // not 1.8
    expect(results[0]!.sample.pctAttemptsGte8Defenders.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.pctAttemptsGte8Defenders.provenance).toBe("weekly_ngs_mean");
    expect(results[0]!.sample.avgTimeToLos.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.avgTimeToLos.provenance).toBe("weekly_ngs_mean");
  });

  it("FAILS CLOSED: no prior per-game row → sample dropped, never 0.5", () => {
    const rows = [ngsRow({ week: 0 })]; // only aggregate
    const results = bindRushYardsSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    // The caller never sees a 0.5 invention:
    expect(boundRushYardsSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null 8-in-box on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, pctAttemptsGte8Defenders: null })];
    const results = bindRushYardsSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: null avgTimeToLos on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToLos: null })];
    const results = bindRushYardsSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite 8-in-box → dropped", () => {
    const rows = [ngsRow({ week: 2, pctAttemptsGte8Defenders: NaN })];
    const results = bindRushYardsSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite avgTimeToLos → dropped", () => {
    const rows = [ngsRow({ week: 2, avgTimeToLos: Infinity })];
    const results = bindRushYardsSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("realized inputs (attempts, yards) passed through unchanged on ok", () => {
    const rows = [ngsRow({ week: 2 })];
    const results = bindRushYardsSamples(rows, [req({ rush: { attempts: 22, yards: 104 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.attempts).toBe(22);
    expect(results[0]!.sample.yards).toBe(104);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      ngsRow({ week: 2, pctAttemptsGte8Defenders: 0.60, avgTimeToLos: 2.4 }),
    ];
    const results = bindRushYardsSamples(rows, [
      req({ gsisId: "00-0030501-2", rush: { attempts: 18, yards: 88 } }),
      req({ gsisId: "00-9999999-2", rush: { attempts: 15, yards: 72 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.pctAttemptsGte8Defenders.value).toBe(0.60);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundRushYardsSamples returns only the ok samples", () => {
    const rows = [
      ngsRow({ week: 2, pctAttemptsGte8Defenders: 0.45, avgTimeToLos: 2.1 }),
    ];
    const results = bindRushYardsSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }), // no prior
    ]);
    expect(results.filter((r): r is Extract<RushYardsBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundRushYardsSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });
});
