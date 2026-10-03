/**
 * Vitest suite for arXiv:2609.13564v1 (When Greedy Sampling Explores: KL-Regularized Contextual Bandits without Eluder-Dimension Dependence).
 * Gate: ADOPT the greedy-Gibbs selection layer only if it beats the epsilon-greedy baseline by >=2% cumulative CLV on the full 2024-2025 replay with >=500 decisions; otherwise REJECT. Pre-registered before running.
 */
import { describe, it, expect } from "vitest";
import { gibbsPolicy, sampleArm, cumulativeClv } from "./2609-13564v1-when-greedy-sampling-explores-klregularized";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2609-13564v1 contextual Gibbs pick selection", () => {
  const arms = [
    { id: "abstain", x: [0, 0], piRef: 0.2 },
    { id: "edge-a", x: [1, 0.5], piRef: 0.4 },
    { id: "edge-b", x: [0.2, 0.1], piRef: 0.4 },
  ];
  const rhat = (a: { x: number[] }) => (a.x[0] ?? 0) * 2 + (a.x[1] ?? 0);
  it("concentrates on the high-reward arm as eta grows", () => {
    const low = gibbsPolicy(arms, rhat, 0.1);
    const high = gibbsPolicy(arms, rhat, 5);
    expect(high.get("edge-a")).toBeGreaterThan(low.get("edge-a") ?? 0);
    expect(high.get("edge-a")).toBeGreaterThan(0.9);
  });
  it("eta=0 reproduces the reference policy", () => {
    const p = gibbsPolicy(arms, rhat, 0);
    expect(p.get("edge-a")).toBeCloseTo(0.4, 10);
  });
  it("samples arms proportionally and sums CLV", () => {
    const pol = gibbsPolicy(arms, rhat, 2);
    const rng = lcg(3);
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      const id = sampleArm(pol, rng);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect((counts.get("edge-a") ?? 0)).toBeGreaterThan(counts.get("abstain") ?? 0);
    expect(cumulativeClv([{ armId: "a", clv: 0.02 }, { armId: "b", clv: -0.01 }])).toBeCloseTo(0.01, 12);
    expect(() => gibbsPolicy([], rhat, 1)).toThrow();
  });
});
