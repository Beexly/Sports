import { describe, expect, it } from "vitest";
import { LAC_BUF_EDGE, LAC_BUF_PARTS } from "./live-edge-registry.js";
import { readParts } from "./part-reading.js";
import { week3CandidateDecisions } from "./part-selector.js";

const REPRESENTATIVES = LAC_BUF_PARTS.filter((part) => part.family !== "narrative_contract").map(
  (part) => part.family,
);

describe("part reading", () => {
  it("reads LAC at BUF as home, with nine live parts and three dark candidates, and does not publish", () => {
    // week3CandidateDecisions takes the pre-promotion representative roster:
    // a family holding a registry row must not darken its own candidate.
    const decisions = week3CandidateDecisions(false, REPRESENTATIVES);
    const reading = readParts({
      gameId: "2026_03_LAC_BUF",
      edge: LAC_BUF_EDGE,
      parts: LAC_BUF_PARTS.map((part) => ({ id: part.family, signed: part.signed, points: part.points })),
      decisions,
      decisionTimestamp: "2026-09-27T17:00:00.000Z",
    });
    expect(reading.publishesPick).toBe(false);
    expect(reading.liveCount).toBe(9);
    expect(reading.side).toBe("home");
    expect(reading.dark.map((decision) => decision.family)).toEqual([
      "officials",
      "weather_physics",
      "coaching",
    ]);
    expect(reading.dark.every((decision) => decision.winning_term === "f1")).toBe(true);
    expect(reading.stored).toHaveLength(0);
    expect(reading.trace).not.toBeNull();
    expect(reading.trace?.publishablePick).toBe(false);
    expect(reading.trace?.confidenceIsProbability).toBe(false);
    expect(reading.conclusion).toContain("9 LIVE parts");
    expect(reading.conclusion).toContain("home reading");
    expect(reading.conclusion).toContain("not a pick");
  });
});
