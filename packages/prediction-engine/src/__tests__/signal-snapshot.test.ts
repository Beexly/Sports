import { describe, it, expect } from "vitest";
import { buildPickSignalSnapshot } from "../signal-snapshot.js";
import type { ScoredPick, GameContextInput, EvidenceRecord } from "@sports/types";

function pick(overrides: Partial<ScoredPick> = {}): ScoredPick {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "BOS -3.5",
    line: -3.5,
    confidence: 72,
    edgeScore: 6.4,
    consensusPct: 0.63,
    bookmakerCount: 8,
    dataQualityScore: 88,
    tier: "FREE",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Strong edge on the spread.",
    reasoningShort: "Strong edge.",
    factorBreakdown: {
      consensusScore: 20,
      marketDepthScore: 15,
      edgeScore: 10,
      lineMovementScore: 8,
      volatilityPenalty: 0,
      factors: [],
    },
    modelVersion: "v5.1.0",
    dataFreshnessAt: new Date("2026-05-30T06:00:00Z"),
    ...overrides,
  };
}

function ctx(overrides: Partial<GameContextInput> = {}): GameContextInput {
  return overrides;
}

function evidence(
  category: EvidenceRecord["sourceCategory"],
  status: EvidenceRecord["activationStatus"] = "ACTIVE"
): EvidenceRecord {
  return {
    sourceCategory: category,
    sourceName: `${category.toLowerCase()}-feed`,
    signalKey: category,
    fetchedAt: new Date(),
    trustLevel: 0.9,
    isBootstrap: false,
    activationStatus: status,
    freshnessStatus: "FRESH",
    whyUsedOrBlocked: "within TTL",
  };
}

describe("buildPickSignalSnapshot", () => {
  describe("odds signal — always true", () => {
    it("hadOddsSignal is always true regardless of context", () => {
      const snap = buildPickSignalSnapshot("pick-1", pick(), undefined, false, false);
      expect(snap.hadOddsSignal).toBe(true);
    });
  });

  describe("line movement signal", () => {
    it("is true when openingSpread is present", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({ openingSpread: -3.0 }), false, false);
      expect(snap.hadLineMovementSignal).toBe(true);
    });

    it("is true when openingTotal is present", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({ openingTotal: 225 }), false, false);
      expect(snap.hadLineMovementSignal).toBe(true);
    });

    it("is false when no opening line exists", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({}), false, false);
      expect(snap.hadLineMovementSignal).toBe(false);
    });

    it("is false when context is undefined", () => {
      const snap = buildPickSignalSnapshot("p", pick(), undefined, false, false);
      expect(snap.hadLineMovementSignal).toBe(false);
    });
  });

  describe("rest signal", () => {
    it("is true when restDaysHome is present", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({ restDaysHome: 2 }), false, false);
      expect(snap.hadRestSignal).toBe(true);
    });

    it("is true when restDaysAway is present", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({ restDaysAway: 1 }), false, false);
      expect(snap.hadRestSignal).toBe(true);
    });

    it("is true when isBackToBackHome is true", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({ isBackToBackHome: true }), false, false);
      expect(snap.hadRestSignal).toBe(true);
    });

    it("is false when all rest fields are absent or false", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({ isBackToBackHome: false }), false, false);
      expect(snap.hadRestSignal).toBe(false);
    });
  });

  describe("ATS form signal — gated on usedDerivedHistory", () => {
    it("is true when usedDerivedHistory AND homeAtsForm is present", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ homeAtsForm: { wins: 5, losses: 3, pushes: 0, sampleSize: 8 } }),
        false,
        true  // usedDerivedHistory
      );
      expect(snap.hadAtsFormSignal).toBe(true);
    });

    it("is false when usedDerivedHistory is false even with ATS data", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ homeAtsForm: { wins: 5, losses: 3, pushes: 0, sampleSize: 8 } }),
        false,
        false  // usedDerivedHistory = false
      );
      expect(snap.hadAtsFormSignal).toBe(false);
    });

    it("is false when usedDerivedHistory but no ATS data", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({}), false, true);
      expect(snap.hadAtsFormSignal).toBe(false);
    });
  });

  describe("H2H signal — gated on usedDerivedHistory", () => {
    it("is true when usedDerivedHistory AND headToHeadForm is present", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ headToHeadForm: { wins: 3, losses: 4, pushes: 1, sampleSize: 8 } }),
        false,
        true
      );
      expect(snap.hadH2HSignal).toBe(true);
    });

    it("is false when derivedHistory not used", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ headToHeadForm: { wins: 3, losses: 4, pushes: 1, sampleSize: 8 } }),
        false,
        false
      );
      expect(snap.hadH2HSignal).toBe(false);
    });
  });

  describe("lineMovementDelta", () => {
    it("computes delta for SPREAD picks (current - opening)", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick({ pickType: "SPREAD" }),
        ctx({ openingSpread: -3.0, currentSpread: -4.5 }),
        false,
        false
      );
      expect(snap.lineMovementDelta).toBeCloseTo(-1.5);
    });

    it("computes delta for TOTAL picks (current - opening)", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick({ pickType: "TOTAL" }),
        ctx({ openingTotal: 220, currentTotal: 225 }),
        false,
        false
      );
      expect(snap.lineMovementDelta).toBe(5);
    });

    it("is null when context is undefined", () => {
      const snap = buildPickSignalSnapshot("p", pick(), undefined, false, false);
      expect(snap.lineMovementDelta).toBeNull();
    });

    it("is null when opening line is absent (SPREAD)", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick({ pickType: "SPREAD" }),
        ctx({ currentSpread: -4.0 }),
        false,
        false
      );
      expect(snap.lineMovementDelta).toBeNull();
    });
  });

  describe("restAdvantageNet", () => {
    it("computes home - away (positive = home more rested)", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ restDaysHome: 3, restDaysAway: 1 }),
        false,
        false
      );
      expect(snap.restAdvantageNet).toBe(2);
    });

    it("is null when either rest field is missing", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ restDaysHome: 3 }),
        false,
        false
      );
      expect(snap.restAdvantageNet).toBeNull();
    });
  });

  describe("atsFormSampleSize", () => {
    it("returns max of home and away sample size when ATS signal is present", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({
          homeAtsForm: { wins: 6, losses: 2, pushes: 0, sampleSize: 8 },
          awayAtsForm: { wins: 4, losses: 4, pushes: 2, sampleSize: 10 },
        }),
        false,
        true
      );
      expect(snap.atsFormSampleSize).toBe(10);
    });

    it("is null when ATS signal is absent", () => {
      const snap = buildPickSignalSnapshot("p", pick(), ctx({}), false, false);
      expect(snap.atsFormSampleSize).toBeNull();
    });
  });

  describe("shadow evidence → signal flags", () => {
    it("sets hadPlayerSignal from PLAYER_AVAILABILITY shadow evidence", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ shadowEvidence: [evidence("PLAYER_AVAILABILITY", "ACTIVE")] }),
        false,
        false
      );
      expect(snap.hadPlayerSignal).toBe(true);
    });

    it("does not set hadPlayerSignal for SHADOW_ONLY evidence", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ shadowEvidence: [evidence("PLAYER_AVAILABILITY", "SHADOW_ONLY")] }),
        false,
        false
      );
      expect(snap.hadPlayerSignal).toBe(false);
    });

    it("sets hadMilestoneSignal from MILESTONES shadow evidence", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ shadowEvidence: [evidence("MILESTONES", "ACTIVE")] }),
        false,
        false
      );
      expect(snap.hadMilestoneSignal).toBe(true);
    });

    it("sets hadPaceSignal from PACE shadow evidence", () => {
      const snap = buildPickSignalSnapshot(
        "p",
        pick(),
        ctx({ shadowEvidence: [evidence("PACE", "ACTIVE")] }),
        false,
        false
      );
      expect(snap.hadPaceSignal).toBe(true);
    });
  });

  describe("provenance fields", () => {
    it("copies isBootstrap from the caller", () => {
      const snap = buildPickSignalSnapshot("p", pick(), undefined, true, false);
      expect(snap.isBootstrap).toBe(true);
    });

    it("copies usedDerivedHistory from the caller", () => {
      const snap = buildPickSignalSnapshot("p", pick(), undefined, false, true);
      expect(snap.usedDerivedHistory).toBe(true);
    });

    it("preserves modelVersion from the pick", () => {
      const snap = buildPickSignalSnapshot("p", pick({ modelVersion: "v6.0.0" }), undefined, false, false);
      expect(snap.modelVersion).toBe("v6.0.0");
    });

    it("pickId and gameId are passed through correctly", () => {
      const snap = buildPickSignalSnapshot("pick-abc", pick({ gameId: "game-xyz" }), undefined, false, false);
      expect(snap.pickId).toBe("pick-abc");
      expect(snap.gameId).toBe("game-xyz");
    });
  });
});
