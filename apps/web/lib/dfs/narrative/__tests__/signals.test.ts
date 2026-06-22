import { describe, it, expect } from "vitest";
import {
  classifyNarrativeImpact,
  detectHypeInflation,
  scoreSourceReliability,
  hasFoootballMechanism,
} from "../signals";

const baseInput = {
  playerName: "Test Player",
  team: "TEST",
  claim: "Test claim",
  evidence: "Test evidence",
};

describe("classifyNarrativeImpact", () => {
  it("BIRTHDAY_GAME → CONTEXT_ONLY, projectionDelta = 0", () => {
    const result = classifyNarrativeImpact({
      ...baseInput,
      signalType: "BIRTHDAY_GAME",
      confidence: 0.8,
    });

    expect(result.impactType).toBe("CONTEXT_ONLY");
    expect(result.projectionDelta).toBe(0);
  });

  it("RETURN_FROM_INJURY → VOLUME, projectionDelta > 0 when confidence=0.8", () => {
    const result = classifyNarrativeImpact({
      ...baseInput,
      signalType: "RETURN_FROM_INJURY",
      confidence: 0.8,
    });

    expect(result.impactType).toBe("VOLUME");
    expect(result.projectionDelta).toBeGreaterThan(0);
  });

  it("MEDIA_HYPE_SPIKE → HYPE_ONLY, hypeInflationDelta > 0", () => {
    const result = classifyNarrativeImpact({
      ...baseInput,
      signalType: "MEDIA_HYPE_SPIKE",
      confidence: 0.7,
    });

    expect(result.impactType).toBe("HYPE_ONLY");
    expect(result.hypeInflationDelta).toBeGreaterThan(0);
  });
});

describe("detectHypeInflation", () => {
  it("returns warning when narrativeIntensity=0.9, projectionSupport=0.2", () => {
    const result = detectHypeInflation({
      narrativeIntensity: 0.9,
      projectionSupport: 0.2,
      ownershipImpact: 0.5,
    });

    expect(result.warning).not.toBeNull();
    expect(result.score).toBeGreaterThan(0.3);
  });

  it("returns null warning when narrativeIntensity=0.1, projectionSupport=0.9", () => {
    const result = detectHypeInflation({
      narrativeIntensity: 0.1,
      projectionSupport: 0.9,
      ownershipImpact: 0.1,
    });

    expect(result.warning).toBeNull();
  });
});

describe("scoreSourceReliability", () => {
  it("returns 0.5 for empty array", () => {
    const result = scoreSourceReliability([]);
    expect(result).toBe(0.5);
  });

  it("returns average of valid scores", () => {
    const result = scoreSourceReliability([
      { sourceType: "BEAT_REPORTER", reliabilityScore: 0.8 },
      { sourceType: "PUBLIC_SOCIAL", reliabilityScore: 0.4 },
    ]);
    expect(result).toBeCloseTo(0.6);
  });

  it("ignores null reliabilityScore entries", () => {
    const result = scoreSourceReliability([
      { sourceType: "BEAT_REPORTER", reliabilityScore: 0.8 },
      { sourceType: "PUBLIC_SOCIAL", reliabilityScore: null },
    ]);
    expect(result).toBeCloseTo(0.8);
  });
});

describe("hasFoootballMechanism", () => {
  it("returns true for RETURN_FROM_INJURY", () => {
    expect(hasFoootballMechanism("RETURN_FROM_INJURY")).toBe(true);
  });

  it("returns false for BIRTHDAY_GAME", () => {
    expect(hasFoootballMechanism("BIRTHDAY_GAME")).toBe(false);
  });

  it("returns true for all mechanism types", () => {
    const mechanismTypes = [
      "DEPTH_CHART_PROMOTION",
      "TEAMMATE_INJURY_OPPORTUNITY",
      "RETURN_FROM_INJURY",
      "RETURN_FROM_SUSPENSION",
      "TRADE_DEBUT",
      "NEW_TEAM_ROLE",
      "COACH_QUOTE",
      "BEAT_REPORT",
      "ROLE_PROMISE",
    ] as const;

    for (const type of mechanismTypes) {
      expect(hasFoootballMechanism(type)).toBe(true);
    }
  });

  it("returns false for non-mechanism types", () => {
    const nonMechanismTypes = [
      "BIRTHDAY_GAME",
      "REVENGE_GAME",
      "HOMECOMING",
      "RIVALRY_CONTEXT",
      "MEDIA_HYPE_SPIKE",
      "LOCKER_ROOM_FRICTION",
    ] as const;

    for (const type of nonMechanismTypes) {
      expect(hasFoootballMechanism(type)).toBe(false);
    }
  });
});
