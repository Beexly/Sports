/**
 * Tests for ./ingame-bettor-reaction (arXiv:2202.10085v2, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT iff on 2024: (a) the momentum-SSM beats the no-momentum SSM on per-game log-likelihood
 * with the second-half beta_t effect replicating the paper's shape, AND (b) the momentum-
 * divergence rule produces positive CLV, or (c) the one-step-ahead relative-volume forecast
 * improves RMSE by >=15%.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./ingame-bettor-reaction";

describe("in-game bettor reaction (arXiv:2202.10085v2)", () => {
  const ticks = [
    { gameId: "g", tSec: 600, scoreDiff: 7, liveSpread: 2, volume: 100 },
    { gameId: "g", tSec: 1200, scoreDiff: 14, liveSpread: 8, volume: 200 },
  ];
  it("overreaction vs implied", () => {
    const or = mod.overreaction(ticks[0]!, -3)!;
    expect(or).toBeCloseTo(2 - (-3 + 7), 10);
    expect(mod.overreaction({ ...ticks[0]!, tSec: -1 }, -3)).toBeNull();
  });
  it("volume-weighted", () => {
    const vw = mod.vwOverreaction(ticks, -3)!;
    expect(Number.isFinite(vw)).toBe(true);
    expect(mod.vwOverreaction([], -3)).toBeNull();
  });
  it("momentum run", () => {
    expect(mod.momentumRun([1, 8, 9, 10, 2], 3, 5)).toBe(true);
    expect(mod.momentumRun([1, 8, 2, 9, 1], 3, 5)).toBe(false);
    expect(mod.momentumRun([], 3, 5)).toBeNull();
  });
  it("isInGameTick rejects malformed", () => {
    expect(mod.isInGameTick({ gameId: "g" })).toBe(false);
  });
});
