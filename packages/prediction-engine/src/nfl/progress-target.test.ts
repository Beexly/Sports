import { describe, expect, it } from "vitest";
import { driveProgress, incrementalRSquared, playProgress } from "./progress-target";

describe("progress-target", () => {
  it("a first-down conversion scores ≥ 1 minus the down penalty", () => {
    expect(playProgress(10, 10, 1)).toBeCloseTo(1, 12); // no penalty on 1st
    expect(playProgress(10, 10, 4)).toBeLessThan(1); // quadratic penalty on 4th
    expect(playProgress(5, 10, 2)).toBeCloseTo(0.5 - 0.1 * (1 / 3) ** 2, 10);
  });

  it("later downs are penalized more (quadratic)", () => {
    const p2 = playProgress(8, 10, 2);
    const p3 = playProgress(8, 10, 3);
    const p4 = playProgress(8, 10, 4);
    expect(p2 - p3).toBeLessThan(p3 - p4); // penalty accelerates
  });

  it("negative plays score negative", () => {
    expect(playProgress(-5, 10, 1)).toBeLessThan(0);
  });

  it("rejects bad inputs", () => {
    expect(() => playProgress(5, 0, 1)).toThrow();
    expect(() => playProgress(5, 10, 5 as 1)).toThrow();
  });

  it("drive progress averages the plays; empty drive is 0", () => {
    const d = driveProgress([
      { yardsGained: 10, yardsToGo: 10, down: 1 },
      { yardsGained: 5, yardsToGo: 10, down: 2 },
    ]);
    expect(d).toBeCloseTo((1 + (0.5 - 0.1 / 9)) / 2, 10);
    expect(driveProgress([])).toBe(0);
  });

  it("incremental R² is positive when progress helps", () => {
    const actual = [3, 7, 0, 3, 7];
    const epaOnly = [2, 6, 1, 2, 6];
    const full = [2.8, 6.8, 0.2, 2.8, 6.8];
    expect(incrementalRSquared(actual, epaOnly, full)).toBeGreaterThan(0);
    expect(() => incrementalRSquared([1], [1, 2], [1])).toThrow();
  });
});
