import { describe, expect, it } from "vitest";
import {
  scoreContestEntry,
  awardVirtualCoins,
  rankLeaderboard,
  type GameLine,
  type GameResult,
  type UserPick,
} from "../contest-scoring.js";

const lines: GameLine[] = [
  { gameId: "g1", modelHomeProb: 0.6 },
  { gameId: "g2", modelHomeProb: 0.55 },
];
const results: GameResult[] = [
  { gameId: "g1", homeWon: true },
  { gameId: "g2", homeWon: false },
];

describe("scoreContestEntry", () => {
  it("rewards a confident correct pick more than a hedged one (calibration = skill)", () => {
    const confident = scoreContestEntry([{ gameId: "g1", side: "home", confidence: 0.9 }], lines, results);
    const hedged = scoreContestEntry([{ gameId: "g1", side: "home", confidence: 0.55 }], lines, results);
    expect(confident.points).toBeGreaterThan(hedged.points);
    expect(confident.correctCount).toBe(1);
  });

  it("penalizes a confident wrong pick", () => {
    const wrong = scoreContestEntry([{ gameId: "g2", side: "home", confidence: 0.9 }], lines, results);
    expect(wrong.correctCount).toBe(0);
    expect(wrong.points).toBeLessThan(50); // far from the outcome → low Brier points
  });

  it("only grades games that have both a line and a result", () => {
    const score = scoreContestEntry(
      [
        { gameId: "g1", side: "home" },
        { gameId: "unknown", side: "away" },
      ],
      lines,
      results,
    );
    expect(score.graded).toBe(1);
  });

  it("flags beating the model and the model never beats itself trivially", () => {
    // Perfect picks (1.0 toward the right side) beat the model's 0.6/0.55.
    const picks: UserPick[] = [
      { gameId: "g1", side: "home", confidence: 1 },
      { gameId: "g2", side: "away", confidence: 1 },
    ];
    const score = scoreContestEntry(picks, lines, results);
    expect(score.beatModel).toBe(true);
    expect(score.points).toBeGreaterThan(score.modelPoints);
  });
});

describe("awardVirtualCoins", () => {
  it("is zero for an empty entry and never negative", () => {
    expect(awardVirtualCoins(scoreContestEntry([], lines, results))).toBe(0);
  });

  it("adds a fixed bonus for beating the model", () => {
    const beat = scoreContestEntry(
      [
        { gameId: "g1", side: "home", confidence: 1 },
        { gameId: "g2", side: "away", confidence: 1 },
      ],
      lines,
      results,
    );
    expect(awardVirtualCoins(beat)).toBeGreaterThanOrEqual(250);
  });
});

describe("rankLeaderboard", () => {
  it("orders by points descending", () => {
    const a = { entrantId: "a", score: scoreContestEntry([{ gameId: "g1", side: "home", confidence: 0.9 }], lines, results) };
    const b = { entrantId: "b", score: scoreContestEntry([{ gameId: "g1", side: "away", confidence: 0.9 }], lines, results) };
    const ranked = rankLeaderboard([b, a]);
    expect(ranked[0]?.entrantId).toBe("a");
  });
});
