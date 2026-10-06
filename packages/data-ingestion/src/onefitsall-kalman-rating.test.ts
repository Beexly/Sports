/**
 * Tests for ./onefitsall-kalman-rating (arXiv:2104.14012v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt if vSKF beats SG-Elo log-score by >=0.3% in the converged window OR reaches 90%-of-final
 * ratings >=2 games faster on average (the paper's Fig. 5 effect). Reject if neither holds on
 * 2018-2025 data: plain Elo remains the GSE default.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./onefitsall-kalman-rating";

describe("one-fits-all Kalman rating (arXiv:2104.14012v1)", () => {
  it("update pulls toward observation", () => {
    const s = mod.kalmanUpdate({ theta: 0, p: 1 }, 10, 1, 0)!;
    expect(s.theta).toBeGreaterThan(0);
    expect(s.p).toBeLessThan(1);
    expect(mod.kalmanUpdate({ theta: 0, p: -1 }, 10, 1, 0)).toBeNull();
  });
  it("season processes games", () => {
    const states = mod.kalmanSeason(
      [
        { margin: 7, home: true },
        { margin: -3, home: false },
        { margin: 10, home: true },
      ],
      25,
      1,
    )!;
    expect(states).toHaveLength(3);
    expect(states[2]!.theta).toBeGreaterThan(0);
    expect(mod.kalmanSeason([], 25, 1)).toBeNull();
  });
  it("steady-state gain and memory", () => {
    const K = mod.steadyStateGain(25, 1)!;
    expect(K).toBeGreaterThan(0);
    expect(K).toBeLessThan(1);
    expect(mod.effectiveMemory(25, 1)!).toBeCloseTo(1 / K, 8);
    expect(mod.steadyStateGain(25, 0)).toBe(0);
  });
});
