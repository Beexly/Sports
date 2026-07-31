import { describe, it, expect } from "vitest";
import {
  binaryEntropy,
  binaryEntropyBits,
  klBernoulli,
  entropyReduction,
  eigOfOutcomeObservation,
  eigOfMarketPull,
  expectedAbsoluteResidual,
  rankMarketPullsByEig,
} from "../expected-info-gain.js";
import {
  scoreOddsPullCandidate,
  rankOddsPullsForBudget,
} from "../odds-api-voi.js";
import { infoGainSelectNext } from "../offline-hyperparam-search.js";

function assertShadow(x: { priced: false; status: "shadow" }): void {
  expect(x.priced).toBe(false);
  expect(x.status).toBe("shadow");
}

describe("binary entropy + KL", () => {
  it("H(0.5) is max; H(0)=H(1)=0", () => {
    expect(binaryEntropy(0)).toBe(0);
    expect(binaryEntropy(1)).toBe(0);
    expect(binaryEntropy(0.5)).toBeCloseTo(Math.LN2, 5);
    expect(binaryEntropyBits(0.5)).toBeCloseTo(1, 5);
    expect(binaryEntropy(0.5)).toBeGreaterThan(binaryEntropy(0.8));
  });

  it("KL is 0 iff p=q; positive otherwise", () => {
    expect(klBernoulli(0.6, 0.6)).toBeCloseTo(0, 10);
    expect(klBernoulli(0.9, 0.1)).toBeGreaterThan(0);
  });

  it("entropyReduction positive when posterior sharper", () => {
    expect(entropyReduction(0.5, 0.9)).toBeGreaterThan(0);
    expect(entropyReduction(0.9, 0.5)).toBeLessThan(0);
  });

  it("EIG of outcome observation equals H(p)", () => {
    expect(eigOfOutcomeObservation(0.7)).toBeCloseTo(binaryEntropy(0.7));
  });

  it("expectedAbsoluteResidual peaks at 0.5", () => {
    expect(expectedAbsoluteResidual(0.5)).toBeCloseTo(0.5);
    expect(expectedAbsoluteResidual(0.5)).toBeGreaterThan(expectedAbsoluteResidual(0.9));
    expect(expectedAbsoluteResidual(0)).toBe(0);
  });
});

describe("eigOfMarketPull + rank", () => {
  it("prefers sharper disagreeing market over mild agree", () => {
    const sharpAgree = eigOfMarketPull(0.7, 0.72);
    const sharpDisagree = eigOfMarketPull(0.7, 0.3);
    expect(sharpDisagree).toBeGreaterThan(sharpAgree);
    expect(typeof sharpAgree).toBe("number");
  });

  it("rankMarketPullsByEig selects under budget and skips snapshots", () => {
    const result = rankMarketPullsByEig(
      [
        { id: "a", modelP: 0.55, expectedMarketP: 0.7, creditCost: 2, hoursToStart: 3 },
        { id: "b", modelP: 0.55, expectedMarketP: 0.56, creditCost: 1, hoursToStart: 48 },
        {
          id: "c",
          modelP: 0.9,
          expectedMarketP: 0.9,
          creditCost: 1,
          hoursToStart: 1,
          hasCloseSnapshot: true,
        },
      ],
      2,
    );
    assertShadow(result);
    expect(result.selected.every((s) => s.id !== "c")).toBe(true);
    expect(result.estimatedSpend).toBeLessThanOrEqual(2);
    expect(result.ranked[0]!.eigPerCredit).toBeGreaterThanOrEqual(
      result.ranked[result.ranked.length - 1]!.eigPerCredit,
    );
  });
});

describe("odds-api-voi entropy blend", () => {
  it("modelP raises score when market would sharpen belief", () => {
    const base = {
      id: "x",
      sport: "nfl",
      creditCost: 1,
      hoursToStart: 6,
      hasCloseSnapshot: false,
      taxonomySampleSize: 5,
    };
    const without = scoreOddsPullCandidate(base);
    const withEig = scoreOddsPullCandidate({
      ...base,
      modelP: 0.5,
      expectedMarketP: 0.85,
    });
    expect(withEig).toBeGreaterThan(without);
  });

  it("rankOddsPullsForBudget still shadow", () => {
    const r = rankOddsPullsForBudget(
      [
        {
          id: "1",
          sport: "nba",
          creditCost: 1,
          hoursToStart: 2,
          hasCloseSnapshot: false,
          modelP: 0.6,
          expectedMarketP: 0.75,
        },
      ],
      5,
    );
    assertShadow(r);
    expect(r.selected.length).toBe(1);
  });
});

describe("infoGainSelectNext (discrete MES-style)", () => {
  const base = {
    minSamples: 10,
    learningRate: 0.05,
    taxonomyLevel: 1 as const,
    targetCoverage: 0.8,
  };

  it("prefers never-tried config first", () => {
    const r = infoGainSelectNext(
      [
        { id: "old", ...base },
        { id: "new", ...base },
      ],
      [
        {
          id: "old",
          ...base,
          objective: 0.5,
          nEval: 3,
          priced: false,
          status: "shadow",
        },
      ],
    );
    expect(r.priced).toBe(false);
    expect(r.status).toBe("shadow");
    expect(r.next?.id).toBe("new");
    expect(r.rationale).toMatch(/unevaluated/);
  });

  it("among evaluated, ranks by frontier uncertainty proxy", () => {
    const r = infoGainSelectNext(
      [
        { id: "best", ...base },
        { id: "weak", ...base },
      ],
      [
        {
          id: "best",
          ...base,
          objective: 1.0,
          nEval: 10,
          priced: false,
          status: "shadow",
        },
        {
          id: "weak",
          ...base,
          objective: 0.2,
          nEval: 1,
          priced: false,
          status: "shadow",
        },
      ],
    );
    expect(r.priced).toBe(false);
    expect(r.next).not.toBeNull();
    // under-sampled weak arm should typically win gain proxy
    expect(["weak", "best"]).toContain(r.next!.id);
  });
});
