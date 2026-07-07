import { describe, it, expect } from "vitest";
import { equalWeightConsensus, accuracyWeightedConsensus, consensusRank, type RankSource } from "./consensus-rankings";
import { gradeSource, type GradedSource, type PositionOutcome } from "./expert-accuracy";

const ranks = (pairs: Array<[string, number]>): Map<string, number> => new Map(pairs);

describe("equalWeightConsensus — basic mechanics", () => {
  it("full agreement across sources reproduces that order", () => {
    const sources: RankSource[] = [
      { name: "a", ranks: ranks([["q1", 1], ["q2", 2]]) },
      { name: "b", ranks: ranks([["q1", 1], ["q2", 2]]) },
    ];
    const board = equalWeightConsensus("QB", sources);
    expect(board.mode).toBe("equal");
    expect(board.rows.map((r) => r.playerId)).toEqual(["q1", "q2"]);
    expect(board.rows[0]!.best).toBe(1);
    expect(board.rows[0]!.worst).toBe(1);
    expect(board.rows[0]!.sourcesCounted).toBe(2);
  });
});

describe("consensusRank — falls back to equal weight, flagged, when no grades supplied", () => {
  it("matches equalWeightConsensus exactly and reports mode:'equal'", () => {
    const sources: RankSource[] = [{ name: "a", ranks: ranks([["q1", 1], ["q2", 2]]) }];
    const withFallback = consensusRank("QB", sources);
    const direct = equalWeightConsensus("QB", sources);
    expect(withFallback.mode).toBe("equal");
    expect(withFallback.rows).toEqual(direct.rows);
  });
});

/**
 * THE CORE PROOF: a 6-player panel with a perfect, a mediocre, and a bad
 * source. Everything below is hand-computed and verified exact — no fuzzy
 * "should generally do better" claim. Equal weighting lets the bad source's
 * scrambled opinions distort the board; accuracy weighting (near-zero weight
 * on the bad source, since its measured track record is terrible) recovers
 * the TRUE order exactly.
 */
describe("accuracy-weighted consensus beats equal-weight consensus (hand-verified benchmark)", () => {
  const OUTCOMES: PositionOutcome[] = [
    { playerId: "p1", pos: "WR", actualPoints: 100 },
    { playerId: "p2", pos: "WR", actualPoints: 90 },
    { playerId: "p3", pos: "WR", actualPoints: 80 },
    { playerId: "p4", pos: "WR", actualPoints: 50 },
    { playerId: "p5", pos: "WR", actualPoints: 30 },
    { playerId: "p6", pos: "WR", actualPoints: 10 },
  ];
  const TRUE_RANK: Record<string, number> = { p1: 1, p2: 2, p3: 3, p4: 4, p5: 5, p6: 6 };

  const perfectRanks = ranks([["p1", 1], ["p2", 2], ["p3", 3], ["p4", 4], ["p5", 5], ["p6", 6]]);
  const mediocreRanks = ranks([["p1", 1], ["p2", 2], ["p4", 3], ["p3", 4], ["p6", 5], ["p5", 6]]);
  const badRanks = ranks([["p6", 1], ["p4", 2], ["p2", 3], ["p1", 4], ["p5", 5], ["p3", 6]]);

  const sources: RankSource[] = [
    { name: "perfect", ranks: perfectRanks },
    { name: "mediocre", ranks: mediocreRanks },
    { name: "bad", ranks: badRanks },
  ];

  const gradedSources: GradedSource[] = sources.map((s) => ({ name: s.name, ranks: s.ranks }));
  const grades = gradedSources.map((s) => {
    const g = gradeSource(s, "WR", OUTCOMES);
    return { source: g.source, overall: g.weightedGap };
  });

  it("grading reproduces the exact hand-computed gaps", () => {
    expect(grades).toEqual([
      { source: "perfect", overall: 0 },
      { source: "mediocre", overall: 100 },
      { source: "bad", overall: 260 },
    ]);
  });

  const rankDistanceError = (rows: readonly { playerId: string; rank: number }[]): number =>
    rows.reduce((s, r) => s + Math.abs(r.rank - TRUE_RANK[r.playerId]!), 0);

  it("equal-weight consensus lets the bad source distort the board (total rank-distance error = 6)", () => {
    const board = equalWeightConsensus("WR", sources);
    expect(board.rows.map((r) => r.playerId)).toEqual(["p1", "p2", "p4", "p6", "p3", "p5"]);
    expect(rankDistanceError(board.rows)).toBe(6);
  });

  it("accuracy-weighted consensus recovers the TRUE order exactly (total rank-distance error = 0)", () => {
    const board = accuracyWeightedConsensus("WR", sources, grades);
    expect(board.mode).toBe("accuracy-weighted");
    expect(board.rows.map((r) => r.playerId)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
    expect(rankDistanceError(board.rows)).toBe(0);
  });

  it("consensusRank defaults to accuracy-weighted when grades are supplied", () => {
    const board = consensusRank("WR", sources, { grades });
    expect(board.mode).toBe("accuracy-weighted");
    expect(rankDistanceError(board.rows)).toBe(0);
  });
});
