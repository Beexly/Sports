import { describe, expect, it } from "vitest";
import { buildConsensusView } from "../consensus-view.js";
import type { ConsensusResult } from "../consensus.js";
import type { SignificanceResult } from "../edge-significance.js";

const base: ConsensusResult = {
  consensusHomeProb: 0.62,
  dispersion: 0.01,
  agreementScore: 0.95,
  sources: 3,
  outliers: [],
  marketDivergence: 0.07,
};

describe("buildConsensusView", () => {
  it("tokenizes a confident, home-divergent, proven, verified read", () => {
    const significance: SignificanceResult = {
      picks: 50,
      observedWins: 30,
      expectedWins: 24,
      winRatePValue: 0.01,
      trials: 2000,
      significant: true,
    };
    const view = buildConsensusView(base, { significance, proofRoot: "abc123" });
    expect(view).toMatchObject({
      consensusHomePct: 62,
      agreement: "high",
      divergenceSide: "home",
      divergencePct: 7,
      edgeProven: true,
      verification: "verified",
    });
  });

  it("maps a split field with no market and no proof to safe tokens", () => {
    const split: ConsensusResult = { ...base, agreementScore: 0.3, marketDivergence: null };
    const view = buildConsensusView(split);
    expect(view.agreement).toBe("low");
    expect(view.divergenceSide).toBe("none");
    expect(view.divergencePct).toBeNull();
    expect(view.edgeProven).toBeNull();
    expect(view.verification).toBe("unverified");
  });

  it("treats a tiny divergence as none and surfaces away-side divergence", () => {
    expect(buildConsensusView({ ...base, marketDivergence: 0.002 }).divergenceSide).toBe("none");
    expect(buildConsensusView({ ...base, marketDivergence: -0.05 }).divergenceSide).toBe("away");
  });
});
