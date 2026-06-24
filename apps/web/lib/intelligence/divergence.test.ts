import { describe, expect, it } from "vitest";
import {
  buildDivergenceBoard,
  divergenceFromAvailabilityRole,
  divergenceFromGameScript,
  divergenceFromMarketAnchor,
  divergenceFromOpportunityTransfer,
  divergenceFromReceivingOpportunity,
  type DivergenceSignalInput,
} from "./divergence";

describe("buildDivergenceBoard", () => {
  it("standardizes and routes player signals to fantasy and content lanes", () => {
    const inputs: DivergenceSignalInput[] = [
      {
        source: "market-anchor",
        subjectType: "player",
        subjectId: "p-buy",
        label: "Buy Player",
        rawScore: 8,
        confidence: 1,
        reason: "market baseline too low",
      },
      {
        source: "market-anchor",
        subjectType: "player",
        subjectId: "p-sell",
        label: "Sell Player",
        rawScore: -8,
        confidence: 1,
        reason: "market baseline too high",
      },
      {
        source: "availability",
        subjectType: "player",
        subjectId: "p-flat",
        label: "Flat Player",
        rawScore: 0.1,
        confidence: 1,
        reason: "near neutral",
      },
    ];

    const board = buildDivergenceBoard(inputs, { minRouteScore: 0.5, highSeverityScore: 1 });

    expect(board.status).toBe("shadow");
    expect(board.priced).toBe(false);
    expect(board.draftOnly).toBe(true);
    expect(board.fantasyBuyLow.map((signal) => signal.subjectId)).toContain("p-buy");
    expect(board.fantasySellHigh.map((signal) => signal.subjectId)).toContain("p-sell");
    expect(board.contentDraftQueue.length).toBeGreaterThanOrEqual(2);
    expect(board.signals.find((signal) => signal.subjectId === "p-flat")?.routes).toEqual([]);
  });

  it("keeps betting candidates shadow-only and limited to market/game-script sources", () => {
    const board = buildDivergenceBoard(
      [
        { source: "market-anchor", subjectType: "player", subjectId: "m1", label: "M1", rawScore: 3, confidence: 1, reason: "market gap" },
        { source: "regression-breakout", subjectType: "player", subjectId: "r1", label: "R1", rawScore: 3, confidence: 1, reason: "process gap" },
      ],
      { minRouteScore: 0.5 },
    );

    expect(board.bettingCandidates.map((signal) => signal.source)).toEqual(["market-anchor"]);
    expect(board.bettingCandidates[0]?.routes).toContain("betting-candidate-shadow");
    expect(board.bettingCandidates[0]?.priced).toBe(false);
  });
});

describe("divergence converters", () => {
  it("converts market-anchor player divergence", () => {
    const signal = divergenceFromMarketAnchor({
      playerId: "p1",
      teamSide: "home",
      position: "WR",
      allocationWeight: 0.25,
      projectedYards: 80,
      projectedTouchdowns: 0.6,
      fantasyPoints: 11.6,
      divergence: 4.2,
      priced: false,
      status: "shadow",
    });

    expect(signal.source).toBe("market-anchor");
    expect(signal.rawScore).toBe(4.2);
    expect(signal.subjectType).toBe("player");
  });

  it("converts receiving opportunity into positive and negative regression scores", () => {
    const buyRow = {
      playerId: "p2",
      name: "Receiver A",
      team: "NYJ",
      position: "WR",
      games: 6,
      targets: 48,
      receptions: 25,
      recYards: 260,
      receivingTds: 1,
      airYards: 640,
      wopr: 0.7,
      targetShare: 0.28,
      airYardsShare: 0.41,
      aDOT: 13.3,
      racr: 0.41,
      catchRate: 0.52,
      oppPct: 90,
      prodPct: 35,
      xCatch: 31,
      xCatchDelta: 6,
      xTd: 2.1,
      xTdDelta: 1.1,
      regressionScore: 6,
      breakoutScore: 6,
      signal: "buy-low",
      note: "role bigger than box",
    } as const;
    const buy = divergenceFromReceivingOpportunity(buyRow);
    const sell = divergenceFromReceivingOpportunity({ ...buyRow, playerId: "p3", oppPct: 25, prodPct: 90, regressionScore: -5, signal: "sell-high" });

    expect(buy.rawScore).toBeGreaterThan(0);
    expect(sell.rawScore).toBeLessThan(0);
  });

  it("converts role migration, game-script, and availability readouts", () => {
    const role = divergenceFromOpportunityTransfer(
      {
        team: "ATL",
        position: "RB",
        outPlayer: "Starter",
        outPlayerRoleState: "lead",
        vacatedTargets: 3,
        vacatedCarries: 14,
        beneficiary: "Backup",
        beneficiaryTransitionToLeadProb: 0.62,
        redistribution: [],
        confidence: "high",
        note: "vacated role",
      },
      {
        playerName: "Backup",
        depthOrder: 2,
        roleState: "rotation",
        transitionToLeadProb: 0.62,
        share: 0.7,
        redistributedTargets: 2.1,
        redistributedCarries: 9.8,
      },
    );
    const script = divergenceFromGameScript({
      gameId: "g1",
      winProbabilityPath: [],
      home: {
        side: "home",
        teamId: "ATL",
        averageWinProbability: 0.42,
        expectedPassRate: 0.63,
        expectedRunRate: 0.37,
        expectedPlays: 70,
        secondsPerPlay: 26.5,
        paceLabel: "fast",
        scriptLabel: "trailing",
      },
      away: {
        side: "away",
        teamId: "CAR",
        averageWinProbability: 0.58,
        expectedPassRate: 0.51,
        expectedRunRate: 0.49,
        expectedPlays: 64,
        secondsPerPlay: 28.5,
        paceLabel: "neutral",
        scriptLabel: "leading",
      },
      totalProjectedPlays: 134,
      priced: false,
      status: "shadow",
    }, "home");
    const availability = divergenceFromAvailabilityRole({
      playerId: "p4",
      activeProbability: 0.18,
      returnHazard: 0.1,
      expectedSnapShareIfActive: 0.74,
      expectedSnapShare: 0.13,
      kaplanMeier: [],
      roleTenure: { currentRole: "lead", consecutiveWeeks: 2, retentionProbability: 0.8, halfLifeWeeks: 3.1 },
      priced: false,
      status: "shadow",
    });

    expect(role.rawScore).toBeGreaterThan(0);
    expect(script.subjectType).toBe("team");
    expect(availability.rawScore).toBeLessThan(0);
  });
});
