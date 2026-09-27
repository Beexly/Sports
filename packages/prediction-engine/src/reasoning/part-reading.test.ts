import { describe, expect, it } from "vitest";
import { LAC_BUF_EDGE, LAC_BUF_PARTS } from "./live-edge-registry.js";
import { readParts } from "./part-reading.js";
import { week3CandidateDecisions } from "./part-selector.js";

const REPRESENTATIVES = LAC_BUF_PARTS.map((part) => part.family);

describe("part reading", () => {
  it("reads LAC at BUF as home, with eight live parts and four dark candidates, and does not publish", () => {
    const decisions = week3CandidateDecisions(false, REPRESENTATIVES);
    const reading = readParts({
      gameId: "2026_03_LAC_BUF",
      edge: LAC_BUF_EDGE,
      parts: LAC_BUF_PARTS.map((part) => ({ id: part.family, signed: part.signed, points: part.points })),
      decisions,
      decisionTimestamp: "2026-09-27T17:00:00.000Z",
    });
    expect(reading.publishesPick).toBe(false);
    expect(reading.liveCount).toBe(8);
    expect(reading.side).toBe("home");
    expect(reading.dark.map((decision) => decision.family)).toEqual([
      "officials",
      "weather_physics",
      "narrative_contract",
      "coaching",
    ]);
    expect(reading.dark.every((decision) => decision.winning_term === "f1")).toBe(true);
    expect(reading.stored).toHaveLength(0);
    expect(reading.trace).not.toBeNull();
    expect(reading.trace?.publishablePick).toBe(false);
    expect(reading.trace?.confidenceIsProbability).toBe(false);
    expect(reading.conclusion).toContain("8 LIVE parts");
    expect(reading.conclusion).toContain("home reading");
    expect(reading.conclusion).toContain("not a pick");
  });
});
