
import { describe, it, expect } from "vitest";
import { runIntelligence, type GameBundle } from "./engine";

describe("situational trace wiring (L2 engine invoked in production spine)", () => {
  it("surfaces a situationTrace on runIntelligence output", () => {
    const bundle: GameBundle = {
      gameId: "test-1",
      sport: "nfl",
      league: "NFL",
      selection: "HOME",
      pickType: "MONEYLINE",
      homeTeam: "PHI",
      awayTeam: "DAL",
      commenceTime: new Date(Date.now() + 86400000).toISOString(),
      market: {
        market: "h2h",
        fairProb: 0.6,
        line: -150,
        bookmakerCount: 6,
        consensusPct: 60,
      },
      homeInjuries: [],
      awayInjuries: [],
      homeNgs: [],
      awayNgs: [],
      homePlayerStats: [],
      awayPlayerStats: [],
      homeRatings: [],
      awayRatings: [],
      weather: [],
      gameSignals: [],
      homeSnaps: [],
      awaySnaps: [],
      modelVersion: "test-v1",
      statedConfidence: 0.6,
    } as unknown as GameBundle;
    const res = runIntelligence(bundle);
    expect(res).toHaveProperty("situationTrace");
    // fail-open contract: trace either ran (ok) or named its reason
    if (res.situationTrace) {
      console.log("TRACE:", JSON.stringify({
        ok: res.situationTrace.ok,
        divergence: res.situationTrace.divergence,
        consistencyPassed: res.situationTrace.consistencyPassed,
        active: res.situationTrace.activeSignals.length,
        dormant: res.situationTrace.dormantSignals.length,
        failReason: res.situationTrace.failReason,
      }));
      expect(typeof res.situationTrace.ok).toBe("boolean");
      if (!res.situationTrace.ok) {
        expect(res.situationTrace.failReason).toBeTruthy();
      } else {
        expect(res.situationTrace.consistencyPassed).not.toBeNull();
        expect(res.situationTrace.corpusEvaluation).toBeDefined();
        expect(res.situationTrace.corpusEvaluation!.matchedPaperCount).toBeGreaterThan(0);
        expect(res.situationTrace.mindEvaluation).toBeDefined();
        expect(typeof res.situationTrace.mindEvaluation!.netLogitShift).toBe("number");
      }
    }
  });

  it("TS-2A & TS-2B: activates non-home_win observations, exposes corpus/mind fields, and feeds trace into calibratedProb and why", () => {
    const bundle: GameBundle = {
      gameId: "test-ts2ab",
      sport: "NFL",
      selection: "DAL +3.5",
      pickType: "SPREAD",
      homeTeam: "PHI",
      awayTeam: "DAL",
      commenceTime: "2026-09-25T17:00:00Z",
      market: {
        fairProb: 0.52,
        line: 3.5,
        bookmakerCount: 6,
      },
      situation: {
        restDaysHome: 4,
        restDaysAway: 10,
      },
      extraObservations: [
        {
          family: "SITUATIONAL",
          key: "rest-edge",
          label: "DAL +6d rest advantage",
          value: 6,
          lean: -0.4,
          magnitude: 0.5,
          origin: "nflverse:schedules",
          tier: 1,
          trust: 0.95,
          rights: "cleared",
          knownAt: "2026-09-24T12:00:00Z",
          freshness: 0.95,
        },
      ],
      modelVersion: "v5.3.0",
      statedConfidence: 60,
    };

    const res = runIntelligence(bundle);
    expect(res.situationTrace?.ok).toBe(true);
    expect(res.situationTrace?.activeCount).toBeGreaterThan(0);
    expect(res.situationTrace?.activeSignals).toContain("SITUATIONAL:rest-edge");
    expect(res.situationTrace?.corpusEvaluation?.matchedPaperCount).toBeGreaterThan(0);
    expect(res.situationTrace?.mindEvaluation).toBeDefined();
    expect(res.calibratedProb).toBeGreaterThanOrEqual(0.05);
    expect(res.calibratedProb).toBeLessThanOrEqual(0.95);
    expect(res.why.some((line) => line.includes("L2 situational trace:"))).toBe(true);
  });
});
