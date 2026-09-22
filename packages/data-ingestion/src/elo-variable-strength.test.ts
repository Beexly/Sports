/**
 * Tests for ./elo-variable-strength (arXiv:2109.15046v2, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt if variance-corrected Elo beats standard Elo log-loss by >=0.5% overall on 2019-2025
 * rolling AND by >=1.5% on top-quartile-sigma team-weeks, with no weekly refit instability (max
 * week-to-week rating swing <= 2x the baseline's).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./elo-variable-strength";

describe("Elo variable strength (arXiv:2109.15046v2)", () => {
  it("probit win prob", () => {
    expect(mod.probitWinProb(0, 0)).toBeCloseTo(0.5, 6);
    expect(mod.probitWinProb(2, 0)!).toBeGreaterThan(0.9);
    expect(mod.probitWinProb(0, 0, 0)).toBeNull();
  });
  it("win lifts strength, loss lowers", () => {
    const s0 = { theta: 0, p: 1 };
    const w = mod.strengthUpdate(s0, 0, true, true, 0.2, 0.25, 0.01)!;
    const l = mod.strengthUpdate(s0, 0, true, false, 0.2, 0.25, 0.01)!;
    expect(w.theta).toBeGreaterThan(0);
    expect(l.theta).toBeLessThan(0);
    expect(w.p).toBeLessThan(s0.p + 0.01);
  });
  it("trajectory", () => {
    const tr = mod.strengthTrajectory(
      [
        { oppTheta: 0, home: true, won: true },
        { oppTheta: 0.5, home: false, won: false },
      ],
      0.2,
      0.25,
      0.01,
    )!;
    expect(tr).toHaveLength(2);
    expect(mod.strengthTrajectory([], 0.2, 0.25, 0.01)).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.strengthUpdate({ theta: 0, p: -1 }, 0, true, true, 0.2, 0.25, 0.01)).toBeNull();
  });
});
