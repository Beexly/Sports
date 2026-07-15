import { describe, expect, it } from "vitest";
import {
  gateDecisionRecordToGatedInput,
  pickRecordToPublicationInput,
  pickRecordToSettlementInput,
  topFactorsFromBreakdown,
} from "@/lib/bot-outbox/records";

const game = {
  id: "game-1",
  awayTeamName: "MIN",
  homeTeamName: "DET",
  commenceTime: new Date("2026-05-22T23:00:00.000Z"),
  currentEdgeIndex: 66.2,
  awayScore: 17,
  homeScore: 24,
  sport: { name: "NFL" },
};

const pick = {
  id: "pick-1",
  gameId: "game-1",
  pickType: "SPREAD",
  selection: "MIN +6",
  line: 6,
  confidence: 71,
  edgeScore: 62.7,
  tier: "FREE" as const,
  pickGrade: "SOLID_PLAY",
  modelVersion: "v5.0.0",
  result: "LOSS" as const,
  settledAt: new Date("2026-05-23T03:30:00.000Z"),
  isPublished: true,
  isBootstrap: false,
  factorBreakdown: {
    odds: 0.42,
    lineMovement: 0.25,
    restAdvantage: -0.74,
    schedule: 0.2,
  },
  game,
};

describe("bot outbox record mappers", () => {
  it("extracts top factors from known factor-breakdown aliases", () => {
    expect(topFactorsFromBreakdown(pick.factorBreakdown)).toEqual([
      { factor: "restAdvantage", score: 0.74 },
      { factor: "edge", score: 0.42 },
      { factor: "lineMovement", score: 0.25 },
    ]);
  });

  it("maps pick records to publication planner input", () => {
    const input = pickRecordToPublicationInput(pick);

    expect(input).toMatchObject({
      pickId: "pick-1",
      gameId: "game-1",
      matchup: "MIN @ DET",
      line: "MIN +6",
      side: "MIN +6",
      tier: "FREE",
      isBootstrap: false,
    });
    expect(input.gameStartsAt.toISOString()).toBe("2026-05-22T23:00:00.000Z");
  });

  it("maps settled pick records to settlement planner input", () => {
    const input = pickRecordToSettlementInput(pick);

    expect(input.outcome).toBe("L");
    expect(input.finalScore).toBe("MIN 17, DET 24");
    expect(input.biggestMissFactor).toBe("restAdvantage");
    expect(input.topFactorsAtPublish).toHaveLength(3);
  });

  it("preserves VOID as no-action instead of mapping it to PUSH", () => {
    const input = pickRecordToSettlementInput({ ...pick, result: "VOID" });

    expect(input.outcome).toBe("VOID");
  });

  it("maps gate decision records to gated slate planner input", () => {
    const input = gateDecisionRecordToGatedInput({
      id: "gate-1",
      gameId: "game-1",
      reason: "Consensus stayed balanced across the books.",
      reasonCode: "LOW_EDGE",
      edgeIndex: null,
      modelVersion: "v5.0.0",
      isBootstrap: false,
      evaluatedAt: new Date("2026-05-22T18:00:00.000Z"),
      game,
    });

    expect(input).toMatchObject({
      gateDecisionId: "gate-1",
      matchup: "MIN @ DET",
      edgeIndex: 66.2,
      gateReason: "LOW_EDGE",
      gateReasonText: "Consensus stayed balanced across the books.",
    });
  });
});
