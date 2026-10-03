import { describe, it, expect } from "vitest";
import { replayAndSettleGame, type RawScheduleRow } from "../historical-replay.js";

/**
 * No-lookahead INVARIANCE at the full-pipeline level.
 *
 * The #1 non-negotiable of the historical backfill engine is that a backfilled
 * pick is scored using ONLY pre-kickoff information; the final score may enter at
 * exactly ONE place — settlement. The existing historical-replay.test.ts proves the
 * structural defenses (assemblePreGameFeatures refuses post-kickoff fields, the
 * scorer's OddsInput is score-free, and a single-pick comparison). This test
 * strengthens that to a FULL replayAndSettleGame invariance assertion:
 *
 *   Run the WHOLE replay+settle for three rows that are byte-for-byte identical in
 *   every PRE-game field and differ ONLY in {homeScore, awayScore, result}. Every
 *   score-independent field of the settled pick must be deep-equal across all three
 *   (proving nothing leaks through stripPostGame into scoring). Only {result,
 *   homeScore, awayScore} may differ — and they must differ exactly as the grader
 *   dictates: a home-side SPREAD pick is a WIN when home blows out 40-0 and a LOSS
 *   when home is blown out 0-40.
 *
 * Pre-game fields mirror what scripts/backfill/historical-settlement-backfill.ts
 * feeds in (toRawRow): gameKey/season/week/gameType/homeTeam/awayTeam/commenceTime/
 * spreadLine/totalLine/homeMoneyline/awayMoneyline/restHome/restAway.
 */

const PRE_GAME: Omit<RawScheduleRow, "homeScore" | "awayScore" | "result"> = {
  gameKey: "2023_05_DET_KC",
  season: 2023,
  week: 5,
  gameType: "REG",
  homeTeam: "KC",
  awayTeam: "DET",
  commenceTime: "2023-10-08T17:00:00.000Z",
  spreadLine: -3, // HOME-perspective: KC favored by 3
  totalLine: 47,
  homeMoneyline: -150,
  awayMoneyline: 130,
  restHome: 7,
  restAway: 7,
};

// Three rows identical in every PRE-game field, differing ONLY in the post-game
// score triple. result == home margin (home_score - away_score), per the column.
function row(homeScore: number, awayScore: number): RawScheduleRow {
  return { ...PRE_GAME, homeScore, awayScore, result: homeScore - awayScore };
}

// The settled-pick fields that MUST be score-independent (verified empirically
// against the real SettledHistoricalPick shape — modelVersion is included because
// it too is frozen pre-game). homeScore/awayScore/result are deliberately excluded.
const SCORE_INDEPENDENT_FIELDS = [
  "gameKey",
  "pickType",
  "selection",
  "line",
  "confidence",
  "edgeScore",
  "marketFairProb",
  "entryOdds",
  "bookmakerCount",
  "modelVersion",
  "asOf",
  "idempotencyKey",
  "clvValue",
  "clvVerdict",
] as const;

type SettledPick = ReturnType<typeof replayAndSettleGame>[number];

function projectIndependent(pick: SettledPick): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SCORE_INDEPENDENT_FIELDS) out[k] = pick[k];
  return out;
}

describe("historical replay — full-pipeline no-lookahead invariance", () => {
  // home wins 27-20 (KC by 7), home blowout 40-0, away blowout 0-40
  const settledNormal = replayAndSettleGame(row(27, 20));
  const settledHomeBlowout = replayAndSettleGame(row(40, 0));
  const settledAwayBlowout = replayAndSettleGame(row(0, 40));

  it("produces the same NUMBER of picks regardless of final score (no score-gated pick suppression)", () => {
    expect(settledNormal.length).toBeGreaterThan(0);
    expect(settledHomeBlowout.length).toBe(settledNormal.length);
    expect(settledAwayBlowout.length).toBe(settledNormal.length);
  });

  it("every score-INDEPENDENT pick field is deep-equal across all three outcomes (no leak through stripPostGame)", () => {
    const indepNormal = settledNormal.map(projectIndependent);
    const indepHome = settledHomeBlowout.map(projectIndependent);
    const indepAway = settledAwayBlowout.map(projectIndependent);

    // If the final score leaked into scoring/CLV, any of confidence/edgeScore/
    // marketFairProb/entryOdds/selection/line/clv* would diverge here.
    expect(indepHome).toEqual(indepNormal);
    expect(indepAway).toEqual(indepNormal);
  });

  it("ONLY {result, homeScore, awayScore} differ — and they differ exactly as graded", () => {
    // The home-side SPREAD pick (KC -3.0) is the one whose grade flips with the score.
    const spreadNormal = settledNormal.find((p) => p.pickType === "SPREAD");
    const spreadHome = settledHomeBlowout.find((p) => p.pickType === "SPREAD");
    const spreadAway = settledAwayBlowout.find((p) => p.pickType === "SPREAD");
    expect(spreadNormal).toBeDefined();
    expect(spreadHome).toBeDefined();
    expect(spreadAway).toBeDefined();

    // The pick is on the HOME side (selection starts with the home team abbreviation).
    expect(spreadNormal!.selection.startsWith("KC")).toBe(true);

    // 40-0: home covers -3 → WIN. 0-40: home loses outright → LOSS.
    expect(spreadHome!.result).toBe("WIN");
    expect(spreadAway!.result).toBe("LOSS");
    expect(spreadHome!.result).not.toBe(spreadAway!.result);

    // The settled score fields echo the row's actual final score.
    expect(spreadHome!.homeScore).toBe(40);
    expect(spreadHome!.awayScore).toBe(0);
    expect(spreadAway!.homeScore).toBe(0);
    expect(spreadAway!.awayScore).toBe(40);
  });
});
