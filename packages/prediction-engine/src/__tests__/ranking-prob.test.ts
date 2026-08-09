import { describe, it, expect } from "vitest";
import { deriveRankingProbability } from "../ranking-prob.js";
import type { IndependentEdgeSummary } from "@sports/types";

function ie(
  partial: Partial<IndependentEdgeSummary> &
    Pick<IndependentEdgeSummary, "decision" | "trueProb">,
): IndependentEdgeSummary {
  return {
    agreement: "SOLO",
    marketFairProb: 0.5,
    rawEdge: 0.05,
    shrunkEdge: 0.03,
    expectedClv: 0.03,
    conviction: 50,
    sources: ["poisson"],
    priced: false,
    rationale: "test",
    ...partial,
  };
}

describe("deriveRankingProbability", () => {
  it("falls back to confidence when independents absent", () => {
    const r = deriveRankingProbability(70, null);
    expect(r.source).toBe("confidence");
    expect(r.priced).toBe(false);
    expect(r.rankingP).toBeCloseTo(0.7, 5);
    expect(r.rankingScore).toBe(70);
  });

  it("falls back to confidence on PASS", () => {
    const r = deriveRankingProbability(
      70,
      ie({ decision: "PASS", trueProb: 0.8 }),
    );
    expect(r.source).toBe("confidence");
    expect(r.priced).toBe(false);
    expect(r.rankingScore).toBe(70);
  });

  it("blends on SPEAK by default", () => {
    const r = deriveRankingProbability(
      60,
      ie({ decision: "SPEAK", trueProb: 0.8 }),
    );
    expect(r.priced).toBe(true);
    expect(r.source).toBe("blend_indep_conf");
    expect(r.rankingP).toBeCloseTo(0.5 * 0.6 + 0.5 * 0.8, 5);
  });

  it("blends on LEAN", () => {
    const r = deriveRankingProbability(
      50,
      ie({ decision: "LEAN", trueProb: 0.7 }),
    );
    expect(r.priced).toBe(true);
    expect(r.source).toBe("blend_indep_conf");
  });

  it("pure trueProb when pureOnSpeak", () => {
    const r = deriveRankingProbability(
      60,
      ie({ decision: "SPEAK", trueProb: 0.82 }),
      { pureOnSpeak: true },
    );
    expect(r.source).toBe("independent_trueProb");
    expect(r.rankingP).toBeCloseTo(0.82, 5);
  });

  it("no confidence regression when independents PASS with null trueProb", () => {
    const r = deriveRankingProbability(
      65,
      ie({ decision: "PASS", trueProb: null }),
    );
    expect(r.rankingScore).toBe(65);
    expect(r.priced).toBe(false);
  });
});
