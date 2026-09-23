/**
 * Tests for ./2510-18173-news-scoring (arXiv:2510.18173, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT the T3 recipe (tuple extraction + rule-based compiler + HOI) with the two hardening modifications (evidence spans, conflict flagging); the raw T3 is rejected for production without them.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2510-18173-news-scoring";

describe("2510-18173 1722 Moneyball with LLMs: analyzing tabular", () => {
  it("5-dimension rubric clamps and fails closed", () => {
    const s = mod.scoreNewsDimensions({ relevance: 1.5, sentiment: -0.2, novelty: 0.5, credibility: 0.8, impact: 0.3 });
    expect(s).not.toBeNull();
    expect(s!.relevance).toBe(1);
    expect(s!.sentiment).toBe(0);
    expect(mod.scoreNewsDimensions({ relevance: NaN, sentiment: 0.5, novelty: 0.5, credibility: 0.5, impact: 0.5 })).toBeNull();
    expect(mod.scoreNewsDimensions({ relevance: 0.5, sentiment: 0.5, novelty: 0.5, credibility: 0.5 })).toBeNull();
  });
  it("aggregation weights recent articles exponentially", () => {
    const fresh = { relevance: 1, sentiment: 1, novelty: 1, credibility: 1, impact: 1 };
    const stale = { relevance: 0, sentiment: 0, novelty: 0, credibility: 0, impact: 0 };
    const agg = mod.aggregateNewsScores([fresh, stale], [0, 1000], 1);
    expect(agg).not.toBeNull();
    expect(agg!.relevance).toBeGreaterThan(0.999);
    expect(mod.aggregateNewsScores([fresh], [0], 0)).toBeNull();
  });
  it("lag decay is 1 at lag 0 and decays", () => {
    expect(mod.lagDecayWeight(0, 0.5)).toBeCloseTo(1, 10);
    expect(mod.lagDecayWeight(2, 0.5)).toBeCloseTo(Math.exp(-1), 10);
    expect(mod.lagDecayWeight(-1, 0.5)).toBeNull();
  });
  it("steam edge is positive for same-direction moves", () => {
    expect(mod.steamPropagationEdge(2, 1, 0)).toBeCloseTo(0.5, 10);
    expect(mod.steamPropagationEdge(2, -1, 0)).toBeCloseTo(-0.5, 10);
    expect(mod.steamPropagationEdge(2, 1, 6)).toBeCloseTo(0.25, 10);
    expect(mod.steamPropagationEdge(0, 1, 0)).toBeNull();
  });
});
