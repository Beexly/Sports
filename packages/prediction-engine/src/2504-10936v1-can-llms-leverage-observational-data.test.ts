/**
 * Vitest suite for arXiv:2504.10936v1 (Can LLMs Leverage Observational Data? Towards Data-Driven Causal Discovery with LLMs).
 * Gate: ADOPT the LLM proposal layer if: (a) anonymized-label LLM F1 ≥ PC F1 on synthetic; (b) LLM priors reduce NOTEARS SHD on synthetic by ≥10% or raise probe hit rate by ≥0.05; (c) per-edge cost stays under $0.50 at 35 vars. Reject if (a) fails.
 */
import { describe, it, expect } from "vitest";
import { partialCorrelation, pcTestPValue, probeEdge, ENABLED } from "./2504-10936v1-can-llms-leverage-observational-data";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2504-10936v1 closed-loop causal discovery (disabled)", () => {
  it("finds conditional independence through the confounder", () => {
    const rng = lcg(21);
    const z = Array.from({ length: 300 }, () => rng() * 4 - 2);
    const x = z.map((v) => v + (rng() - 0.5) * 0.2);
    const y = z.map((v) => -v + (rng() - 0.5) * 0.2);
    const probe = probeEdge(x, y, z);
    expect(Math.abs(probe.partialCorr)).toBeLessThan(0.15); // x _||_ y | z
    expect(probe.accepted).toBe(false);
  });
  it("accepts a genuine direct edge", () => {
    const rng = lcg(22);
    const z = Array.from({ length: 300 }, () => rng());
    const x = Array.from({ length: 300 }, () => rng() * 4 - 2);
    const y = x.map((v, i) => 2 * v + (z[i] ?? 0) * 0.1 + (rng() - 0.5) * 0.2);
    const probe = probeEdge(x, y, z);
    expect(probe.accepted).toBe(true);
    expect(() => partialCorrelation([1, 2], [1, 2], [1, 2])).toThrow();
  });
  it("is disabled pending the LLM proposal layer", () => {
    expect(ENABLED).toBe(false);
  });
});
