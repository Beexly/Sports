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

  it("prices trueProb on PASS by default (v5.2.1 ranking law)", () => {
    const r = deriveRankingProbability(
      70,
      ie({ decision: "PASS", trueProb: 0.4 }),
    );
    expect(r.priced).toBe(true);
    expect(r.source).toBe("blend_indep_conf");
    // w=0.7 default: 0.3*0.7 + 0.7*0.4 = 0.21 + 0.28 = 0.49
    expect(r.rankingP).toBeCloseTo(0.3 * 0.7 + 0.7 * 0.4, 5);
  });

  it("legacy SPEAK-only gate when rankOnAnyTrueProb false", () => {
    const r = deriveRankingProbability(
      70,
      ie({ decision: "PASS", trueProb: 0.4 }),
      { rankOnAnyTrueProb: false },
    );
    expect(r.source).toBe("confidence");
    expect(r.priced).toBe(false);
    expect(r.rankingScore).toBe(70);
  });

  it("blends on SPEAK by default (w=0.7)", () => {
    const r = deriveRankingProbability(
      60,
      ie({ decision: "SPEAK", trueProb: 0.8 }),
    );
    expect(r.priced).toBe(true);
    expect(r.source).toBe("blend_indep_conf");
    expect(r.rankingP).toBeCloseTo(0.3 * 0.6 + 0.7 * 0.8, 5);
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

  it("no confidence regression when trueProb null", () => {
    const r = deriveRankingProbability(
      65,
      ie({ decision: "PASS", trueProb: null }),
    );
    expect(r.rankingScore).toBe(65);
    expect(r.priced).toBe(false);
  });

  it("rankingP never uses rawEdge/shrunkEdge", () => {
    const r = deriveRankingProbability(
      60,
      ie({
        decision: "SPEAK",
        trueProb: 0.71,
        rawEdge: 0.99, // must not become rankingP
        shrunkEdge: 0.88,
      }),
      { pureOnSpeak: true, independentWeight: 1 },
    );
    expect(r.rankingP).toBeCloseTo(0.71, 5);
    expect(r.rankingP).not.toBeCloseTo(0.99, 2);
    expect(r.rankingP).not.toBeCloseTo(0.88, 2);
  });

  it("rankingP === trueProb path on LEAN with w=1", () => {
    const r = deriveRankingProbability(
      50,
      ie({ decision: "LEAN", trueProb: 0.63 }),
      { independentWeight: 1 },
    );
    expect(r.source).toBe("independent_trueProb");
    expect(r.rankingP).toBeCloseTo(0.63, 5);
  });

  it("demotes overpriced favorite (trueProb < conf) for separation", () => {
    const r = deriveRankingProbability(
      75,
      ie({ decision: "PASS", trueProb: 0.45 }),
      { independentWeight: 1 },
    );
    expect(r.rankingP).toBeCloseTo(0.45, 5);
    expect(r.rankingP).toBeLessThan(0.75);
  });
});
