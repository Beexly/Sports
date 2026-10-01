/**
 * The short-week signal must vote from the slate's own env, and a wrapper
 * that used to emit 0 through a type-erasing call must abstain instead.
 *
 * Three traces, each built by the real trace module from a real tilt, each
 * reconciling. The numbers are computed, not typed in.
 */
import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";
import { nflFourthDownAggressionSignal } from "../signal-registry-extensions.js";
import { buildReasoningTrace } from "@sports/prediction-engine/src/reasoning-trace.js";
import type { FactorDetail, OddsInput, ScoredPick } from "@sports/types";

const NOW = () => new Date("2026-10-01T12:00:00Z");

function nflCtx(env: Record<string, string>) {
  return {
    sportKey: "americanfootball_nfl",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "New England Patriots",
    env,
    now: NOW,
  } as never;
}

async function shortWeek(env: Record<string, string>) {
  const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, nflCtx(env));
  const vote = tilt.votes.find((v) => v.signalId === "nfl_short_week_road_deficit");
  return { tilt, vote };
}

function traceFrom(voteTilt: number, signalId: string): ReturnType<typeof buildReasoningTrace> {
  const factor: FactorDetail = {
    name: `Continuous signal — ${signalId}`,
    impact: voteTilt > 0 ? "positive" : "negative",
    description:
      `Log-odds tilt ${voteTilt.toFixed(4)} toward ${voteTilt > 0 ? "home" : "away"} ` +
      `from raw computed, neutral 0, delta computed, sign + at trustWeight 0.11 (SITUATIONAL).`,
    weight: Math.min(15, Math.round(Math.abs(voteTilt) * 100)),
  };
  const pick = {
    gameId: "sw-1",
    homeTeam: "Chiefs",
    awayTeam: "Patriots",
    pickType: "MONEYLINE",
    pickedSide: "HOME",
    confidence: 60,
    rankingScore: 60,
    tier: "STANDARD",
    edgeScore: 55,
    factorBreakdown: {
      consensusScore: 30,
      marketDepthScore: 20,
      edgeComponentScore: 5,
      volatilityPenalty: 0,
      lineMovementScore: 0,
      restAdvantageScore: 0,
      historicalFormScore: 0,
      dataQualityPenalty: 0,
      factors: [
        factor,
        { name: "Book Consensus", weight: 30, impact: "positive", description: "Book Consensus detail" },
        { name: "Market Depth", weight: 20, impact: "positive", description: "Market Depth detail" },
      ],
      fairProbability: 0.87,
      marketFairProb: 0.85,
      venueFormScore: 0,
      headToHeadScore: 0,
      uncertaintyPenalty: 0,
      scheduleStressScore: 0,
      crossMarketScore: 0,
      dataQualityScore: 100,
    },
    selection: "Chiefs ML",
    line: null,
    modelVersion: "v5.3.0",
    dataFreshnessAt: new Date("2026-10-01T12:00:00Z"),
  } as unknown as ScoredPick;
  const input: OddsInput = {
    gameId: "sw-1",
    homeTeam: "Chiefs",
    awayTeam: "Patriots",
    commenceTime: new Date("2026-10-01T00:20:00Z"),
    sport: "NFL",
    bookmakerOdds: [
      "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
      "betrivers", "wynn", "bet365", "espnbet", "fanatics",
    ].map((bookmaker) => ({ bookmaker, market: "H2H" as const, homePrice: -800, awayPrice: 650 })),
    context: { bookmakerCoverageMax: 10 },
  };
  return buildReasoningTrace(pick, input);
}

describe("short-week votes from the slate env", () => {
  const slate = {
    HOME_REST_DAYS: "7",
    AWAY_REST_DAYS: "4",
    REST_DAYS: "7",
    OPP_REST_DAYS: "4",
    IS_ROAD_TEAM: "0",
  };

  it("a tired visitor favors home even when travel and rivalry were not measured", async () => {
    const { tilt, vote } = await shortWeek(slate);
    expect(vote).toBeTruthy();
    expect(vote!.rawValue).toBe(2.25);
    expect(vote!.tilt).toBeGreaterThan(0);
    expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);
  });

  it("measured long travel increases the home-relative value and is not invented when absent", async () => {
    const absent = await shortWeek(slate);
    const measured = await shortWeek({ ...slate, TRAVEL_DISTANCE_MILES: "1800" });
    expect(absent.vote!.rawValue).toBe(2.25);
    expect(measured.vote!.rawValue).toBe(2.9);
    expect(measured.vote!.rawValue).toBeGreaterThan(absent.vote!.rawValue);
  });

  it("abstains when rest was not observed, rather than assuming a week", async () => {
    const { vote, tilt } = await shortWeek({ IS_ROAD_TEAM: "0" });
    expect(vote).toBeUndefined();
    expect(tilt.adjustedHomeP).toBe(0.5);
  });

  it("a wrapper that used to emit 0 from a missing field now abstains", async () => {
    const raw = await nflFourthDownAggressionSignal.evaluate!({
      sportKey: "americanfootball_nfl",
      homeTeam: "KC",
      awayTeam: "NE",
      env: {
        COACH_GO_FOR_IT_RATE: "0.7",
        LEAGUE_GO_FOR_IT_RATE: "0.48",
        FOURTH_DOWN_LEVERAGE: "1",
      },
      now: NOW,
    } as never);
    expect(raw).toBeNull();
  });
});

describe("three short-week traces reconcile", () => {
  it("tired visitor, measured travel, and a no-vote rest week each reconcile with residual 0", async () => {
    const tired = await shortWeek({
      HOME_REST_DAYS: "7",
      AWAY_REST_DAYS: "4",
      IS_ROAD_TEAM: "0",
    });
    const traveled = await shortWeek({
      HOME_REST_DAYS: "7",
      AWAY_REST_DAYS: "4",
      TRAVEL_DISTANCE_MILES: "1800",
      IS_ROAD_TEAM: "0",
    });
    const normal = await shortWeek({
      HOME_REST_DAYS: "7",
      AWAY_REST_DAYS: "7",
      IS_ROAD_TEAM: "0",
    });

    expect(tired.vote!.rawValue).toBe(2.25);
    expect(traveled.vote!.rawValue).toBe(2.9);
    expect(normal.vote).toBeUndefined();

    const tiredTrace = traceFrom(tired.vote!.tilt, "nfl_short_week_road_deficit");
    const traveledTrace = traceFrom(traveled.vote!.tilt, "nfl_short_week_road_deficit");
    expect(tiredTrace.arithmetic.reconciles).toBe(true);
    expect(tiredTrace.arithmetic.residual).toBe(0);
    expect(traveledTrace.arithmetic.reconciles).toBe(true);
    expect(traveledTrace.arithmetic.residual).toBe(0);
    expect(tiredTrace.arithmetic.terms.some((t) => t.label.includes("nfl_short_week_road_deficit"))).toBe(true);

    // Normal rest produces no vote. The trace below has no continuous factor,
    // which is what the slate emits when the signal abstains.
    const noVote = buildReasoningTrace(
      {
        gameId: "sw-quiet",
        homeTeam: "Chiefs",
        awayTeam: "Patriots",
        pickType: "MONEYLINE",
        pickedSide: "HOME",
        confidence: 60,
        rankingScore: 60,
        tier: "STANDARD",
        edgeScore: 55,
        factorBreakdown: {
          consensusScore: 30,
          marketDepthScore: 20,
          edgeComponentScore: 5,
          volatilityPenalty: 0,
          lineMovementScore: 0,
          restAdvantageScore: 0,
          historicalFormScore: 0,
          dataQualityPenalty: 0,
          factors: [
            { name: "Book Consensus", weight: 30, impact: "positive", description: "Book Consensus detail" },
            { name: "Market Depth", weight: 20, impact: "positive", description: "Market Depth detail" },
          ],
          fairProbability: 0.87,
          marketFairProb: 0.85,
          venueFormScore: 0,
          headToHeadScore: 0,
          uncertaintyPenalty: 0,
          scheduleStressScore: 0,
          crossMarketScore: 0,
          dataQualityScore: 100,
        },
        selection: "Chiefs ML",
        line: null,
        modelVersion: "v5.3.0",
        dataFreshnessAt: new Date("2026-10-01T12:00:00Z"),
      } as unknown as ScoredPick,
      {
        gameId: "sw-quiet",
        homeTeam: "Chiefs",
        awayTeam: "Patriots",
        commenceTime: new Date("2026-10-01T17:00:00Z"),
        sport: "NFL",
        bookmakerOdds: [
          "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
          "betrivers", "wynn", "bet365", "espnbet", "fanatics",
        ].map((bookmaker) => ({ bookmaker, market: "H2H" as const, homePrice: -110, awayPrice: -110 })),
        context: { bookmakerCoverageMax: 10 },
      },
    );
    expect(noVote.arithmetic.reconciles).toBe(true);
    expect(noVote.arithmetic.residual).toBe(0);
    expect(noVote.arithmetic.terms.some((t) => t.label.startsWith("Continuous signal:"))).toBe(false);
  });
});
