import { describe, expect, it } from "vitest";
import { binYardline, buildEmpiricalTransitions, valueIteration, GSE_COACH_RISK_ENABLED } from "./fourth-down-grid-2309.js";

const toy = [
  { yardline: 70, yardsToGo: 2, down: 4 as const, isGo: true, nextYardline: 74, reward: 1.0 },
  { yardline: 70, yardsToGo: 2, down: 4 as const, isGo: true, nextYardline: 74, reward: 1.0 },
  { yardline: 70, yardsToGo: 2, down: 3 as const, isGo: false, nextYardline: 74, reward: 0.8 },
];

describe("fourth-down grid", () => {
  it("bins yardlines into 5-yard buckets", () => {
    expect(binYardline(0)).toBe(0);
    expect(binYardline(99)).toBe(19);
    expect(binYardline(70)).toBe(14);
  });
  it("builds empirical transitions from go + augmented 3rd-down plays", () => {
    const ts = buildEmpiricalTransitions(toy);
    expect(ts).toHaveLength(1);
    expect(ts[0]?.action).toBe("GO");
    const succ = Object.values(ts[0]?.successors ?? {});
    expect(succ.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(ts[0]?.expectedReward).toBeCloseTo((1.0 + 1.0 + 0.8) / 3, 10);
  });
  it("value iteration converges to the Bellman fixed point", () => {
    const ts = buildEmpiricalTransitions(toy);
    const V = valueIteration(ts);
    const k = Object.keys(V)[0] ?? "";
    expect(V[k] ?? Number.NaN).toBeGreaterThan(0);
    const V2 = valueIteration(ts, 0.99, 1e-9, 10000);
    // self-loop MDP: the fixed point is r / (1 - gamma)
    expect(V2[k] ?? Number.NaN).toBeCloseTo((ts[0]?.expectedReward ?? Number.NaN) / (1 - 0.99), 3);
    // looser tolerance run agrees within the VI error bound (~tol / (1 - gamma))
    expect(V2[k] ?? Number.NaN).toBeCloseTo(V[k] ?? Number.NaN, 3);
  });
  it("handles empty input", () => {
    expect(buildEmpiricalTransitions([])).toEqual([]);
    expect(valueIteration([])).toEqual({});
  });
  it("stays off until the pre-registered study clears", () => {
    expect(GSE_COACH_RISK_ENABLED).toBe(false);
  });
});

