import { describe, expect, it } from "vitest";

import {
  CONSTRAINT_SPACES,
  ENABLED,
  combinationBrier,
  conformalSelectionStability,
  fitConstrainedWeights,
  pickWinner,
  projectWeights,
  weightConstraintHorseRace,
} from "@/lib/calibration/2510-26456v1-weight-constraint-horserace";

describe("weight-constraint horse race", () => {
  it("is disabled by default; five constraint spaces", () => {
    expect(ENABLED).toBe(false);
    expect(CONSTRAINT_SPACES.length).toBe(5);
  });

  it("projectWeights enforces each constraint space", () => {
    const w = [0.6, 0.6, -0.2];
    const simplex = projectWeights(w, "simplex");
    expect(simplex.every((x) => x >= 0)).toBe(true);
    expect(simplex.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(projectWeights(w, "equal")).toEqual([1 / 3, 1 / 3, 1 / 3]);
    const box = projectWeights(w, "box01");
    expect(box.every((x) => x >= 0 && x <= 1)).toBe(true);
    const l1 = projectWeights([2, 2, 2], "l1cap");
    expect(l1.reduce((a, x) => a + Math.abs(x), 0)).toBeCloseTo(1, 10);
  });

  it("fitted weights beat equal weights when models differ in skill", () => {
    const ys = [1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0];
    const good = ys.map((y) => (y === 1 ? 0.8 : 0.2));
    const bad = ys.map((y) => (y === 1 ? 0.3 : 0.7));
    const pm = [good, bad];
    const wFit = fitConstrainedWeights(pm, ys, "simplex");
    const bFit = combinationBrier(pm, ys, wFit);
    const bEq = combinationBrier(pm, ys, [0.5, 0.5]);
    expect(bFit).toBeLessThan(bEq);
    expect(wFit[0]).toBeGreaterThan(wFit[1]);
  });

  it("horse race + winner selection run on three-way splits", () => {
    const ys = Array.from({ length: 60 }, (_, i) => i % 2);
    const good = ys.map((y) => (y === 1 ? 0.75 : 0.25));
    const bad = ys.map((y) => (y === 1 ? 0.4 : 0.6));
    const pm = [good, bad];
    const fitIdx = Array.from({ length: 30 }, (_, i) => i);
    const selectIdx = Array.from({ length: 30 }, (_, i) => 30 + i);
    const results = weightConstraintHorseRace(pm, ys, fitIdx, selectIdx);
    expect(results.length).toBe(5);
    const winner = pickWinner(results);
    expect(winner.brierSelect).toBeLessThanOrEqual(
      Math.min(...results.map((r) => r.brierSelect)) + 1e-12,
    );
  });

  it("conformal selection stability reports win rate", () => {
    const ys = Array.from({ length: 60 }, (_, i) => i % 2);
    const good = ys.map((y) => (y === 1 ? 0.75 : 0.25));
    const bad = ys.map((y) => (y === 1 ? 0.4 : 0.6));
    const pm = [good, bad];
    const fitIdx = Array.from({ length: 30 }, (_, i) => i);
    const selectIdx = Array.from({ length: 30 }, (_, i) => 30 + i);
    const { winRate, stable } = conformalSelectionStability(pm, ys, fitIdx, selectIdx, 10, 4);
    expect(winRate).toBeGreaterThan(0);
    expect(winRate).toBeLessThanOrEqual(1);
    expect(stable).toBe(winRate >= 0.6);
  });
});
