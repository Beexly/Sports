import { describe, it, expect } from "vitest";
import { buildPickSignalSnapshot } from "../signal-snapshot";
import type { ScoredPick, GameContextInput } from "@sports/types";

/**
 * Unit tests for buildPickSignalSnapshot — pure function that captures
 * what was known at prediction time for calibration / outcome-anchored learning.
 *
 * Key invariants:
 *  1. hadOddsSignal is always true (odds are the primary input)
 *  2. hadLineMovementSignal requires opening line data
 *  3. hadAtsFormSignal requires usedDerivedHistory=true AND non-null form data
 *  4. shadow categories (PLAYER_AVAILABILITY etc.) propagate from context
 *  5. lineMovementDelta is computed from context spread/total deltas
 *  6. isBootstrap and usedDerivedHistory are passed through unchanged
 */

function makePick(overrides: Partial<ScoredPick> = {}): ScoredPick {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    confidence: 72,
    edgeScore: 8.2,
    consensusPct: 0.61,
    bookmakerCount: 9,
    dataQualityScore: 88,
    tier: "PRO",
    pickGrade: "STRONG_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Strong line movement with deep book coverage.",
    reasoningShort: "Line movement confirming.",
    factorBreakdown: { factors: [], totalScore: 72, weights: {} },
    modelVersion: "v5.1.0",
    dataFreshnessAt: new Date("2026-05-24T08:00:00Z"),
    ...overrides,
  };
}

function makeContext(overrides: Partial<GameContextInput> = {}): GameContextInput {
  return { ...overrides };
}

describe("buildPickSignalSnapshot", () => {
  describe("hadOddsSignal", () => {
    it("is always true — odds are the mandatory primary input", () => {
      const snap = buildPickSignalSnapshot("pick-1", makePick(), undefined, false, false);
      expect(snap.hadOddsSignal).toBe(true);
    });
  });

  describe("hadLineMovementSignal", () => {
    it("false when no opening line in context", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, false);
      expect(snap.hadLineMovementSignal).toBe(false);
    });

    it("true when openingSpread is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ openingSpread: -3 }), false, false
      );
      expect(snap.hadLineMovementSignal).toBe(true);
    });

    it("true when openingTotal is present (totals pick)", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick({ pickType: "TOTAL" }), makeContext({ openingTotal: 48.5 }), false, false
      );
      expect(snap.hadLineMovementSignal).toBe(true);
    });

    it("false with undefined context", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), undefined, false, false);
      expect(snap.hadLineMovementSignal).toBe(false);
    });
  });

  describe("hadRestSignal", () => {
    it("false when no rest data in context", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, false);
      expect(snap.hadRestSignal).toBe(false);
    });

    it("true when restDaysHome is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ restDaysHome: 3 }), false, false
      );
      expect(snap.hadRestSignal).toBe(true);
    });

    it("true when isBackToBackAway is true", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ isBackToBackAway: true }), false, false
      );
      expect(snap.hadRestSignal).toBe(true);
    });
  });

  describe("hadAtsFormSignal", () => {
    it("false when usedDerivedHistory is false even with ATS data", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ homeAtsForm: { wins: 8, losses: 4, pushes: 1, sampleSize: 13 } }),
        false,
        false // usedDerivedHistory=false
      );
      expect(snap.hadAtsFormSignal).toBe(false);
    });

    it("false when usedDerivedHistory=true but no ATS data", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, true);
      expect(snap.hadAtsFormSignal).toBe(false);
    });

    it("true when usedDerivedHistory=true AND homeAtsForm is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ homeAtsForm: { wins: 8, losses: 4, pushes: 1, sampleSize: 13 } }),
        false,
        true
      );
      expect(snap.hadAtsFormSignal).toBe(true);
    });
  });

  describe("hadH2HSignal", () => {
    it("false when usedDerivedHistory=false even with H2H data", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ headToHeadForm: { wins: 3, losses: 2, pushes: 0, sampleSize: 5 } }),
        false, false
      );
      expect(snap.hadH2HSignal).toBe(false);
    });

    it("true when usedDerivedHistory=true AND headToHeadForm is non-null", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ headToHeadForm: { wins: 3, losses: 2, pushes: 0, sampleSize: 5 } }),
        false, true
      );
      expect(snap.hadH2HSignal).toBe(true);
    });
  });

  describe("lineMovementDelta", () => {
    it("null when no opening/current spread", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, false);
      expect(snap.lineMovementDelta).toBeNull();
    });

    it("computes spread delta for SPREAD pickType", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick({ pickType: "SPREAD" }),
        makeContext({ openingSpread: -3, currentSpread: -3.5 }),
        false, false
      );
      expect(snap.lineMovementDelta).toBeCloseTo(-0.5);
    });

    it("computes total delta for TOTAL pickType", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick({ pickType: "TOTAL" }),
        makeContext({ openingTotal: 48, currentTotal: 49 }),
        false, false
      );
      expect(snap.lineMovementDelta).toBeCloseTo(1.0);
    });

    it("null for TOTAL pickType when missing current total", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick({ pickType: "TOTAL" }),
        makeContext({ openingTotal: 48 }),
        false, false
      );
      expect(snap.lineMovementDelta).toBeNull();
    });
  });

  describe("restAdvantageNet", () => {
    it("null when only one team's rest days available", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ restDaysHome: 3 }), false, false
      );
      expect(snap.restAdvantageNet).toBeNull();
    });

    it("home advantage when home has more rest", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ restDaysHome: 5, restDaysAway: 1 }), false, false
      );
      expect(snap.restAdvantageNet).toBe(4);
    });

    it("negative when away has more rest", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ restDaysHome: 1, restDaysAway: 3 }), false, false
      );
      expect(snap.restAdvantageNet).toBe(-2);
    });
  });

  describe("atsFormSampleSize", () => {
    it("null when no ATS form used", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, false);
      expect(snap.atsFormSampleSize).toBeNull();
    });

    it("returns max of home and away sample sizes", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          homeAtsForm: { wins: 8, losses: 4, pushes: 1, sampleSize: 13 },
          awayAtsForm: { wins: 5, losses: 8, pushes: 2, sampleSize: 15 },
        }),
        false, true
      );
      expect(snap.atsFormSampleSize).toBe(15);
    });
  });

  describe("shadow signal categories", () => {
    it("hadPlayerSignal from PLAYER_AVAILABILITY shadow evidence", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          shadowEvidence: [{
            sourceCategory: "PLAYER_AVAILABILITY",
            sourceName: "shadow",
            fetchedAt: new Date(),
            trustLevel: 0,
            isBootstrap: false,
            signalKey: "player_avail",
            activationStatus: "ACTIVE",
            freshnessStatus: "FRESH",
            whyUsedOrBlocked: "shadow category",
          }],
        }),
        false, false
      );
      expect(snap.hadPlayerSignal).toBe(true);
    });

    it("hadPaceSignal triggers on PACE or TEAM_RATES", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          shadowEvidence: [{
            sourceCategory: "TEAM_RATES",
            sourceName: "shadow",
            fetchedAt: new Date(),
            trustLevel: 0,
            isBootstrap: false,
            signalKey: "team_rates",
            activationStatus: "ACTIVE",
            freshnessStatus: "FRESH",
            whyUsedOrBlocked: "shadow",
          }],
        }),
        false, false
      );
      expect(snap.hadPaceSignal).toBe(true);
    });

    it("ignores non-ACTIVE shadow evidence", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          shadowEvidence: [{
            sourceCategory: "OFFICIALS",
            sourceName: "shadow",
            fetchedAt: new Date(),
            trustLevel: 0,
            isBootstrap: false,
            signalKey: "officials",
            activationStatus: "BLOCKED",
            freshnessStatus: "FRESH",
            whyUsedOrBlocked: "blocked",
          }],
        }),
        false, false
      );
      expect(snap.hadOfficialsSignal).toBe(false);
    });
  });

  describe("provenance fields", () => {
    it("isBootstrap passes through", () => {
      const boot = buildPickSignalSnapshot("p", makePick(), undefined, true, false);
      const canon = buildPickSignalSnapshot("p", makePick(), undefined, false, false);
      expect(boot.isBootstrap).toBe(true);
      expect(canon.isBootstrap).toBe(false);
    });

    it("usedDerivedHistory passes through", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), undefined, false, true);
      expect(snap.usedDerivedHistory).toBe(true);
    });

    it("modelVersion matches pick's modelVersion", () => {
      const snap = buildPickSignalSnapshot("p", makePick({ modelVersion: "v5.2.0" }), undefined, false, false);
      expect(snap.modelVersion).toBe("v5.2.0");
    });

    it("pickId and gameId are preserved", () => {
      const snap = buildPickSignalSnapshot("my-pick-id", makePick({ gameId: "g-99" }), undefined, false, false);
      expect(snap.pickId).toBe("my-pick-id");
      expect(snap.gameId).toBe("g-99");
    });
  });

  describe("hadRestSignal — isBackToBackHome branch", () => {
    it("true when isBackToBackHome is true (no restDays values needed)", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ isBackToBackHome: true }), false, false
      );
      expect(snap.hadRestSignal).toBe(true);
    });

    it("true when restDaysAway is present (without restDaysHome)", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ restDaysAway: 2 }), false, false
      );
      expect(snap.hadRestSignal).toBe(true);
    });
  });

  describe("hadScheduleSignal", () => {
    it("false when no schedule density data in context", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, false);
      expect(snap.hadScheduleSignal).toBe(false);
      expect(snap.usedScheduleSignal).toBe(false);
    });

    it("true when scheduleDensityHome is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ scheduleDensityHome: 0.7 }), false, false
      );
      expect(snap.hadScheduleSignal).toBe(true);
      expect(snap.usedScheduleSignal).toBe(true);
    });

    it("true when scheduleDensityAway is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(), makeContext({ scheduleDensityAway: 0.5 }), false, false
      );
      expect(snap.hadScheduleSignal).toBe(true);
    });

    it("passes scheduleDensity values through to output", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ scheduleDensityHome: 0.8, scheduleDensityAway: 0.4 }),
        false, false
      );
      expect(snap.scheduleDensityHome).toBe(0.8);
      expect(snap.scheduleDensityAway).toBe(0.4);
    });
  });

  describe("hadVenueSignal", () => {
    it("false when usedDerivedHistory=false even with venue form data", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ homeAtsFormAtHome: { wins: 6, losses: 3, pushes: 0, sampleSize: 9 } }),
        false, false
      );
      expect(snap.hadVenueSignal).toBe(false);
    });

    it("true when usedDerivedHistory=true AND homeAtsFormAtHome is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ homeAtsFormAtHome: { wins: 6, losses: 3, pushes: 0, sampleSize: 9 } }),
        false, true
      );
      expect(snap.hadVenueSignal).toBe(true);
    });

    it("true when usedDerivedHistory=true AND awayAtsFormAway is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ awayAtsFormAway: { wins: 4, losses: 5, pushes: 1, sampleSize: 10 } }),
        false, true
      );
      expect(snap.hadVenueSignal).toBe(true);
    });
  });

  describe("shadow signal — hadVenueEnvironmentSignal and hadMilestoneSignal", () => {
    it("hadVenueEnvironmentSignal true from ACTIVE VENUE_ENVIRONMENT shadow", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          shadowEvidence: [{
            sourceCategory: "VENUE_ENVIRONMENT",
            sourceName: "shadow",
            fetchedAt: new Date(),
            trustLevel: 0,
            isBootstrap: false,
            signalKey: "venue_env",
            activationStatus: "ACTIVE",
            freshnessStatus: "FRESH",
            whyUsedOrBlocked: "active",
          }],
        }),
        false, false
      );
      expect(snap.hadVenueEnvironmentSignal).toBe(true);
    });

    it("hadMilestoneSignal true from ACTIVE MILESTONES shadow", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          shadowEvidence: [{
            sourceCategory: "MILESTONES",
            sourceName: "shadow",
            fetchedAt: new Date(),
            trustLevel: 0,
            isBootstrap: false,
            signalKey: "milestones",
            activationStatus: "ACTIVE",
            freshnessStatus: "FRESH",
            whyUsedOrBlocked: "active",
          }],
        }),
        false, false
      );
      expect(snap.hadMilestoneSignal).toBe(true);
    });

    it("hadPaceSignal true from ACTIVE PACE shadow (not just TEAM_RATES)", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          shadowEvidence: [{
            sourceCategory: "PACE",
            sourceName: "shadow",
            fetchedAt: new Date(),
            trustLevel: 0,
            isBootstrap: false,
            signalKey: "pace",
            activationStatus: "ACTIVE",
            freshnessStatus: "FRESH",
            whyUsedOrBlocked: "active",
          }],
        }),
        false, false
      );
      expect(snap.hadPaceSignal).toBe(true);
    });
  });

  describe("lineMovementDelta — null fallback branches", () => {
    it("null for SPREAD when openingSpread present but currentSpread absent", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick({ pickType: "SPREAD" }),
        makeContext({ openingSpread: -3 }),
        false, false
      );
      expect(snap.lineMovementDelta).toBeNull();
    });

    it("null for MONEYLINE pickType (no spread or total delta computed)", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick({ pickType: "MONEYLINE" }),
        makeContext({ openingSpread: -3, currentSpread: -3.5 }),
        false, false
      );
      expect(snap.lineMovementDelta).toBeNull();
    });
  });

  describe("h2hSampleSize", () => {
    it("null when H2H signal not present", () => {
      const snap = buildPickSignalSnapshot("p", makePick(), makeContext(), false, false);
      expect(snap.h2hSampleSize).toBeNull();
    });

    it("returns headToHeadForm sampleSize when H2H signal is present", () => {
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({ headToHeadForm: { wins: 3, losses: 2, pushes: 0, sampleSize: 5 } }),
        false, true
      );
      expect(snap.h2hSampleSize).toBe(5);
    });
  });

  describe("atsFormSampleSize — zero-sample guard", () => {
    it("returns null when both ATS form records have sampleSize 0 (|| null guard)", () => {
      // hadAtsFormSignal=true (usedDerivedHistory=true + homeAtsForm present),
      // but Math.max(0, 0) = 0, and 0 || null = null — the || null guard fires.
      const snap = buildPickSignalSnapshot(
        "p", makePick(),
        makeContext({
          homeAtsForm: { wins: 0, losses: 0, pushes: 0, sampleSize: 0 },
        }),
        false, true
      );
      expect(snap.hadAtsFormSignal).toBe(true);
      expect(snap.atsFormSampleSize).toBeNull();
    });
  });
});
