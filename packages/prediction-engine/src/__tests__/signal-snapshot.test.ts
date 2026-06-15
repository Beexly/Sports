import { describe, expect, it } from "vitest";
import { buildPickSignalSnapshot } from "../signal-snapshot.js";
import type { EvidenceRecord, GameContextInput, ScoredPick, SignalCategory } from "@sports/types";

/**
 * Signal-presence flags on the pick snapshot. hadInjury/Weather/Ratings are now
 * data-driven from ACTIVE shadow evidence (same pattern as hadPlayerSignal)
 * rather than hardcoded false. These are an audit record of what was available
 * at prediction time — they do not move the confidence score.
 */

const NOW = new Date("2026-06-14T18:00:00.000Z");

function activeEvidence(sourceCategory: SignalCategory): EvidenceRecord {
  return {
    signalKey: `${sourceCategory.toLowerCase()}-signal`,
    sourceCategory,
    sourceName: `${sourceCategory.toLowerCase()}-adapter`,
    fetchedAt: NOW,
    trustLevel: 0.9,
    isBootstrap: false,
    activationStatus: "ACTIVE",
    freshnessStatus: "FRESH",
    sampleSize: 10,
    whyUsedOrBlocked: "test evidence",
  };
}

const PICK = {
  gameId: "g1",
  pickType: "SPREAD",
  bookmakerCount: 6,
  dataQualityScore: 80,
  confidence: 70,
  modelVersion: "v5.0.0",
} as unknown as ScoredPick;

function contextWith(evidence: EvidenceRecord[]): GameContextInput {
  return { shadowEvidence: evidence } as unknown as GameContextInput;
}

describe("buildPickSignalSnapshot — signal presence", () => {
  it("marks injury/weather/ratings present when their evidence is ACTIVE", () => {
    const snap = buildPickSignalSnapshot(
      "p1",
      PICK,
      contextWith([activeEvidence("INJURIES"), activeEvidence("WEATHER"), activeEvidence("RATINGS")]),
      false,
      false,
    );
    expect(snap.hadInjurySignal).toBe(true);
    expect(snap.hadWeatherSignal).toBe(true);
    expect(snap.hadRatingsSignal).toBe(true);
  });

  it("leaves them false when no such evidence is present", () => {
    const snap = buildPickSignalSnapshot("p1", PICK, contextWith([]), false, false);
    expect(snap.hadInjurySignal).toBe(false);
    expect(snap.hadWeatherSignal).toBe(false);
    expect(snap.hadRatingsSignal).toBe(false);
  });

  it("does not count non-ACTIVE (SHADOW_ONLY) evidence as present", () => {
    const shadowOnly: EvidenceRecord = { ...activeEvidence("INJURIES"), activationStatus: "SHADOW_ONLY" };
    const snap = buildPickSignalSnapshot("p1", PICK, contextWith([shadowOnly]), false, false);
    expect(snap.hadInjurySignal).toBe(false);
  });
});
