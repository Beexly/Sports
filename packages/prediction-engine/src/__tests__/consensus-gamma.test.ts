import { describe, it, expect } from "vitest";
import { computeConsensus } from "../consensus.js";
import type { SourceProb } from "../consensus.js";

const sp = (source: string, homeProb: number, weight = 1): SourceProb => ({ source, homeProb, weight });

describe("computeConsensus geometric mode with extremizationGamma", () => {
  it("gamma defaults to 1: matches plain geometric pool", () => {
    const probs = [sp("a", 0.6), sp("b", 0.7), sp("c", 0.55)];
    const rDefault = computeConsensus(probs, undefined, { mode: "geometric" });
    const rExplicit = computeConsensus(probs, undefined, { mode: "geometric", extremizationGamma: 1 });
    expect(rDefault.consensusHomeProb).toBe(rExplicit.consensusHomeProb);
  });

  it("gamma > 1 pushes an underconfident field more extreme than gamma = 1", () => {
    const probs = [sp("a", 0.65), sp("b", 0.7), sp("c", 0.6)];
    const r1 = computeConsensus(probs, undefined, { mode: "geometric" });
    const r2 = computeConsensus(probs, undefined, { mode: "geometric", extremizationGamma: 2 });
    expect(r2.consensusHomeProb!).toBeGreaterThan(r1.consensusHomeProb!);
    expect(r2.consensusHomeProb!).toBeLessThanOrEqual(1);
  });

  it("gamma < 1 pulls a split field toward 0.5 relative to gamma = 1", () => {
    const probs = [sp("a", 0.9), sp("b", 0.2)];
    const r1 = computeConsensus(probs, undefined, { mode: "geometric" });
    const rHalf = computeConsensus(probs, undefined, { mode: "geometric", extremizationGamma: 0.5 });
    // Both on the same side of 0.5; weaker gamma sits closer to 0.5.
    expect(Math.abs(rHalf.consensusHomeProb! - 0.5)).toBeLessThan(Math.abs(r1.consensusHomeProb! - 0.5));
  });

  it("rejects invalid gamma in geometric mode (fail closed)", () => {
    for (const g of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        computeConsensus([sp("a", 0.6), sp("b", 0.7)], undefined, { mode: "geometric", extremizationGamma: g }),
      ).toThrow();
    }
  });

  it("arithmetic mode ignores gamma entirely — incumbent path unchanged", () => {
    const probs = [sp("a", 0.4, 2), sp("b", 0.8)];
    const plain = computeConsensus(probs);
    const withGamma = computeConsensus(probs, undefined, { extremizationGamma: 3 });
    expect(plain.consensusHomeProb).toBe(withGamma.consensusHomeProb);
  });
});
