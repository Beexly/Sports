/**
 * Tests for ./caafe-context-features (arXiv:2305.03403, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADAPT the layer iff (a) 2024 held-out log-loss improves >= 0.003, AND (b) semantic-blinding
 * ablation shows >= 0.002 of that gain is attributable to semantics (LLM > hashed-name run), AND
 * (c) zero leakage-audit failures across all kept features; REJECT if any kept feature fails
 * cutoff replay, if the blinding ablation matches the semantic run, or if > 30% of proposals are
 * faulty code; budget cap <= $50/month LLM spend.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./caafe-context-features";

describe("CAAFE context features (arXiv:2305.03403)", () => {
  const series = new Map([
    ["epa", [1, 2, 3, 4]],
    ["plays", [10, 10, 10, 10]],
  ]);
  it("applies suggestions", () => {
    const r = mod.applySuggestion({ name: "epa_per_play", op: "ratio", parents: ["epa", "plays"], rationale: "efficiency" }, series)!;
    expect(r).toEqual([0.1, 0.2, 0.3, 0.4]);
    const z = mod.applySuggestion({ name: "z", op: "zscore", parents: ["epa"], rationale: "normalize" }, series)!;
    expect(z.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 8);
    expect(mod.applySuggestion({ name: "x", op: "ratio", parents: ["epa", "missing"], rationale: "r" }, series)).toBeNull();
  });
  it("rolling ops", () => {
    const m = mod.applySuggestion({ name: "rm", op: "rolling_mean", parents: ["epa"], rationale: "smooth" }, series, 2)!;
    expect(m).toEqual([1, 1.5, 2.5, 3.5]);
  });
  it("batch validation", () => {
    const { valid, errors } = mod.validateBatch(
      [
        { name: "a", op: "diff", parents: ["epa", "plays"], rationale: "r" },
        { name: "a", op: "diff", parents: ["epa", "plays"], rationale: "dup" },
        { name: "b", op: "ratio", parents: ["nope", "epa"], rationale: "r" },
        null,
      ],
      new Set(["epa", "plays"]),
    );
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(3);
  });
  it("isCaafeSuggestion rejects malformed", () => {
    expect(mod.isCaafeSuggestion({ name: "a", op: "nope", parents: [], rationale: "r" })).toBe(false);
  });
});
