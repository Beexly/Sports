/**
 * Tests for ./play-type-hmm (arXiv:1805.02501, lane=tracking).
 *
 * ACCEPTANCE GATE: ADAPT only if: on >=3 NFL games, at least one discovered cluster shows mean EPA/snap >= 0.15
 * above the game mean on >=30 plays AND the cluster-membership pattern replicates (BD/TD elbow at
 * same k +/-1) across games. Otherwise REJECT the method for NFL.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./play-type-hmm";

describe("play-type HMM (arXiv:1803.06329v1)", () => {
  it("context features normalized", () => {
    const f = mod.contextFeatures({ down: 2, distance: 7, yardline: 40, scoreDiff: 3, secondsLeft: 1800, homePossession: true })!;
    expect(f).toHaveLength(6);
    expect(f[0]).toBeCloseTo(0.5, 10);
    expect(mod.contextFeatures({ down: NaN, distance: 7, yardline: 40, scoreDiff: 3, secondsLeft: 1800, homePossession: true } as never)).toBeNull();
  });
  it("mixture run prob", () => {
    const f = [0.5, 0.35, 0.4, 0, 0.5, 1];
    const p = mod.mixtureRunProb(f, [
      { w: 0.6, beta: [1, 2, 0, -1, 0, 0.5] },
      { w: 0.4, beta: [0, 0, 0, 0, 0, 0] },
    ])!;
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(1);
    expect(mod.mixtureRunProb(f, [])).toBeNull();
  });
  it("team tendency with prior", () => {
    expect(mod.teamTendency(0, 0)).toBeCloseTo(0.5, 10);
    expect(mod.teamTendency(8, 10)).toBeCloseTo(13 / 20, 10);
    expect(mod.teamTendency(-1, 10)).toBeNull();
  });
  it("brier score", () => {
    expect(mod.brierScore([1, 0], [1, 0])).toBeCloseTo(0, 10);
    expect(mod.brierScore([0.5], [1])).toBeCloseTo(0.25, 10);
    expect(mod.brierScore([1.5], [1])).toBeNull();
  });
});
