/**
 * Tests for ./twitter-bigram-sentiment (arXiv:1411.1243v1, lane=nlp).
 *
 * ACCEPTANCE GATE: ADOPT as an auxiliary feature family if the combined model beats stats-only kappa by >=0.03 on
 * the time-ordered 2024 test; REJECT if sentiment features add nothing once market lines are
 * included (the real baseline -- the paper never tested against odds).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./twitter-bigram-sentiment";

describe("twitter bigram sentiment (arXiv:1411.1243v1)", () => {
  const kickoff = Date.parse("2024-09-08T17:00:00Z");
  const rows = [
    { text: "Chiefs offense unstoppable today", team: "KC", gameId: "g1", createdAt: "2024-09-07T12:00:00Z", label: 1 },
    { text: "Chiefs defense terrible", team: "KC", gameId: "g1", createdAt: "2024-09-06T12:00:00Z", label: 0 },
    { text: "Chiefs offense loud", team: "BUF", gameId: "g1", createdAt: "2024-09-07T12:00:00Z", label: 0 },
    { text: "old tweet", team: "KC", gameId: "g1", createdAt: "2024-08-01T12:00:00Z", label: 1 },
    { text: "bad timestamp", team: "KC", gameId: "g1", createdAt: "not-a-date", label: 1 },
  ];
  it("keeps only in-window, well-formed rows", () => {
    const kept = mod.inPregameWindow(rows, kickoff, 72);
    expect(kept).toHaveLength(3);
    expect(kept.every((r) => r.text !== "old tweet" && r.text !== "bad timestamp")).toBe(true);
  });
  it("tokenizes bigrams", () => {
    expect(mod.tokenizeBigrams("Go Chiefs Go")).toEqual(["go_chiefs", "chiefs_go"]);
    expect(mod.tokenizeBigrams("hi")).toEqual([]);
  });
  it("chi-square degenerate -> null", () => {
    expect(mod.chiSquare(0, 0, 0, 0)).toBeNull();
    expect(mod.chiSquare(10, 0, 5, 0)).toBeNull();
    expect(mod.chiSquare(10, 5, 5, 10)).toBeGreaterThan(0);
  });
  it("selects team bigrams", () => {
    const kept = mod.inPregameWindow(rows, kickoff, 72);
    const grams = mod.selectTopKBigrams(kept, "KC", 5);
    expect(grams.length).toBeGreaterThan(0);
    expect(grams.length).toBeLessThanOrEqual(5);
    expect(mod.selectTopKBigrams(kept, "KC", 0)).toEqual([]);
  });
  it("aggregate sentiment bounded in [-1,1]", () => {
    expect(mod.aggregateSentiment(8, 2, 0)).toBeCloseTo(0.6, 10);
    expect(mod.aggregateSentiment(0, 0, 0)).toBeNull();
    expect(mod.aggregateSentiment(-1, 2, 3)).toBeNull();
  });
});
