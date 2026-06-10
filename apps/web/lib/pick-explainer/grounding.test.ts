import { describe, it, expect } from "vitest";
import { buildGroundedContext, type GroundingInput } from "./grounding";
import type { FactorBreakdown } from "@sports/types";

const factorBreakdown: FactorBreakdown = {
  consensusScore: 22,
  marketDepthScore: 18,
  edgeScore: 12,
  lineMovementScore: 6,
  volatilityPenalty: 0,
  headToHeadScore: 0,
  dataQualityScore: 80,
  factors: [
    { name: "Bookmaker Consensus", impact: "positive", description: "84% of books align.", weight: 22 },
    { name: "Pricing Edge", impact: "positive", description: "Net edge vs fair value.", weight: 12 },
  ],
};

function baseInput(overrides?: Partial<GroundingInput>): GroundingInput {
  return {
    game: {
      homeTeamName: "Chiefs",
      awayTeamName: "Eagles",
      sport: "americanfootball_nfl",
      commenceTime: new Date("2026-04-15T18:00:00Z"),
    },
    pick: {
      pickType: "MONEYLINE",
      selection: "Chiefs ML (-180)",
      line: -180,
      confidence: 72,
      edgeScore: 24,
      modelVersion: "v5.0.0",
      generatedAt: new Date("2026-04-15T17:00:00Z"),
      result: "PENDING",
      factorBreakdown,
    },
    snapshot: {
      capturedAt: new Date("2026-04-15T17:00:00Z"),
      confidenceAtPrediction: 72,
      dataQualityScore: 80,
      bookmakerCount: 9,
      lineMovementDelta: 6.0,
      settlementResult: null,
      signalFlags: {
        hadOddsSignal: true,
        hadLineMovementSignal: true,
        hadInjurySignal: false,
        hadWeatherSignal: false,
      },
    },
    ...overrides,
  };
}

describe("buildGroundedContext", () => {
  it("emits citation tokens for both grounding sources", () => {
    const g = buildGroundedContext(baseInput());
    expect(g.context).toContain("factor_breakdown at 2026-04-15T17:00:00.000Z");
    expect(g.context).toContain("signal_snapshot at 2026-04-15T17:00:00.000Z");
    expect(g.generatedIso).toBe("2026-04-15T17:00:00.000Z");
    expect(g.snapshotIso).toBe("2026-04-15T17:00:00.000Z");
  });

  it("lists only signals that were present, never absent ones", () => {
    const g = buildGroundedContext(baseInput());
    expect(g.context).toContain("market odds");
    expect(g.context).toContain("line movement");
    expect(g.context).not.toContain("injuries");
    expect(g.context).not.toContain("weather");
  });

  it("emits the priced component sub-scores it actually has", () => {
    const g = buildGroundedContext(baseInput());
    expect(g.context).toContain("Bookmaker Consensus: +22.0");
    expect(g.context).toContain("Pricing Edge: +12.0");
  });

  it("exposes real factor names for downstream checks", () => {
    const g = buildGroundedContext(baseInput());
    expect(g.factorNames).toContain("Bookmaker Consensus");
  });

  it("surfaces outcome + CLV only once the pick is settled", () => {
    const pending = buildGroundedContext(baseInput());
    expect(pending.isSettled).toBe(false);
    expect(pending.context).not.toContain("OUTCOME:");

    const settled = buildGroundedContext(
      baseInput({
        pick: {
          ...baseInput().pick,
          result: "LOSS",
          clvKind: "PROBABILITY",
          clvValue: 0.012,
          clvVerdict: "BEAT_CLOSE",
        },
      }),
    );
    expect(settled.isSettled).toBe(true);
    expect(settled.context).toContain("OUTCOME: LOSS");
    expect(settled.context).toContain("CLOSING-LINE VALUE: BEAT_CLOSE");
  });

  it("handles a pick with no snapshot honestly", () => {
    const g = buildGroundedContext(baseInput({ snapshot: null }));
    expect(g.snapshotIso).toBeNull();
    expect(g.context).toContain("SIGNAL SNAPSHOT: none recorded");
  });
});
