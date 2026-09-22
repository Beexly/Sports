import { describe, expect, it } from "vitest";
import { parseGate, accuracyByLevel, MIN_L2_FOOTBALL, MIN_L3_FOOTBALL, GSE_CONTENT_GATE_ENABLED } from "./content-gate-harness-2402.js";

const qs = [
  { id: "q1", sport: "american_football", level: "L2" as const, scenario: false, prompt: "p", answer: "a" },
  { id: "q2", sport: "american_football", level: "L3" as const, scenario: true, prompt: "p", answer: "a" },
  { id: "q3", sport: "basketball", level: "L2" as const, scenario: false, prompt: "p", answer: "a" },
];

describe("content gate harness", () => {
  it("parse gate requires >=1000 L2 and >=200 L3 football questions", () => {
    const g = parseGate(qs);
    expect(g.ok).toBe(false);
    expect(g.l2Football).toBe(1);
    expect(g.l3Football).toBe(1);
    expect(MIN_L2_FOOTBALL).toBe(1000);
    expect(MIN_L3_FOOTBALL).toBe(200);
  });
  it("aggregates per-level accuracy per model", () => {
    const acc = accuracyByLevel(qs, [
      { questionId: "q1", model: "m1", answer: "a", correct: true },
      { questionId: "q2", model: "m1", answer: "b", correct: false },
      { questionId: "q1", model: "m2", answer: "a", correct: false },
    ], "m1");
    expect(acc.L2).toBe(1);
    expect(acc.L3).toBe(0);
    expect(acc.L1).toBe(0);
  });
  it("ignores answers to unknown questions", () => {
    const acc = accuracyByLevel(qs, [{ questionId: "zzz", model: "m1", answer: "a", correct: true }], "m1");
    expect(acc.L2).toBe(0);
  });
  it("stays off until the parse + accuracy gates clear", () => {
    expect(GSE_CONTENT_GATE_ENABLED).toBe(false);
  });
  it("handles empty input", () => {
    const g = parseGate([]);
    expect(g.ok).toBe(false);
    expect(g.l2Football).toBe(0);
    expect(accuracyByLevel([], [], "m")).toEqual({ L1: 0, L2: 0, L3: 0 });
  });
  it("handles edge inputs", () => {
    // answers for unknown questions are ignored, not counted
    const a = accuracyByLevel([], [{ questionId: "ghost", model: "m", answer: "x", correct: true }], "m");
    expect(a).toEqual({ L1: 0, L2: 0, L3: 0 });
  });
});

