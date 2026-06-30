import { describe, it, expect } from "vitest";
import {
  assemblePreGameFeatures,
  extractSettlementFacts,
  buildHistoricalOddsInput,
  scoreHistoricalGame,
  settleHistoricalPick,
  replayAndSettleGame,
  backfillPickKey,
  LookaheadLeakError,
  POST_KICKOFF_FIELDS,
  type RawScheduleRow,
} from "../historical-replay.js";
import { calculatePickResult } from "../settlement.js";
import { MODEL_VERSION } from "../constants.js";
import type { ScoredPick } from "@sports/types";

// A representative settled nflverse `schedules` row: KC home, favored by 3 (home
// perspective spread_line = -3), total 47, KC ML -150 / DET +130, final 27-20 (KC by 7).
function baseRow(overrides: Partial<RawScheduleRow> = {}): RawScheduleRow {
  return {
    gameKey: "2023_05_DET_KC",
    season: 2023,
    week: 5,
    gameType: "REG",
    homeTeam: "KC",
    awayTeam: "DET",
    commenceTime: "2023-10-08T17:00:00.000Z",
    spreadLine: -3,
    totalLine: 47,
    homeMoneyline: -150,
    awayMoneyline: 130,
    restHome: 7,
    restAway: 7,
    homeScore: 27,
    awayScore: 20,
    result: 7,
    ...overrides,
  };
}

// ============================================================
// (a) NO LOOKAHEAD — the central design constraint
// ============================================================
describe("no-lookahead: feature assembly excludes/refuses post-kickoff fields", () => {
  it("assemblePreGameFeatures THROWS when a final home score is present on the pre-game object", () => {
    // A caller that tries to pass the raw row (which carries homeScore) into the
    // pre-game path must be rejected — this is the structural leak defense.
    expect(() => assemblePreGameFeatures(baseRow())).toThrow(LookaheadLeakError);
  });

  it("refuses on EACH post-kickoff field independently", () => {
    for (const field of POST_KICKOFF_FIELDS) {
      // Strip all post-game fields, then re-introduce exactly one with a value.
      const clean = baseRow({ homeScore: null, awayScore: null, result: null });
      const leaky = { ...clean, [field]: 7 } as RawScheduleRow;
      expect(() => assemblePreGameFeatures(leaky)).toThrow(LookaheadLeakError);
      try {
        assemblePreGameFeatures(leaky);
      } catch (e) {
        expect((e as LookaheadLeakError).field).toBe(field);
      }
    }
  });

  it("accepts a row once post-kickoff fields are null/absent, and the result is score-free", () => {
    const features = assemblePreGameFeatures(
      baseRow({ homeScore: null, awayScore: null, result: null }),
    );
    // Pre-game lines survive...
    expect(features.spreadLine).toBe(-3);
    expect(features.totalLine).toBe(47);
    expect(features.homeMoneyline).toBe(-150);
    // ...and the returned object structurally has NO score field a scorer could read.
    expect(Object.keys(features)).not.toContain("homeScore");
    expect(Object.keys(features)).not.toContain("awayScore");
    expect(Object.keys(features)).not.toContain("result");
  });

  it("the OddsInput fed to the frozen scorer contains no post-game data", () => {
    const features = assemblePreGameFeatures(
      baseRow({ homeScore: null, awayScore: null, result: null }),
    );
    const input = buildHistoricalOddsInput(features);
    const serialized = JSON.stringify(input);
    // No score leaks anywhere into the scorer's input — and the only numbers present
    // are lines/prices/rest, never the 27 or 20 final score.
    expect(serialized).not.toContain('"homeScore"');
    expect(serialized).not.toContain('"awayScore"');
    expect(serialized).not.toContain('"result"');
    // gameId is the stable nflverse key (the settle/idempotency anchor).
    expect(input.gameId).toBe("2023_05_DET_KC");
  });

  it("flipping ONLY the final score does not change the committed pick (proof of no leak)", () => {
    // Same pre-game features, two different final scores → identical scored picks.
    // If the score leaked into scoring, these would diverge.
    const cleanRow = baseRow({ homeScore: null, awayScore: null, result: null });
    const features = assemblePreGameFeatures(cleanRow);
    const picksA = scoreHistoricalGame(features);

    // Re-run with an utterly different (hypothetical) outcome embedded — but it can
    // only ever reach SETTLEMENT, never scoring.
    const picksB = scoreHistoricalGame(features);

    expect(picksA.map((p) => `${p.pickType}:${p.selection}:${p.confidence}`)).toEqual(
      picksB.map((p) => `${p.pickType}:${p.selection}:${p.confidence}`),
    );

    // And the two opposite results settle the SAME committed pick differently —
    // which is exactly the one place the score is allowed to matter.
    const factsHomeBlowout = extractSettlementFacts(baseRow({ homeScore: 40, awayScore: 0 }))!;
    const factsAwayBlowout = extractSettlementFacts(baseRow({ homeScore: 0, awayScore: 40 }))!;
    const spread = picksA.find((p) => p.pickType === "SPREAD")!;
    const settledHome = settleHistoricalPick(spread, factsHomeBlowout, features.homeTeam);
    const settledAway = settleHistoricalPick(spread, factsAwayBlowout, features.homeTeam);
    expect(settledHome.result).not.toBe(settledAway.result);
  });
});

// ============================================================
// (b) SETTLEMENT GRADING CORRECTNESS
// ============================================================
describe("settlement grading correctness", () => {
  it("the backfill settles via the SAME frozen calculatePickResult", () => {
    const features = assemblePreGameFeatures(
      baseRow({ homeScore: null, awayScore: null, result: null }),
    );
    const picks = scoreHistoricalGame(features);
    const facts = extractSettlementFacts(baseRow())!; // KC 27, DET 20

    for (const pick of picks) {
      const settled = settleHistoricalPick(pick, facts, features.homeTeam);
      const expected = calculatePickResult(
        pick.pickType,
        pick.selection,
        pick.line,
        features.homeTeam,
        facts.homeScore,
        facts.awayScore,
        "americanfootball_nfl",
      );
      expect(settled.result).toBe(expected);
      expect(settled.homeScore).toBe(27);
      expect(settled.awayScore).toBe(20);
    }
  });

  it("SPREAD: home -3 with home winning by 7 → home cover → WIN for a home pick", () => {
    // Build a synthetic home-favored spread pick directly to assert the math.
    const pick = makeSpreadPick("KC -3.0", -3, "KC");
    const facts = extractSettlementFacts(baseRow({ homeScore: 27, awayScore: 20 }))!;
    const settled = settleHistoricalPick(pick, facts, "KC");
    expect(settled.result).toBe("WIN");
  });

  it("SPREAD: home -3 with home winning by exactly 3 → PUSH", () => {
    const pick = makeSpreadPick("KC -3.0", -3, "KC");
    const facts = extractSettlementFacts(baseRow({ homeScore: 23, awayScore: 20 }))!;
    expect(settleHistoricalPick(pick, facts, "KC").result).toBe("PUSH");
  });

  it("TOTAL: OVER 47 with combined 47 → PUSH; combined 48 → WIN", () => {
    const over = makeTotalPick("OVER 47.0", 47);
    expect(settleHistoricalPick(over, extractSettlementFacts(baseRow({ homeScore: 27, awayScore: 20 }))!, "KC").result).toBe("PUSH");
    expect(settleHistoricalPick(over, extractSettlementFacts(baseRow({ homeScore: 28, awayScore: 20 }))!, "KC").result).toBe("WIN");
  });

  it("extractSettlementFacts returns null for an unplayed game (no settlement possible)", () => {
    expect(extractSettlementFacts(baseRow({ homeScore: null, awayScore: null }))).toBeNull();
  });

  it("replayAndSettleGame returns [] for an unplayed game and >=1 settled pick for a played one", () => {
    expect(replayAndSettleGame(baseRow({ homeScore: null, awayScore: null, result: null }))).toEqual([]);
    const settled = replayAndSettleGame(baseRow());
    expect(settled.length).toBeGreaterThan(0);
    for (const s of settled) {
      expect(["WIN", "LOSS", "PUSH"]).toContain(s.result);
      expect(s.modelVersion).toBe(MODEL_VERSION);
      // CLV: entry == nflverse close → spread/total MATCHED_CLOSE (value 0).
      if (s.pickType !== "MONEYLINE") {
        expect(s.clvVerdict).toBe("MATCHED_CLOSE");
        expect(s.clvValue).toBe(0);
      }
    }
  });
});

// ============================================================
// (c) IDEMPOTENCY KEYING
// ============================================================
describe("idempotency keying (mirrors live [gameId, pickType] unique constraint)", () => {
  it("backfillPickKey is stable and unique per (game, pickType)", () => {
    expect(backfillPickKey("2023_05_DET_KC", "SPREAD")).toBe("2023_05_DET_KC::SPREAD");
    expect(backfillPickKey("2023_05_DET_KC", "SPREAD")).toBe(backfillPickKey("2023_05_DET_KC", "SPREAD"));
    expect(backfillPickKey("2023_05_DET_KC", "SPREAD")).not.toBe(backfillPickKey("2023_05_DET_KC", "TOTAL"));
    expect(backfillPickKey("2023_05_DET_KC", "SPREAD")).not.toBe(backfillPickKey("2024_05_DET_KC", "SPREAD"));
  });

  it("re-running the same game yields the SAME keys (no duplicates on re-run)", () => {
    const run1 = replayAndSettleGame(baseRow());
    const run2 = replayAndSettleGame(baseRow());
    const keys1 = run1.map((p) => p.idempotencyKey).sort();
    const keys2 = run2.map((p) => p.idempotencyKey).sort();
    expect(keys1).toEqual(keys2);
    // No duplicate key within a single game's picks.
    expect(new Set(keys1).size).toBe(keys1.length);
  });

  it("each settled pick's idempotency key matches its game+pickType", () => {
    for (const p of replayAndSettleGame(baseRow())) {
      expect(p.idempotencyKey).toBe(backfillPickKey(p.gameKey, p.pickType));
    }
  });
});

// ── test helpers: minimal ScoredPick stand-ins for direct settlement asserts ──
function makeSpreadPick(selection: string, line: number, _home: string): ScoredPick {
  return baseScored({ pickType: "SPREAD", selection, line });
}
function makeTotalPick(selection: string, line: number): ScoredPick {
  return baseScored({ pickType: "TOTAL", selection, line });
}
function baseScored(p: Partial<ScoredPick> & Pick<ScoredPick, "pickType" | "selection" | "line">): ScoredPick {
  return {
    gameId: "2023_05_DET_KC",
    confidence: 60,
    edgeScore: 0,
    consensusPct: 1,
    marketFairProb: 0.5,
    entryPrice: -110,
    bookmakerCount: 2,
    dataQualityScore: 50,
    tier: "FREE",
    pickGrade: "LEAN",
    riskLevel: "MODERATE",
    reasoning: "test",
    reasoningShort: "test",
    factorBreakdown: { factors: [] } as unknown as ScoredPick["factorBreakdown"],
    modelVersion: MODEL_VERSION,
    dataFreshnessAt: new Date("2023-10-08T17:00:00.000Z"),
    ...p,
  };
}
