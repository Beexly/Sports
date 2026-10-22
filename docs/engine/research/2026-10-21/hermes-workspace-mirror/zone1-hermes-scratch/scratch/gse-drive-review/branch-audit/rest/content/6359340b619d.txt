import { describe, expect, it } from "vitest";
import { buildPickSignalSnapshot } from "../signal-snapshot.js";
import type { AtsFormBucket, EvidenceRecord, GameContextInput, ScoredPick, SignalCategory } from "@sports/types";

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

const TOTAL_PICK = {
  ...(PICK as unknown as Record<string, unknown>),
  pickType: "TOTAL",
} as unknown as ScoredPick;

function contextWith(evidence: EvidenceRecord[]): GameContextInput {
  return { shadowEvidence: evidence } as unknown as GameContextInput;
}

function atsBucket(sampleSize: number): AtsFormBucket {
  return { wins: 0, losses: 0, pushes: 0, sampleSize };
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

describe("buildPickSignalSnapshot — quantities & honesty gates", () => {
  it("computes lineMovementDelta as current - opening for SPREAD picks (sign convention)", () => {
    const snap = buildPickSignalSnapshot(
      "p1",
      PICK, // SPREAD
      { openingSpread: -3, currentSpread: -3.5 },
      false,
      false,
    );
    // current (-3.5) - opening (-3) = -0.5 (line moved toward home)
    expect(snap.lineMovementDelta).toBe(-0.5);
    expect(snap.hadLineMovementSignal).toBe(true);
  });

  it("uses the TOTAL branch (current - opening on totals) for TOTAL picks", () => {
    const snap = buildPickSignalSnapshot(
      "p1",
      TOTAL_PICK,
      { openingTotal: 45, currentTotal: 47.5 },
      false,
      false,
    );
    expect(snap.lineMovementDelta).toBe(2.5);
    expect(snap.hadLineMovementSignal).toBe(true);
  });

  it("returns null lineMovementDelta when the market type does not match the provided lines", () => {
    // SPREAD pick but only total lines present -> no spread delta to compute
    const snap = buildPickSignalSnapshot(
      "p1",
      PICK, // SPREAD
      { openingTotal: 45, currentTotal: 47 },
      false,
      false,
    );
    expect(snap.lineMovementDelta).toBeNull();
    // Line-movement presence still fires off the total opening line
    expect(snap.hadLineMovementSignal).toBe(true);
  });

  it("computes restAdvantageNet as home - away only when both rest days are present", () => {
    const both = buildPickSignalSnapshot(
      "p1",
      PICK,
      { restDaysHome: 3, restDaysAway: 1 },
      false,
      false,
    );
    expect(both.restAdvantageNet).toBe(2);
    expect(both.hadRestSignal).toBe(true);

    // Only one side present -> cannot compute a net advantage
    const oneSide = buildPickSignalSnapshot("p1", PICK, { restDaysHome: 3 }, false, false);
    expect(oneSide.restAdvantageNet).toBeNull();
    expect(oneSide.hadRestSignal).toBe(true);
  });

  it("reports the larger ATS sample size when derived history was used", () => {
    const snap = buildPickSignalSnapshot(
      "p1",
      PICK,
      { homeAtsForm: atsBucket(8), awayAtsForm: atsBucket(12) },
      false,
      true, // usedDerivedHistory
    );
    expect(snap.hadAtsFormSignal).toBe(true);
    expect(snap.atsFormSampleSize).toBe(12);
  });

  it("collapses a genuine zero ATS sample size to null via the `|| null` idiom", () => {
    const snap = buildPickSignalSnapshot(
      "p1",
      PICK,
      { homeAtsForm: atsBucket(0), awayAtsForm: atsBucket(0) },
      false,
      true, // usedDerivedHistory
    );
    // Buckets are present so the derived signal fires...
    expect(snap.hadAtsFormSignal).toBe(true);
    // ...but Math.max(0, 0) || null pins the reported sample size to null.
    expect(snap.atsFormSampleSize).toBeNull();
  });

  it("never claims ATS/H2H/venue signals when derived history was NOT used, even with data present", () => {
    const snap = buildPickSignalSnapshot(
      "p1",
      PICK,
      {
        homeAtsForm: atsBucket(20),
        awayAtsForm: atsBucket(15),
        headToHeadForm: atsBucket(6),
        homeAtsFormAtHome: atsBucket(10),
        awayAtsFormAway: atsBucket(9),
      },
      false,
      false, // usedDerivedHistory = false -> gate every derived signal OFF
    );
    // The honesty gate: data existed but was not actually used by the model.
    expect(snap.hadAtsFormSignal).toBe(false);
    expect(snap.hadH2HSignal).toBe(false);
    expect(snap.hadVenueSignal).toBe(false);
    // Sample sizes must not be surfaced for signals that were not used.
    expect(snap.atsFormSampleSize).toBeNull();
    expect(snap.h2hSampleSize).toBeNull();
  });
});
