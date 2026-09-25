import { describe, expect, it } from "vitest";
import {
  REASONING_SURFACE,
  reasonAnytimeTd,
  reasonCoverProbability,
  reasonDbCoverage,
  reasonDeserveToWin,
  reasonFeatureSpace,
  reasonFgMake,
  reasonGeneralizedPoisson,
  reasonKickerMoE,
  reasonNeutralizePlay,
  reasonPasserRating,
  reasonScrambleEpa,
  reasonSubmission,
  reasonSubmissionCsv,
  reasonTrailingRating,
} from "./reasoning-surface.js";
import type { Sample } from "../eval/feature-construction-recipe.js";

describe("reasoning-surface registry", () => {
  it("exposes every reasoning entry point", () => {
    const names = Object.keys(REASONING_SURFACE);
    expect(names).toContain("submission");
    expect(names).toContain("simulateMatchup");
    expect(names).toContain("anytimeTd");
    expect(names).toContain("deserveToWin");
    expect(names).toContain("dbCoverage");
    expect(names).toContain("coverProbability");
    expect(names.length).toBeGreaterThanOrEqual(20);
  });
});

describe("reasoning-surface V5/V6/V7", () => {
  it("reasonSubmission validates the V5 contract", () => {
    const r = reasonSubmission({
      rows: [
        {
          event_id: "e1",
          market: "spread",
          selection: "HOME",
          probability: 0.6,
          fair_price: 1.6,
          model_id: "m1",
          generated_at: "2026-09-25T12:00:00.000Z",
        },
      ],
      thesis: {
        thesis: "edge",
        features_used: ["epa"],
        training_window: "2022..2026",
        known_limitations: "no injury model",
      },
      eventStarts: { e1: "2026-09-25T20:00:00.000Z" },
    });
    expect(r.ok).toBe(true);
  });

  it("reasonSubmissionCsv throws-fail-closed on bad package", () => {
    const r = reasonSubmissionCsv({
      rows: [],
      thesis: {
        thesis: "",
        features_used: [],
        training_window: "",
        known_limitations: "",
      },
      eventStarts: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
  });

  it("reasonTrailingRating returns a real rating", () => {
    const r = reasonTrailingRating("KC", [
      {
        teamId: "KC",
        opponentId: "BUF",
        touchdowns: 3,
        touchdownsAllowed: 1,
        drives: 11,
        kickoff: "2026-09-25T20:00:00.000Z",
        home: true,
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.tdForRate).toBeGreaterThan(0);
  });

  it("reasonFeatureSpace rejects empty specs", () => {
    const r = reasonFeatureSpace([], "v1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("feature");
  });
});

describe("reasoning-surface W3/W4/W5", () => {
  it("reasonAnytimeTd integrates EV", () => {
    const r = reasonAnytimeTd(
      {
        playerId: "p1",
        season: 2026,
        week: 5,
        position: "RB",
        isHome: true,
        rolling: {
          windowGames: 4,
          snapShare: 0.6,
          redZoneShare: 0.3,
          usageShare: 0.25,
          teamPlaysPerGame: 62,
          oppTdRateAllowed: 1.1,
        },
        injuryStatus: "HEALTHY",
      },
      { decimalOdds: 2.2 },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.probability).toBeGreaterThan(0);
      expect(r.data.ev).not.toBeNull();
    }
  });

  it("reasonNeutralizePlay passes null through", () => {
    const r = reasonNeutralizePlay(null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.neutralizedEpa).toBeNull();
  });

  it("reasonDeserveToWin computes a distribution", () => {
    const r = reasonDeserveToWin({
      gameId: "g1",
      homeTeam: "KC",
      awayTeam: "BUF",
      plays: [
        {
          playId: "p1",
          gameId: "g1",
          homeTeam: "KC",
          awayTeam: "BUF",
          offenseTeam: "KC",
          epa: 0.4,
          playType: "pass",
          fumble: false,
          fumbleRecoveredByOwnTeam: false,
          interception: false,
          tippedInterception: false,
          fieldGoal: false,
          fieldGoalMade: false,
          fieldGoalDistance: null,
          wpBefore: 0.5,
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.pHomeWin + r.data.pAwayWin + r.data.pTie).toBeCloseTo(1, 3);
    }
  });
});

describe("reasoning-surface NGS + adapters", () => {
  it("reasonDbCoverage computes defender metrics", () => {
    const r = reasonDbCoverage([
      {
        playId: "p1",
        gameId: "g1",
        season: 2026,
        week: 1,
        defenderId: "db1",
        defenderPosition: "CB",
        offenseTeam: "KC",
        defenseTeam: "BUF",
        epa: -0.3,
        yardsGained: 4,
        airYards: 8,
        completed: true,
        intercepted: false,
        coverageType: "MAN",
        alignment: "BOUNDARY",
        inCoverage: true,
        wasTargeted: true,
        wasPrimaryCoverage: true,
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.byDefender[0]!.targets).toBe(1);
  });

  it("reasonKickerMoE and reasonScrambleEpa return real aggregates", () => {
    const k = reasonKickerMoE([
      {
        playId: "a",
        gameId: "g",
        playerId: "k1",
        distance: 38,
        made: true,
        isOutdoor: true,
        windMph: 3,
      },
    ]);
    expect(k.ok).toBe(true);
    if (k.ok) expect(k.data[0]!.makes).toBe(1);

    const s = reasonScrambleEpa([
      {
        playId: "b",
        gameId: "g",
        playerId: "qb1",
        isScramble: true,
        epa: 0.5,
        yardsGained: 14,
        season: 2026,
      },
    ]);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.data[0]!.scrambleEpa).toBeCloseTo(0.5, 4);
  });

  it("reasonCoverProbability / reasonFgMake / reasonPasserRating / reasonGeneralizedPoisson", () => {
    const c = reasonCoverProbability(-3, 3);
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.data).toBeGreaterThan(0);
      expect(c.data).toBeLessThan(1);
    }

    const f = reasonFgMake(40, 0, true);
    expect(f.ok).toBe(true);
    if (f.ok) expect(f.data).toBeGreaterThan(0.5);

    expect(reasonFgMake(null).ok).toBe(false);

    const p = reasonPasserRating(10, 10, 200, 2, 0);
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.data).toBeCloseTo(158.33, 1);

    const g = reasonGeneralizedPoisson(0, 0, 2);
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.data).toBeCloseTo(Math.exp(-2), 5);
  });
});
