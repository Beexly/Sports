import { describe, expect, it } from "vitest";
import {
  CriticScore,
  DualModeGrounding,
  Hypothesis,
  bradleyTerryUpdate,
  criticScore,
  passesBioDiscoGate,
  spendBudget,
  temporalRediscoveryCheck,
} from "./2508-01285v2-biodisco-critic-stage";

function grounding(over: Partial<DualModeGrounding> = {}): DualModeGrounding {
  return {
    structured: {
      empiricalBaseRate: 0.55,
      empiricalN: 400,
      plausibleVsNoise: true,
      ...over.structured,
    },
    literature: {
      overlappingCorpusHits: 0,
      maxExistingSimilarity: 0.1,
      ...over.literature,
    },
  };
}

function hypothesis(over: Partial<Hypothesis> = {}): Hypothesis {
  return {
    id: "h1",
    statement: "Home underdogs off a bye cover at an elevated rate.",
    lane: "rest",
    claimedEffect: 1.5,
    claimedN: 120,
    ...over,
  };
}

describe("BioDisco critic stage", () => {
  it("admits a novel, verifiable hypothesis", () => {
    const s = criticScore(hypothesis(), grounding());
    expect(s.admitted).toBe(true);
    expect(s.novelty).toBeGreaterThan(0.4);
    expect(s.verifiability).toBeGreaterThan(0.5);
    expect(s.rationale.some((r) => r.startsWith("admitted"))).toBe(true);
  });

  it("rejects a hypothesis duplicating the corpus", () => {
    const s = criticScore(
      hypothesis(),
      grounding({
        literature: { overlappingCorpusHits: 5, maxExistingSimilarity: 0.95 },
      }),
    );
    expect(s.novelty).toBeLessThan(0.4);
    expect(s.admitted).toBe(false);
    expect(s.rationale.some((r) => r.startsWith("novelty"))).toBe(true);
  });

  it("rejects when there is no empirical base rate", () => {
    const s = criticScore(
      hypothesis(),
      grounding({
        structured: {
          empiricalBaseRate: 0,
          empiricalN: 0,
          plausibleVsNoise: false,
        },
      }),
    );
    expect(s.admitted).toBe(false);
    expect(s.verifiability).toBeLessThan(0.5);
  });

  it("rejects underpowered claimed N", () => {
    const s = criticScore(hypothesis({ claimedN: 12 }), grounding());
    expect(s.verifiability).toBeLessThan(1);
    expect(s.admitted).toBe(false);
  });

  it("spendBudget charges only admitted hypotheses", () => {
    const scores: CriticScore[] = [
      criticScore(hypothesis({ id: "a" }), grounding()),
      criticScore(
        hypothesis({ id: "b" }),
        grounding({
          literature: { overlappingCorpusHits: 5, maxExistingSimilarity: 0.99 },
        }),
      ),
    ];
    const budget = spendBudget({ spent: 0, cap: 100 }, scores, 3);
    expect(budget.spent).toBe(3); // only one admitted
  });

  it("temporalRediscoveryCheck requires >=2/3 of known edges", () => {
    const known = ["e1", "e2", "e3"];
    expect(temporalRediscoveryCheck(known, ["e1", "e2"]).passes).toBe(true);
    expect(temporalRediscoveryCheck(known, ["e1", "e2"]).fraction).toBeCloseTo(2 / 3, 9);
    expect(temporalRediscoveryCheck(known, ["e1"]).passes).toBe(false);
    expect(temporalRediscoveryCheck([], []).passes).toBe(false);
  });

  it("bradleyTerryUpdate gives the underdog winner a bigger gain", () => {
    const upsetGain = bradleyTerryUpdate(1400, 1600); // weaker beats stronger
    const expectedGain = bradleyTerryUpdate(1600, 1400);
    expect(upsetGain).toBeGreaterThan(expectedGain);
    expect(upsetGain).toBeGreaterThan(0);
    expect(expectedGain).toBeGreaterThan(0);
  });

  it("passesBioDiscoGate implements pass-rate/compute/rediscovery rule", () => {
    // Arm B matches pass rate at 50% compute, 2/3 rediscovered -> pass.
    expect(passesBioDiscoGate(0.3, 0.35, 100, 50, 0.7)).toBe(true);
    // Worse pass rate -> fail.
    expect(passesBioDiscoGate(0.3, 0.25, 100, 50, 0.7)).toBe(false);
    // Compute too high -> fail.
    expect(passesBioDiscoGate(0.3, 0.35, 100, 70, 0.7)).toBe(false);
    // Rediscovery short -> fail.
    expect(passesBioDiscoGate(0.3, 0.35, 100, 50, 0.5)).toBe(false);
  });
});
