/**
 * Vitest suite for arXiv:2504.06163v1 (Action Valuation in Sports: A Survey).
 * Gate: ADOPT the survey's recommendations into GSE's methods docs only if test (a) shows any alternative horizon beats the drive-level baseline by ≥0.005 AUC on the 2024–2025 out-of-sample window; otherwise record the taxonomy as a reference and REJECT immediate pipeline changes.
 */
import { describe, it, expect } from "vitest";
import { completionSurface, ervAt, routeValue, offBallContribution } from "./2504-06163v1-action-valuation-in-sports-a";

describe("2504-06163v1 expected route value", () => {
  const beta: [number, number, number, number] = [-1, 0.02, 0, 0.8];
  it("completion surface rises with separation", () => {
    expect(completionSurface(40, 26.65, 3, beta)).toBeGreaterThan(
      completionSurface(40, 26.65, 0.5, beta),
    );
  });
  it("a better-than-average route has positive value", () => {
    const actual = [{ x: 40, y: 26.65, sep: 3 }, { x: 45, y: 26.65, sep: 3 }];
    const avg = [{ x: 40, y: 26.65, sep: 1 }, { x: 45, y: 26.65, sep: 1 }];
    expect(routeValue(actual, avg, beta, 2)).toBeGreaterThan(0);
    expect(routeValue(avg, actual, beta, 2)).toBeLessThan(0);
    expect(() => routeValue([], avg, beta, 2)).toThrow();
  });
  it("off-ball contribution sums routes", () => {
    const r = {
      actual: [{ x: 40, y: 26.65, sep: 3 }],
      leagueAvg: [{ x: 40, y: 26.65, sep: 1 }],
    };
    expect(offBallContribution([r, r], beta, 2)).toBeCloseTo(
      2 * offBallContribution([r], beta, 2), 10,
    );
  });
});
