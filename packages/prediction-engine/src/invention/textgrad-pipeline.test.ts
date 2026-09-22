import { describe, it, expect } from "vitest";
import {
  backwardStep,
  countTokens,
  tgdStep,
  clipLineChanges,
  minibatchLoss,
  concatGradients,
  iterationsExhausted,
  type TextVariable,
} from "./textgrad-pipeline.js";

// ============================================================
// arXiv 2406.07496v1 — TextGrad pipeline. Additive invention.
// ============================================================

const diag = {
  deltaBrier: 0.001,
  failedFolds: ["2024", "2025"],
  sampleSizes: { weather: 12, rest: 200 },
  calibrationSlope: 0.7,
};

describe("textgrad pipeline — 2406.07496v1", () => {
  it("backwardStep turns diagnostics into targeted criticism", () => {
    const c = backwardStep("SignalCode", diag);
    expect(c.targetVariable).toBe("SignalCode");
    expect(c.text).toContain("2024");
    expect(c.text).toContain("weather");
    expect(c.text).toContain("0.70");
  });

  it("backwardStep praises a clean diagnostic", () => {
    const c = backwardStep("IdeaPrompt", {
      deltaBrier: 0.005,
      failedFolds: [],
      sampleSizes: { all: 500 },
      calibrationSlope: 1.0,
    });
    expect(c.text).toContain("keep the structure");
  });

  it("countTokens counts words", () => {
    expect(countTokens("a b c")).toBe(3);
    expect(countTokens("")).toBe(0);
    expect(countTokens("  ")).toBe(0);
  });

  it("tgdStep appends a clipped revision block", () => {
    const v: TextVariable = { name: "IdeaPrompt", value: "base", requiresGrad: true };
    const updated = tgdStep(v, { targetVariable: "IdeaPrompt", text: "one two three four five" }, 3);
    expect(updated.value).toContain("[REVISION for IdeaPrompt: one two three]");
    expect(updated.value).not.toContain("four");
    expect(updated.value.startsWith("base")).toBe(true);
  });

  it("tgdStep skips frozen variables", () => {
    const v: TextVariable = { name: "X", value: "base", requiresGrad: false };
    expect(tgdStep(v, { targetVariable: "X", text: "criticism" }, 10).value).toBe("base");
  });

  it("clipLineChanges caps the edit size", () => {
    const code = "l1\nl2\nl3\nl4";
    expect(clipLineChanges(code, 2)).toBe("l1\nl2");
    expect(clipLineChanges(code, 10)).toBe(code);
  });

  it("minibatchLoss sums negative deltaBriers", () => {
    expect(minibatchLoss([0.003, 0.001])).toBeCloseTo(-0.004, 10);
    expect(minibatchLoss([])).toBe(0);
  });

  it("concatGradients merges per-idea criticisms", () => {
    const g = concatGradients([
      { targetVariable: "IdeaPrompt", text: "crit A" },
      { targetVariable: "IdeaPrompt", text: "crit B" },
    ]);
    expect(g.text).toContain("crit A");
    expect(g.text).toContain("crit B");
    expect(g.targetVariable).toBe("IdeaPrompt");
  });

  it("iterationsExhausted enforces the 5-iteration budget", () => {
    expect(iterationsExhausted(4)).toBe(false);
    expect(iterationsExhausted(5)).toBe(true);
  });
});
