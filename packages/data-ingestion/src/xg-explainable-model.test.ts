/**
 * Tests for ./xg-explainable-model (arXiv:2206.07212v2, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT the AP what-if layer iff Test 1 fidelity holds for >= 16 of 20 players (AP value at
 * observed mean aDOT matches actual yards-per-target within +-0.5) AND Test 2 shows AP beats the
 * global PDP by >= 0.10 Spearman points on half-2 efficiency ranking; REJECT if median player
 * curve correlation across halves < 0.7.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./xg-explainable-model";

describe("explainable xG model (arXiv:2206.07212v2)", () => {
  const play = { distanceYd: 5, angleDeg: 10, down: 2, defendersInBox: 7, isPlayAction: true, epa: 0.8 };
  it("closer is better", () => {
    const near = mod.xgAnalog({ ...play, distanceYd: 1 })!;
    const far = mod.xgAnalog({ ...play, distanceYd: 20 })!;
    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(1);
  });
  it("play action helps", () => {
    expect(mod.xgAnalog({ ...play, isPlayAction: true })!).toBeGreaterThan(mod.xgAnalog({ ...play, isPlayAction: false })!);
  });
  it("attribution sums directionally", () => {
    const base = { distanceYd: 10, angleDeg: 0, down: 1, defendersInBox: 6, isPlayAction: false };
    const a = mod.xgAttribution(play, base)!;
    expect(a["distanceYd"]).toBeGreaterThan(0);
    expect(a["defendersInBox"]).toBeLessThan(0);
  });
  it("calibration buckets", () => {
    const plays = Array.from({ length: 20 }, (_, i) => ({ ...play, distanceYd: 1 + i, epa: 1 - i * 0.05 }));
    const c = mod.xgCalibration(plays, 5);
    expect(c.reduce((s, b) => s + b.n, 0)).toBe(20);
  });
  it("isPlayShot rejects malformed", () => {
    expect(mod.isPlayShot({ ...play, down: 5 })).toBe(false);
  });
});
