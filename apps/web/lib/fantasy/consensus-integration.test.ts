import { describe, it, expect } from "vitest";
import { PLAYERS, byPosition } from "./players";
import { consensusRank, type RankSource } from "./consensus-rankings";
import { gradeSource } from "./expert-accuracy";

/**
 * Proves the engine interoperates with GSE's real illustrative player model
 * (not just synthetic p1..p6 fixtures) — the WR pool, real IDs, real `proj`.
 * `proj` stands in as the graded "actual outcome" for this illustrative smoke
 * test (self-consistent: it's GSE's own illustrative ground truth).
 */
describe("consensus engine on GSE's real illustrative player pool", () => {
  const wrs = byPosition("WR");
  const outcomes = wrs.map((p) => ({ playerId: p.id, pos: p.pos, actualPoints: p.proj }));

  // Source A: the true proj order — a "sharp" illustrative source.
  const trueOrder = [...wrs].sort((a, b) => b.proj - a.proj);
  const sourceA: RankSource = { name: "Model A", ranks: new Map(trueOrder.map((p, i) => [p.id, i + 1])) };

  // Source B: a "weak" illustrative source — reversed order.
  const reversed = [...trueOrder].reverse();
  const sourceB: RankSource = { name: "Model B", ranks: new Map(reversed.map((p, i) => [p.id, i + 1])) };

  const gradeA = gradeSource({ name: "Model A", ranks: sourceA.ranks }, "WR", outcomes);
  const gradeB = gradeSource({ name: "Model B", ranks: sourceB.ranks }, "WR", outcomes);

  it("grades the sharp source far better than the reversed one", () => {
    expect(gradeA.weightedGap).toBe(0); // exactly right by construction
    expect(gradeB.weightedGap).toBeGreaterThan(gradeA.weightedGap);
  });

  it("produces a full, valid consensus board covering every real WR", () => {
    const grades = [
      { source: "Model A", overall: gradeA.weightedGap },
      { source: "Model B", overall: gradeB.weightedGap },
    ];
    const board = consensusRank("WR", [sourceA, sourceB], { grades });
    expect(board.mode).toBe("accuracy-weighted");
    expect(board.rows.length).toBe(wrs.length);
    expect(new Set(board.rows.map((r) => r.playerId)).size).toBe(wrs.length);
    // With Model A carrying nearly all the weight, the board should track the
    // true proj order closely at the top.
    expect(board.rows[0]!.playerId).toBe(trueOrder[0]!.id);
  });
});
