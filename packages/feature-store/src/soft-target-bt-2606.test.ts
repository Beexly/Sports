import { describe, expect, it } from "vitest";
import {
  fitMarginTemperature,
  fitSoftTargetBT,
  softTarget,
  splitConformalIntervals,
  type MarginGame,
} from "./soft-target-bt-2606.js";

function games(): MarginGame[] {
  const teams = ["A", "B", "C", "D"];
  const out: MarginGame[] = [];
  for (let i = 0; i < 120; i++) {
    const home = teams[i % 4] ?? "A";
    const away = teams[(i + 1) % 4] ?? "B";
    const homeStronger = home < away;
    const margin = homeStronger ? 7 + (i % 5) : -(7 + (i % 5));
    out.push({ home, away, margin: i % 13 === 0 ? -margin : margin, regime: i % 2 === 0 ? "div" : "prime" });
  }
  return out;
}

describe("soft target bt", () => {
  const teams = ["A", "B", "C", "D"];

  it("fitMarginTemperature recovers a positive temperature", () => {
    const beta = fitMarginTemperature(games());
    expect(beta).toBeGreaterThan(0);
    expect(Number.isFinite(beta)).toBe(true);
  });

  it("softTarget maps margins to calibrated probabilities", () => {
    expect(softTarget(0, 0.2)).toBeCloseTo(0.5, 9);
    expect(softTarget(10, 0.2)).toBeGreaterThan(softTarget(3, 0.2));
    expect(softTarget(-10, 0.2)).toBeLessThan(0.5);
    expect(Number.isNaN(softTarget(5, -1))).toBe(true);
  });

  it("soft-target BT recovers team ordering without overreacting to blowouts", () => {
    const beta = fitMarginTemperature(games());
    const theta = fitSoftTargetBT(games(), teams, beta);
    expect(theta.get("A")).toBeGreaterThan(theta.get("D") ?? 0);
    // ratings stay bounded: no stretched-ruler explosion
    for (const t of teams) expect(Math.abs(theta.get(t) ?? 0)).toBeLessThan(10);
  });

  it("split-conformal intervals cover at roughly nominal rate", () => {
    const cal = Array.from({ length: 200 }, (_, i) => ({
      team: `t${i % 4}`,
      regime: i % 2 === 0 ? "div" : "prime",
      rating: 0,
      realized: ((i * 0.61803398875) % 1) * 2 - 1, // uniform(-1, 1)
    }));
    const report = splitConformalIntervals(cal, [
      { team: "t0", regime: "div", rating: 0 },
      { team: "t1", regime: "prime", rating: 0 },
    ]);
    expect(report.coverage).toBeGreaterThanOrEqual(0.85);
    expect(report.coverage).toBeLessThanOrEqual(0.95);
    expect(report.coverageOk).toBe(true);
    expect(report.medianWidth).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    expect(Number.isNaN(fitMarginTemperature([]))).toBe(true);
    const theta = fitSoftTargetBT([], teams, 0.2);
    expect(theta.get("A")).toBe(0);
    const report = splitConformalIntervals([], []);
    expect(Number.isNaN(report.coverage)).toBe(true);
    expect(report.coverageOk).toBe(false);
  });
});
