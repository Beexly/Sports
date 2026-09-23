/**
 * Vitest suite for arXiv:2412.11158v1 (Early Concept Drift Detection via Prediction Uncertainty).
 * Gate: ADOPT the detector into the weekly pipeline if, on 2020–2025 nflverse history: (i) PUDD fires ≥1 week earlier than the error-rate baseline on ≥60% of known regime-change episodes, (ii) false-alarm rate ≤2/season, and (iii) the drift-triggered refit policy does not degrade Brier by more than 0.002 vs the frozen baseline on non-drift weeks.
 */
import { describe, it, expect } from "vitest";
import { onpUpdate, pathVariation } from "./2412-11158v1-early-concept-drift-detection-via";

describe("2412-11158v1 online Newton predictor", () => {
  it("moves weights toward the observed outcome", () => {
    const { w } = onpUpdate([0, 0], [1, 1], [1, 0.5], 1, [0, 0], 0.1);
    expect(w[0]).toBeGreaterThan(0);
    expect(w[1]).toBeGreaterThan(0);
    expect(() => onpUpdate([0], [1], [1, 2], 1, [0], 0.1)).toThrow();
  });
  it("optimistic hint accelerates the step", () => {
    const noHint = onpUpdate([0], [1], [1], 1, [0], 0.1).w[0]!;
    const withHint = onpUpdate([0], [1], [1], 1, [-0.25], 0.1).w[0]!;
    expect(withHint).toBeGreaterThan(noHint);
  });
  it("path variation is zero for a static trajectory", () => {
    expect(pathVariation([[1, 2], [1, 2]])).toBeCloseTo(0, 12);
    expect(pathVariation([[0], [3], [3]])).toBeCloseTo(3, 10);
  });
});
