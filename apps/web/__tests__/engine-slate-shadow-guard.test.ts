import { describe, it, expect } from "vitest";
import {
  computeAdjustments,
  rollUpByPlayer,
  adjustmentsMayMovePublished,
  applyFantasyAdjustment,
  type PlayerContext,
  type InjuryContext,
} from "@/lib/signals/adjustment-layer";

/**
 * Shadow-scoring guard — the promotion gate of the total-signal program.
 *
 * Uncalibrated signals MUST compute (shadow) but must NEVER move a published
 * number (weight 0 until calibrated). This suite pins both halves:
 *   1. the gate stays shut for default (uncalibrated) magnitudes, and
 *   2. a nonzero shadow adjustment leaves the published projection bit-identical.
 *
 * It guards `buildEngineSlate`'s application path in
 * `apps/web/lib/fantasy/engine-slate.ts`, which routes every fantasy-points
 * adjustment through `adjustmentsMayMovePublished` + `applyFantasyAdjustment`.
 */

const NOW = "2026-09-27T12:00:00.000Z";

// A starting cornerback ruled OUT for KC: the §2 secondary-injury rule fires
// an UP fantasy_points adjustment for BUF receivers (opponent KC) and a
// defense_points_allowed adjustment for the KC DST.
function secondaryInjuryCtx() {
  const injuries: InjuryContext[] = [
    { playerId: "cb1", status: "OUT", position: "CB", team: "KC" },
  ];
  const players: PlayerContext[] = [
    {
      playerId: "wr1",
      name: "W. Receiver",
      position: "WR",
      team: "BUF",
      opponent: "KC",
      season: 2026,
      week: 3,
    },
  ];
  return { now: NOW, injuries, players };
}

/** Caller-measured magnitudes for every rule the fixture above can fire. */
const MEASURED = {
  SECONDARY_INJURY_WR_FANTASY: 3.0,
  SECONDARY_INJURY_DST_ALLOWED: 2.0,
};

describe("promotion gate: adjustmentsMayMovePublished", () => {
  it("stays SHUT for default (uncalibrated) magnitudes even when adjustments fire", () => {
    const adjustments = computeAdjustments(secondaryInjuryCtx());
    expect(adjustments.length).toBeGreaterThan(0);
    for (const a of adjustments) expect(a.calibrated).toBe(false);
    expect(adjustmentsMayMovePublished(adjustments)).toBe(false);
  });

  it("stays SHUT when only some adjustments are calibrated (all-or-nothing)", () => {
    const adjustments = computeAdjustments({
      ...secondaryInjuryCtx(),
      magnitudes: { SECONDARY_INJURY_WR_FANTASY: 3.0 },
    });
    expect(adjustments.length).toBeGreaterThan(0);
    expect(adjustments.some((a) => a.calibrated)).toBe(true);
    expect(adjustments.some((a) => !a.calibrated)).toBe(true);
    expect(adjustmentsMayMovePublished(adjustments)).toBe(false);
  });

  it("OPENS only when every adjustment carries a caller-measured magnitude", () => {
    const adjustments = computeAdjustments({
      ...secondaryInjuryCtx(),
      magnitudes: MEASURED,
    });
    expect(adjustments.length).toBeGreaterThan(0);
    for (const a of adjustments) expect(a.calibrated).toBe(true);
    expect(adjustmentsMayMovePublished(adjustments)).toBe(true);
  });

  it("stays SHUT for an empty adjustment set", () => {
    expect(adjustmentsMayMovePublished([])).toBe(false);
  });
});

describe("weight-0 enforcement: applyFantasyAdjustment", () => {
  it("leaves the published projection bit-identical when the gate is shut", () => {
    const adjustments = computeAdjustments(secondaryInjuryCtx());
    const rollup = rollUpByPlayer(adjustments);
    const fp = rollup.get("wr1")?.find((x) => x.target === "fantasy_points");
    expect(fp).toBeDefined();
    expect(fp!.net).not.toBe(0); // shadow computed a real, nonzero number...
    const proj = 15.42;
    // ...but it must not move the published projection.
    expect(
      applyFantasyAdjustment(proj, fp!.net, adjustmentsMayMovePublished(adjustments)),
    ).toBe(proj);
  });

  it("moves the projection by exactly the net when the gate is open", () => {
    const adjustments = computeAdjustments({
      ...secondaryInjuryCtx(),
      magnitudes: MEASURED,
    });
    const rollup = rollUpByPlayer(adjustments);
    const fp = rollup.get("wr1")?.find((x) => x.target === "fantasy_points");
    expect(fp!.net).toBe(3.0);
    expect(
      applyFantasyAdjustment(15.42, fp!.net, adjustmentsMayMovePublished(adjustments)),
    ).toBe(18.42);
  });

  it("is a no-op for a zero net even when the gate is open", () => {
    expect(applyFantasyAdjustment(15.42, 0, true)).toBe(15.42);
  });
});
