/**
 * Defensive snap-share covariate bind tests.
 *
 * H1 Edge #4 — Defensive snap share %.
 *
 * Tests cover:
 *  - Method tag + priced: false invariant.
 *  - Binds snapShare from latest prior defense row — not week=0, not same-week.
 *  - FAILS CLOSED: no prior per-game row → sample dropped.
 *  - FAILS CLOSED: null snapShare → dropped.
 *  - Non-finite values → dropped.
 *  - Batch: one bad row drops, good rows bind.
 *  - Grain + provenance correctness (weekly_pfr_def_mean).
 *  - Realized inputs (games, snaps) passed through unchanged on ok.
 */
import { describe, expect, it } from "vitest";

import {
  DEF_SNAP_SHARE_BIND_METHOD_TAG,
  bindSnapShareSamples,
  boundSnapShareSamples,
  type SnapShareBindRequest,
  type SnapShareBindResult,
} from "../props-hb-def-snap-share-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function defRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "defense",
    snapShare: 0.68,
    tflRate: null,
    pdRate: null,
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
    avgExpectedYac: null,
    expectedRushYards: null,
    ...o,
  };
}

function req(o: Partial<SnapShareBindRequest>): SnapShareBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    snap: { games: 14, snaps: 620 },
    ...o,
  };
}

function isDenied(r: SnapShareBindResult): r is Extract<SnapShareBindResult, { ok: false }> {
  return !r.ok;
}

describe("def snap-share bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(DEF_SNAP_SHARE_BIND_METHOD_TAG).toBe("def_snap_share_bind_v1");
  });

  it("priced is always false", () => {
    const rows = [defRow({ week: 2 })];
    const results = bindSnapShareSamples(rows, [req({})]);
    expect(results[0]!.priced).toBe(false);
  });

  it("binds snapShare from latest prior defense row — not week=0, not same-week", () => {
    const rows = [
      defRow({ week: 0, snapShare: 0.99 }), // season aggregate — poison
      defRow({ week: 2, snapShare: 0.62 }),
      defRow({ week: 3, snapShare: 0.95 }), // same-week — ignored
    ];
    const results = bindSnapShareSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.snapShare.value).toBe(0.62); // not 0.99, not 0.95
    expect(results[0]!.sample.snapShare.grain).toBe("week_t_for_tplus1");
    expect(results[0]!.sample.snapShare.provenance).toBe("weekly_pfr_def_mean");
  });

  it("FAILS CLOSED: no prior per-game defense row → sample dropped", () => {
    const rows = [defRow({ week: 0 })]; // only aggregate
    const results = bindSnapShareSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    expect(boundSnapShareSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null snapShare on the latest prior row → dropped", () => {
    const rows = [defRow({ week: 2, snapShare: null })];
    const results = bindSnapShareSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
  });

  it("FAILS CLOSED: non-finite snapShare → dropped", () => {
    const rows = [defRow({ week: 2, snapShare: NaN })];
    const results = bindSnapShareSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
  });

  it("realized inputs (games, snaps) passed through unchanged on ok", () => {
    const rows = [defRow({ week: 2 })];
    const results = bindSnapShareSamples(rows, [req({ snap: { games: 14, snaps: 620 } })]);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.games).toBe(14);
    expect(results[0]!.sample.snaps).toBe(620);
  });

  it("batch: one bad row drops, good rows bind", () => {
    const rows = [
      defRow({ week: 2, snapShare: 0.71 }),
    ];
    const results = bindSnapShareSamples(rows, [
      req({ gsisId: "00-0030501-2", snap: { games: 14, snaps: 620 } }),
      req({ gsisId: "00-9999999-2", snap: { games: 10, snaps: 400 } }), // no prior row
    ]);
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.snapShare.value).toBe(0.71);
    expect(results[1]!.ok).toBe(false);
    expect(isDenied(results[1]!) ? results[1]!.refuse : "ok").toBe("no_prior_row");
  });

  it("boundSnapShareSamples returns only the ok samples", () => {
    const rows = [defRow({ week: 2, snapShare: 0.73 })];
    const results = bindSnapShareSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ]);
    expect(results.filter((r): r is Extract<SnapShareBindResult, { ok: true }> => r.ok)).toHaveLength(1);
    expect(boundSnapShareSamples(rows, [
      req({}),
      req({ gsisId: "00-9999999-2" }),
    ])).toHaveLength(1);
  });
});
