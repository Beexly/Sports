
import { describe, expect, it } from "vitest";
import { baseRateCheck, honestyHarness } from "./base-rate-honesty";

describe("base-rate-honesty", () => {
  it("passes an honest model", () => {
    const probs = new Array(200).fill(0.5);
    const outcomes = probs.map((_, i) => (i % 2 === 0 ? 1 : 0));
    const r = baseRateCheck(probs, outcomes);
    expect(r.honest).toBe(true);
    expect(r.gap).toBeCloseTo(0, 10);
  });
  it("fails a systematically biased model with a large z", () => {
    const probs = new Array(400).fill(0.7);
    const outcomes = probs.map((_, i) => (i % 2 === 0 ? 1 : 0));
    const r = baseRateCheck(probs, outcomes, 0.02);
    expect(r.honest).toBe(false);
    expect(Math.abs(r.z)).toBeGreaterThan(5);
  });
  it("harness returns only failing slices", () => {
    const ok = { market: "ok", probs: [0.5, 0.5], outcomes: [1, 0] };
    const bad = { market: "bad", probs: [0.9, 0.9], outcomes: [0, 0] };
    const fails = honestyHarness([ok, bad], 0.02);
    expect(fails.map((f) => f.market)).toEqual(["bad"]);
  });
  it("edge cases throw", () => {
    expect(() => baseRateCheck([], [])).toThrow();
    expect(() => baseRateCheck([0.5], [1, 0])).toThrow();
  });
});
