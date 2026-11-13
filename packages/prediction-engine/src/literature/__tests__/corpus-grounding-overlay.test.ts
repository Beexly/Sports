/**
 * Corpus grounding -> Stage-2 overlay wiring.
 * Pure: grounding objects are constructed directly; the live DB path is
 * covered by scripts/literature/corpus-grounding-smoke.ts.
 */
import { describe, it, expect } from "vitest";
import {
  applyCorpusGroundingToFamilyDeltas,
  UNSUPPORTED_FAMILY_FLOOR,
  isRelevant,
  type GameGrounding,
  type FacetGrounding,
} from "../corpus-grounding.js";
import { runMasterSituationalReasoningOverlay } from "../../nfl/master-situational-reasoning-aggregator.js";

function facet(family: FacetGrounding["family"], support: number, errors: string[] = [], evidence = 1): FacetGrounding {
  return {
    family,
    query: family,
    facetWeight: 1,
    support,
    evidence: Array.from({ length: evidence }, () => ({ layer: "situation" as const, citation: "lit.situation:x#1", title: null, text: "t", domain: null, relevance: 1, weight: support })),
    chunkMode: "none",
    layerErrors: errors,
  };
}

function grounding(facets: FacetGrounding[]): GameGrounding {
  return { gameId: "g", facets, overallSupport: 0, coverage: 1, latencyMs: 0 };
}

const DELTAS = {
  pressure: 0.03,
  weather: -0.01,
  restFatigue: -0.02,
  coveragePersonnel: 0.025,
  qbSkillScript: 0.035,
  marketMicrostructure: 0.015,
};

describe("applyCorpusGroundingToFamilyDeltas", () => {
  it("never grows, flips or creates a delta", () => {
    const g = grounding([facet("pressure", 1), facet("weather", 0), facet("restFatigue", 0.4)]);
    const { deltas } = applyCorpusGroundingToFamilyDeltas({ pressure: 0.03, weather: -0.01, restFatigue: -0.02 }, g);
    expect(deltas.pressure).toBeCloseTo(0.03, 9);
    expect(deltas.weather).toBeCloseTo(-0.01 * UNSUPPORTED_FAMILY_FLOOR, 9);
    expect(deltas.restFatigue).toBeCloseTo(-0.02 * 0.7, 9);
    expect(Object.keys(deltas)).toEqual(["pressure", "weather", "restFatigue"]);
    for (const k of Object.keys(deltas) as (keyof typeof deltas)[]) {
      const before = { pressure: 0.03, weather: -0.01, restFatigue: -0.02 }[k];
      expect(Math.sign(deltas[k] as number)).toBe(Math.sign(before));
      expect(Math.abs(deltas[k] as number)).toBeLessThanOrEqual(Math.abs(before));
    }
  });

  it("leaves families with no facet untouched and ignores failed lookups", () => {
    const g = grounding([facet("weather", 0, ["statement: timeout"], 0)]);
    const { deltas, adjustments } = applyCorpusGroundingToFamilyDeltas({ weather: -0.01, pressure: 0.02 }, g);
    expect(deltas).toEqual({ weather: -0.01, pressure: 0.02 });
    expect(adjustments).toHaveLength(0);
  });

  it("uses the strongest facet when a family appears twice, and scales array members", () => {
    const g = grounding([facet("pressure", 0.2), facet("pressure", 0.8)]);
    const { deltas, adjustments } = applyCorpusGroundingToFamilyDeltas({ pressure: [0.01, 0.02] }, g);
    expect(adjustments[0]!.multiplier).toBeCloseTo(0.9, 6);
    expect(deltas.pressure).toEqual([0.01 * 0.9, 0.02 * 0.9]);
  });

  it("null grounding is a no-op", () => {
    expect(applyCorpusGroundingToFamilyDeltas({ pressure: 0.1 }, null).deltas).toEqual({ pressure: 0.1 });
  });
});

describe("relevance gate", () => {
  it("2 of 7 terms passes; 1 shared word never does", () => {
    const q = "short week Thursday night game rest fatigue recovery";
    expect(isRelevant(q, "Assessing player fatigue from sleep and rest days")).toBe(true);
    expect(isRelevant("betting line movement public money closing line", "Yale goal line stand")).toBe(false);
  });
});

describe("Stage-2 overlay with corpus grounding", () => {
  const base = { familyDeltas: DELTAS, marketAnchorProb: 0.56, independentEdgeDecision: "SPEAK" as const };

  it("is called, reported, and only shrinks movement", () => {
    const without = runMasterSituationalReasoningOverlay(base);
    const g = grounding([
      facet("pressure", 0.87), facet("weather", 0), facet("restFatigue", 0),
      facet("coveragePersonnel", 0.88), facet("qbSkillScript", 0.38), facet("marketMicrostructure", 0.35),
    ]);
    const withG = runMasterSituationalReasoningOverlay({ ...base, corpusGrounding: g });
    const call = withG.streamCalls.find((c) => c.stream === "corpus:applyCorpusGroundingToFamilyDeltas");
    expect(call?.called).toBe(true);
    expect(withG.corpusGrounding?.adjustments).toHaveLength(6);
    const move = (r: typeof without) => JSON.stringify(r.orthogonalization);
    expect(move(withG)).not.toEqual(move(without));
    // every adjusted family raw delta is no larger in magnitude than before
    for (const a of withG.corpusGrounding!.adjustments) {
      expect(Math.abs(a.after)).toBeLessThanOrEqual(Math.abs(a.before) + 1e-12);
    }
    expect(withG.publishAllowed).toBe(true);
  });

  it("reports skipped when no grounding is supplied, and PASS still blocks publish", () => {
    const r = runMasterSituationalReasoningOverlay({ ...base, independentEdgeDecision: "PASS", corpusGrounding: grounding([facet("pressure", 1)]) });
    expect(r.publishAllowed).toBe(false);
    const r2 = runMasterSituationalReasoningOverlay(base);
    expect(r2.streamCalls.find((c) => c.stream === "corpus:applyCorpusGroundingToFamilyDeltas")?.called).toBe(false);
  });
});
