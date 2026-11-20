import { describe, expect, it } from "vitest";
import {
  buildCoachGameWriteup,
  validateStrictTwoSidedWriteup,
  type CoachGameWriteup,
} from "../coach-writeup-engine";

function makeBaseWriteup(overrides: Partial<CoachGameWriteup> = {}): CoachGameWriteup {
  return {
    id: "writeup-tnf-test-2026",
    gameId: "2026_11_IND_HOU",
    matchup: "IND @ HOU",
    awayTeam: "IND",
    homeTeam: "HOU",
    kickoff: "2026-11-19T20:15:00-05:00",
    windowSlot: "TNF",
    paceOfPlay: {
      paceLabel: "Neutral-Slow",
      projectedTotalPlays: 124,
      awaySecondsPerSnap: 27.4,
      homeSecondsPerSnap: 28.2,
      rationale: "Balanced script with strong defensive front.",
    },
    schemeMatchup: {
      offenseVsDefense: "Single-high shell vs inside zone run",
      keyLeveragePoint: "Early down run success",
      trenchAdvantage: "HOU edge group",
    },
    sideTotalCall: {
      sideSelection: "PASS (No Edge)",
      sideConfidence: "52/100",
      sideExpectedClv: 0.0,
      sideDecision: "PASS",
      totalSelection: "PASS (No Edge)",
      totalConfidence: "51/100",
      totalExpectedClv: 0.0,
      totalDecision: "PASS",
      rationale: "Market efficient",
    },
    topProps: [
      {
        playerId: "p1",
        playerName: "Jonathan Taylor",
        propType: "Rushing Yards",
        line: 79.5,
        side: "OVER",
        confidence: "62/100",
        expectedClv: 0.045,
        decision: "PLAY",
        nEffTargetNotes: "Primary workload",
        marketOverAmerican: -115,
        marketUnderAmerican: -115,
        marketFairProb: 0.5,
      },
      {
        playerId: "p2",
        playerName: "Davis Mills",
        propType: "Longest Completion",
        line: 32.5,
        side: "OVER",
        confidence: "65/100",
        expectedClv: 0.06,
        decision: "PLAY",
        nEffTargetNotes: "Missing under price",
        marketOverAmerican: -115,
        marketUnderAmerican: null,
      },
    ],
    correlatedSgpTicket: {
      title: "Quarantined SGP",
      legs: [],
      jointWinProb: 0,
      fairOdds: "+100",
      marketOdds: "+100",
      edgeScore: 0,
      correlationRationale: "No SGP",
    },
    dfsStacks: {
      captainPicks: [],
      cashCore: [],
      gppStacks: [],
    },
    quadEngineCitations: {
      arxiv: ["arxiv:2305.18290"],
      openalex: ["openalex:W4285718290"],
      kaggle: ["kaggle:nfl-big-data-bowl-2024"],
      hf: ["hf:models/gse-nfl-xgboost-v5"],
    },
    ...overrides,
  };
}

describe("coach-writeup fail-closed strict two-sided pricing", () => {
  it("validateStrictTwoSidedWriteup downgrades PLAY props missing finite two-sided pricing or non-positive CLV", () => {
    const base = makeBaseWriteup({
      topProps: [
        {
          playerId: "p1",
          playerName: "Jonathan Taylor",
          propType: "Rushing Yards",
          line: 79.5,
          side: "OVER",
          confidence: "62/100",
          expectedClv: 0.045,
          decision: "PLAY",
          nEffTargetNotes: "Two-sided priced",
          marketOverAmerican: -115,
          marketUnderAmerican: -115,
          marketFairProb: 0.5,
        },
        {
          playerId: "p2",
          playerName: "Davis Mills",
          propType: "Longest Completion",
          line: 32.5,
          side: "OVER",
          confidence: "65/100",
          expectedClv: 0.06,
          decision: "PLAY",
          nEffTargetNotes: "Omitted prices",
        },
        {
          playerId: "p3",
          playerName: "Tyler Warren",
          propType: "Receptions",
          line: 4.5,
          side: "OVER",
          confidence: "58/100",
          expectedClv: 0.0,
          decision: "PLAY",
          nEffTargetNotes: "Zero CLV",
          marketOverAmerican: -110,
          marketUnderAmerican: -120,
        },
      ],
    });

    const out = validateStrictTwoSidedWriteup(base);
    expect(out.topProps[0]?.decision).toBe("PLAY");
    expect(out.topProps[0]?.publishAllowed).toBe(true);
    expect(out.topProps[1]?.decision).toBe("PASS");
    expect(out.topProps[1]?.publishAllowed).toBe(false);
    expect(out.topProps[2]?.decision).toBe("PASS");
    expect(out.topProps[2]?.publishAllowed).toBe(false);
  });

  it("buildCoachGameWriteup fails closed when marketOverAmerican or marketUnderAmerican is null", () => {
    const built = buildCoachGameWriteup(makeBaseWriteup());
    expect(built.topProps[0]?.decision).toBe("PLAY");
    expect(built.topProps[1]?.decision).toBe("PASS");
    expect(built.topProps[1]?.publishAllowed).toBe(false);
  });
});
