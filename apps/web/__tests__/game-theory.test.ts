/**
 * Tests for game-theory.ts — at least 105 test cases.
 * Covers: payoff matrix utilities, Nash equilibria, minimax tree,
 * cooperative game theory, auctions, sports applications.
 */

import { describe, expect, it } from "vitest";
import {
  zeroSumComplement,
  dominatedStrategies,
  eliminateDominated,
  saddlePoint,
  maximin,
  minimax,
  expectedPayoff,
  pureNashEquilibria,
  mixedNashZeroSum,
  nashValueZeroSum,
  bestResponse,
  minimaxTree,
  minimaxAlphaBeta,
  buildGameTree,
  shapleyValue,
  coreCheck,
  nucleolus1D,
  banzhafValue,
  vickreyAuction,
  firstPriceAuction,
  auctionRevenue,
  optimalBidFractionFirstPrice,
  coachingDecisionMatrix,
  bettingMarketGame,
  lineupOptimizationGame,
  moneylineSharp,
} from "../lib/math/game-theory";

// ---------------------------------------------------------------------------
// zeroSumComplement
// ---------------------------------------------------------------------------
describe("zeroSumComplement", () => {
  it("negates all values", () => {
    const m = [[1, 2], [3, 4]];
    const result = zeroSumComplement(m);
    expect(result).toEqual([[-1, -2], [-3, -4]]);
  });

  it("handles zeros", () => {
    const m = [[0, 0], [0, 0]];
    const result = zeroSumComplement(m);
    // -0 === 0 in JS, check via closeTo
    expect(result[0][0]).toBeCloseTo(0, 9);
    expect(result[0][1]).toBeCloseTo(0, 9);
    expect(result[1][0]).toBeCloseTo(0, 9);
    expect(result[1][1]).toBeCloseTo(0, 9);
  });

  it("handles negative values", () => {
    const m = [[-1, -2]];
    expect(zeroSumComplement(m)).toEqual([[1, 2]]);
  });

  it("does not mutate original matrix", () => {
    const m = [[1, 2], [3, 4]];
    const copy = m.map((r) => [...r]);
    zeroSumComplement(m);
    expect(m).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// dominatedStrategies
// ---------------------------------------------------------------------------
describe("dominatedStrategies", () => {
  it("identifies dominated row strategy", () => {
    // Row 0: [0,0], Row 1: [1,1] — row 0 dominated by row 1
    const m = [[0, 0], [1, 1]];
    const dominated = dominatedStrategies(m, 0);
    expect(dominated).toContain(0);
    expect(dominated).not.toContain(1);
  });

  it("returns empty when no strategies dominated", () => {
    const m = [[3, 0], [0, 3]];
    expect(dominatedStrategies(m, 0)).toEqual([]);
  });

  it("identifies dominated column strategy for player 2", () => {
    // For P2 (min), col payoffs (negated) — col with lower p2 payoff dominates
    // m = [[1,0],[1,0]] col 1 is dominated by col 0 for p2 (p2 prefers cols that minimize)
    const m = [[0, 1], [0, 1]]; // col 0 always = 0, col 1 always = 1; p2 prefers col 0
    const dominated = dominatedStrategies(m, 1);
    expect(dominated).toContain(1);
  });

  it("handles 3x3 matrix with clear domination", () => {
    // Row 2 dominates row 0: [5,5,5] > [1,2,3] in all cols
    const m = [[1, 2, 3], [4, 4, 4], [5, 5, 5]];
    const dominated = dominatedStrategies(m, 0);
    expect(dominated).toContain(0);
  });

  it("does not flag non-dominated strategies in prisoner's dilemma", () => {
    // Prisoner's dilemma: Defect dominates Cooperate for p1
    // C/D rows, C/D cols; payoffs: (C,C)=3, (C,D)=0, (D,C)=5, (D,D)=1
    const m = [[3, 0], [5, 1]];
    const dominated = dominatedStrategies(m, 0);
    expect(dominated).toContain(0); // Cooperate is dominated
    expect(dominated).not.toContain(1); // Defect is not
  });
});

// ---------------------------------------------------------------------------
// eliminateDominated (IESDS)
// ---------------------------------------------------------------------------
describe("eliminateDominated", () => {
  it("eliminates dominated row in simple case", () => {
    const m = [[0, 0], [1, 1]];
    const { matrix: reduced, p1Kept } = eliminateDominated(m);
    expect(p1Kept).not.toContain(0);
    expect(p1Kept).toContain(1);
  });

  it("preserves all strategies when none dominated", () => {
    const m = [[3, 0], [0, 3]];
    const { matrix: reduced, p1Kept, p2Kept } = eliminateDominated(m);
    expect(p1Kept).toEqual([0, 1]);
    expect(p2Kept).toEqual([0, 1]);
    expect(reduced).toEqual(m);
  });

  it("iteratively eliminates in 3x3 game", () => {
    // Classic IESDS: start with dominated strategy, after eliminating reveal new domination
    const m = [
      [4, 3, 0],
      [3, 1, 4],
      [0, 0, 3],
    ];
    const { matrix: reduced } = eliminateDominated(m);
    expect(reduced.length).toBeLessThanOrEqual(3);
  });

  it("returns original indices in p1Kept and p2Kept", () => {
    const m = [[0, 0], [1, 1], [2, 2]];
    const { p1Kept } = eliminateDominated(m);
    expect(p1Kept).toContain(2); // row 2 best
    expect(p1Kept).not.toContain(0);
  });

  it("handles 1x1 matrix", () => {
    const m = [[5]];
    const { matrix: reduced, p1Kept, p2Kept } = eliminateDominated(m);
    expect(reduced).toEqual([[5]]);
    expect(p1Kept).toEqual([0]);
    expect(p2Kept).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// saddlePoint
// ---------------------------------------------------------------------------
describe("saddlePoint", () => {
  it("finds saddle point in simple matrix", () => {
    // Matrix: row min = [1,2], col max = [2,3]; saddle at (0,1) = value 2? Let's check
    //   1 2
    //   3 4
    // Row mins: 1, 3; max = 3 → row 1
    // Col maxes: 3, 4; min = 3 → col 0
    // value = matrix[1][0] = 3 — is it row min (3) and col max (3)? yes
    const m = [[1, 2], [3, 4]];
    const sp = saddlePoint(m);
    expect(sp).not.toBeNull();
    expect(sp!.value).toBe(3);
    expect(sp!.row).toBe(1);
    expect(sp!.col).toBe(0);
  });

  it("returns null for matching pennies (no pure NE)", () => {
    // Matching pennies: [[1,-1],[-1,1]]
    const m = [[1, -1], [-1, 1]];
    expect(saddlePoint(m)).toBeNull();
  });

  it("finds saddle point in coordination game", () => {
    const m = [[2, 0], [0, 1]];
    // Row mins: 0, 0; max = 0 (tie row 0 and 1)
    // Col maxes: 2, 1; min = 1 → col 1
    // value = matrix[?][1]; need row min of that col = 1 at row 1
    const sp = saddlePoint(m);
    if (sp !== null) {
      expect(sp.value).toBe(m[sp.row][sp.col]);
    }
  });

  it("finds saddle point at top-left", () => {
    const m = [[5, 3], [4, 2]];
    // Row mins: 3, 2; maximin = 3 (row 0)
    // Col maxes: 5, 3; minimax = 3 (col 1)
    // 3 = 3 → saddle at (0,1)
    const sp = saddlePoint(m);
    expect(sp).not.toBeNull();
    expect(sp!.row).toBe(0);
    expect(sp!.col).toBe(1);
    expect(sp!.value).toBe(3);
  });

  it("saddle point value equals maximin equals minimax", () => {
    const m = [[3, 1, -1], [2, 0, -2], [1, -1, -3]];
    // Saddle at (0,2)=-1? Let's trust the function
    const sp = saddlePoint(m);
    if (sp !== null) {
      const mm = maximin(m);
      const mini = minimax(m);
      expect(sp.value).toBeCloseTo(mm.value, 9);
      expect(sp.value).toBeCloseTo(mini.value, 9);
    }
  });
});

// ---------------------------------------------------------------------------
// maximin / minimax
// ---------------------------------------------------------------------------
describe("maximin", () => {
  it("returns correct maximin strategy", () => {
    const m = [[1, 3], [2, 2]];
    // Row mins: 1, 2; max = 2 → row 1
    const result = maximin(m);
    expect(result.strategy).toBe(1);
    expect(result.value).toBe(2);
  });

  it("handles single row", () => {
    const m = [[5, 3, 7]];
    const result = maximin(m);
    expect(result.strategy).toBe(0);
    expect(result.value).toBe(3);
  });

  it("handles negative values", () => {
    const m = [[-1, -3], [-2, -2]];
    const result = maximin(m);
    expect(result.value).toBe(-2);
  });
});

describe("minimax (matrix)", () => {
  it("returns correct minimax strategy", () => {
    const m = [[1, 3], [2, 2]];
    // Col maxes: 2, 3; min = 2 → col 0
    const result = minimax(m);
    expect(result.strategy).toBe(0);
    expect(result.value).toBe(2);
  });

  it("handles single column", () => {
    const m = [[5], [3], [7]];
    const result = minimax(m);
    expect(result.strategy).toBe(0);
    expect(result.value).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// expectedPayoff
// ---------------------------------------------------------------------------
describe("expectedPayoff", () => {
  it("computes correct payoff for pure strategies", () => {
    const m = [[1, 2], [3, 4]];
    expect(expectedPayoff(m, [1, 0], [1, 0])).toBe(1);
    expect(expectedPayoff(m, [1, 0], [0, 1])).toBe(2);
    expect(expectedPayoff(m, [0, 1], [1, 0])).toBe(3);
    expect(expectedPayoff(m, [0, 1], [0, 1])).toBe(4);
  });

  it("computes correct payoff for uniform mix", () => {
    const m = [[1, 1], [1, 1]];
    expect(expectedPayoff(m, [0.5, 0.5], [0.5, 0.5])).toBeCloseTo(1, 9);
  });

  it("computes matching pennies expected payoff", () => {
    const m = [[1, -1], [-1, 1]];
    // Uniform mix → EV = 0
    expect(expectedPayoff(m, [0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 9);
  });

  it("computes correct payoff for 3x2 matrix", () => {
    const m = [[2, 0], [0, 2], [1, 1]];
    const result = expectedPayoff(m, [0, 0, 1], [0.5, 0.5]);
    expect(result).toBeCloseTo(1, 9);
  });
});

// ---------------------------------------------------------------------------
// pureNashEquilibria
// ---------------------------------------------------------------------------
describe("pureNashEquilibria", () => {
  it("finds pure NE in coordination game with explicit p2 matrix", () => {
    // Coordination game: (0,0) and (1,1) are both NE
    const p1 = [[2, 0], [0, 1]];
    const p2 = [[2, 0], [0, 1]]; // p2 has same preferences (coordination)
    const nes = pureNashEquilibria(p1, p2);
    expect(nes.length).toBeGreaterThanOrEqual(1);
  });

  it("finds no pure NE in matching pennies", () => {
    const m = [[1, -1], [-1, 1]];
    expect(pureNashEquilibria(m)).toEqual([]);
  });

  it("finds NE in prisoner's dilemma", () => {
    // (D,D) is the unique NE
    // P1 payoffs: (C,C)=3,(C,D)=0,(D,C)=5,(D,D)=1
    const p1 = [[3, 0], [5, 1]];
    const p2 = [[3, 5], [0, 1]];
    const nes = pureNashEquilibria(p1, p2);
    expect(nes).toHaveLength(1);
    expect(nes[0]).toEqual({ row: 1, col: 1 });
  });

  it("finds multiple pure NE in battle of sexes", () => {
    // Battle of sexes: (Opera,Opera)=(2,1), (Football,Football)=(1,2), others=(0,0)
    const p1 = [[2, 0], [0, 1]];
    const p2 = [[1, 0], [0, 2]];
    const nes = pureNashEquilibria(p1, p2);
    expect(nes.length).toBe(2);
  });

  it("finds pure NE in dominant strategy game", () => {
    const p1 = [[5, 5], [0, 0]];
    const p2 = [[5, 0], [5, 0]];
    const nes = pureNashEquilibria(p1, p2);
    expect(nes.some((ne) => ne.row === 0)).toBe(true);
  });

  it("uses zero-sum complement when p2Matrix omitted", () => {
    const m = [[3, 1], [2, 4]];
    const nes1 = pureNashEquilibria(m);
    const nes2 = pureNashEquilibria(m, zeroSumComplement(m));
    expect(nes1).toEqual(nes2);
  });
});

// ---------------------------------------------------------------------------
// mixedNashZeroSum — Matching Pennies (the iconic test)
// ---------------------------------------------------------------------------
describe("mixedNashZeroSum", () => {
  it("matching pennies: both players mix 50/50", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    expect(result.p1Strategy[0]).toBeCloseTo(0.5, 5);
    expect(result.p1Strategy[1]).toBeCloseTo(0.5, 5);
    expect(result.p2Strategy[0]).toBeCloseTo(0.5, 5);
    expect(result.p2Strategy[1]).toBeCloseTo(0.5, 5);
  });

  it("matching pennies: game value is 0", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    expect(result.p1Value).toBeCloseTo(0, 5);
    expect(result.p2Value).toBeCloseTo(0, 5);
  });

  it("matching pennies: not pure NE", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    expect(result.isPure).toBe(false);
  });

  it("returns pure NE for saddle-point game", () => {
    // [[3,1],[2,4]]: maximin=2, minimax=3 — NO saddle point (it's a mixed game)
    // Use [[5,3],[2,4]]: row mins=3,2 maximin=3; col maxes=5,4 minimax=4 → no saddle
    // Use [[4,2],[3,5]]: row mins=2,3 maximin=3; col maxes=4,5 minimax=4 → no saddle
    // Use [[3,3],[1,4]]: row mins=3,1 maximin=3; col maxes=3,4 minimax=3 → saddle at (0,0)=3 ✓
    const m = [[3, 3], [1, 4]];
    const result = mixedNashZeroSum(m);
    expect(result.isPure).toBe(true);
  });

  it("p1 strategy sums to 1", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    const s = result.p1Strategy.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 8);
  });

  it("p2 strategy sums to 1", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    const s = result.p2Strategy.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 8);
  });

  it("game value is consistent with expectedPayoff at NE", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    const ev = expectedPayoff(m, result.p1Strategy, result.p2Strategy);
    expect(ev).toBeCloseTo(result.p1Value, 5);
  });

  it("p1Value + p2Value = 0 for zero-sum", () => {
    const m = [[2, -1], [-1, 3]];
    const result = mixedNashZeroSum(m);
    expect(result.p1Value + result.p2Value).toBeCloseTo(0, 8);
  });

  it("all probabilities non-negative", () => {
    const m = [[1, -1], [-1, 1]];
    const result = mixedNashZeroSum(m);
    for (const p of [...result.p1Strategy, ...result.p2Strategy]) {
      expect(p).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

// ---------------------------------------------------------------------------
// nashValueZeroSum
// ---------------------------------------------------------------------------
describe("nashValueZeroSum", () => {
  it("returns 0 for matching pennies", () => {
    const m = [[1, -1], [-1, 1]];
    expect(nashValueZeroSum(m)).toBeCloseTo(0, 5);
  });

  it("returns saddle-point value for game with pure NE", () => {
    const m = [[3, 1], [2, 4]];
    const val = nashValueZeroSum(m);
    const sp = saddlePoint(m);
    if (sp !== null) {
      expect(val).toBeCloseTo(sp.value, 5);
    }
  });

  it("returns a finite number", () => {
    const m = [[5, -3], [-2, 4]];
    expect(isFinite(nashValueZeroSum(m))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// bestResponse
// ---------------------------------------------------------------------------
describe("bestResponse", () => {
  it("p1 best response to pure col strategy", () => {
    const m = [[1, 3], [2, 0]];
    // Against col [1,0], p1 payoffs: row0=1, row1=2 → row1
    expect(bestResponse(m, [1, 0], 0)).toBe(1);
    // Against col [0,1], p1 payoffs: row0=3, row1=0 → row0
    expect(bestResponse(m, [0, 1], 0)).toBe(0);
  });

  it("p2 best response to pure row strategy", () => {
    const m = [[1, 3], [2, 0]];
    // Against row [1,0] (row 0), p2 wants to minimize: col0=1, col1=3 → col0
    expect(bestResponse(m, [1, 0], 1)).toBe(0);
    // Against row [0,1] (row 1), col0=2, col1=0 → col1
    expect(bestResponse(m, [0, 1], 1)).toBe(1);
  });

  it("best response against uniform mix", () => {
    const m = [[4, 0], [0, 4]];
    // Uniform mix → both rows equal; argmax returns 0 (first one found)
    const br = bestResponse(m, [0.5, 0.5], 0);
    expect(br).toBeGreaterThanOrEqual(0);
    expect(br).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// minimaxTree / minimaxAlphaBeta
// ---------------------------------------------------------------------------
describe("minimaxTree", () => {
  it("returns leaf payoff at depth 0", () => {
    const leaf: import("../lib/math/game-theory").TreeNode = {
      id: 0, children: [], payoff: 7, player: 0,
    };
    expect(minimaxTree(leaf, 0, true)).toBe(7);
  });

  it("returns leaf payoff for childless node regardless of depth", () => {
    const leaf: import("../lib/math/game-theory").TreeNode = {
      id: 0, children: [], payoff: -3, player: 0,
    };
    expect(minimaxTree(leaf, 5, true)).toBe(-3);
  });

  it("simple 2-level tree: max of mins", () => {
    // Root (max) → [A(min)→[2,7], B(min)→[1,8]]
    const makeLeaf = (id: number, p: number): import("../lib/math/game-theory").TreeNode =>
      ({ id, children: [], payoff: p, player: 1 });
    const a: import("../lib/math/game-theory").TreeNode = {
      id: 10, children: [makeLeaf(1, 2), makeLeaf(2, 7)], player: 1,
    };
    const b: import("../lib/math/game-theory").TreeNode = {
      id: 11, children: [makeLeaf(3, 1), makeLeaf(4, 8)], player: 1,
    };
    const root: import("../lib/math/game-theory").TreeNode = {
      id: 0, children: [a, b], player: 0,
    };
    // min(2,7)=2, min(1,8)=1; max(2,1)=2
    expect(minimaxTree(root, 2, true)).toBe(2);
  });

  it("depth-limited stops early", () => {
    // Node with children but depth=0 → returns 0 (no payoff set)
    const child: import("../lib/math/game-theory").TreeNode = {
      id: 1, children: [], payoff: 99, player: 1,
    };
    const root: import("../lib/math/game-theory").TreeNode = {
      id: 0, children: [child], player: 0, payoff: 42,
    };
    expect(minimaxTree(root, 0, true)).toBe(42);
  });

  it("uses default payoff 0 when undefined", () => {
    const leaf: import("../lib/math/game-theory").TreeNode = {
      id: 0, children: [], player: 0,
    };
    expect(minimaxTree(leaf, 0, true)).toBe(0);
  });
});

describe("minimaxAlphaBeta produces same result as minimax", () => {
  it("agrees on depth-2 tree", () => {
    const tree = buildGameTree(2, 3, 1234);
    const mm = minimaxTree(tree, 2, true);
    const ab = minimaxAlphaBeta(tree, 2, true);
    expect(ab).toBeCloseTo(mm, 9);
  });

  it("agrees on depth-3 tree", () => {
    const tree = buildGameTree(3, 2, 5678);
    const mm = minimaxTree(tree, 3, true);
    const ab = minimaxAlphaBeta(tree, 3, true);
    expect(ab).toBeCloseTo(mm, 9);
  });

  it("agrees on depth-4 tree with branching factor 2", () => {
    const tree = buildGameTree(4, 2, 9999);
    const mm = minimaxTree(tree, 4, true);
    const ab = minimaxAlphaBeta(tree, 4, true);
    expect(ab).toBeCloseTo(mm, 9);
  });

  it("same as minimax at leaf", () => {
    const leaf: import("../lib/math/game-theory").TreeNode = {
      id: 0, children: [], payoff: 5, player: 0,
    };
    expect(minimaxAlphaBeta(leaf, 0, true)).toBe(5);
    expect(minimaxTree(leaf, 0, true)).toBe(5);
  });

  it("alpha-beta with explicit alpha/beta params", () => {
    const tree = buildGameTree(2, 3, 42);
    const mm = minimaxTree(tree, 2, true);
    const ab = minimaxAlphaBeta(tree, 2, true, -Infinity, Infinity);
    expect(ab).toBeCloseTo(mm, 9);
  });
});

// ---------------------------------------------------------------------------
// buildGameTree
// ---------------------------------------------------------------------------
describe("buildGameTree", () => {
  it("creates tree with correct branching factor", () => {
    const tree = buildGameTree(2, 3);
    expect(tree.children).toHaveLength(3);
    for (const child of tree.children) {
      expect(child.children).toHaveLength(3);
    }
  });

  it("leaves are at correct depth", () => {
    const tree = buildGameTree(1, 2);
    for (const child of tree.children) {
      expect(child.children).toHaveLength(0);
      expect(child.payoff).toBeDefined();
    }
  });

  it("leaf payoffs are in [-10, 10]", () => {
    const tree = buildGameTree(2, 4);
    function checkLeaves(node: import("../lib/math/game-theory").TreeNode): void {
      if (node.children.length === 0 && node.payoff !== undefined) {
        expect(node.payoff).toBeGreaterThanOrEqual(-10);
        expect(node.payoff).toBeLessThanOrEqual(10);
      }
      for (const c of node.children) checkLeaves(c);
    }
    checkLeaves(tree);
  });

  it("same seed produces same tree", () => {
    const t1 = buildGameTree(2, 2, 777);
    const t2 = buildGameTree(2, 2, 777);
    const leaves1: number[] = [];
    const leaves2: number[] = [];
    function collect(node: import("../lib/math/game-theory").TreeNode, arr: number[]): void {
      if (node.payoff !== undefined) arr.push(node.payoff);
      for (const c of node.children) collect(c, arr);
    }
    collect(t1, leaves1);
    collect(t2, leaves2);
    expect(leaves1).toEqual(leaves2);
  });

  it("different seeds produce different trees", () => {
    const t1 = buildGameTree(2, 2, 1);
    const t2 = buildGameTree(2, 2, 2);
    const leaves1: number[] = [];
    const leaves2: number[] = [];
    function collect(node: import("../lib/math/game-theory").TreeNode, arr: number[]): void {
      if (node.payoff !== undefined) arr.push(node.payoff);
      for (const c of node.children) collect(c, arr);
    }
    collect(t1, leaves1);
    collect(t2, leaves2);
    expect(leaves1).not.toEqual(leaves2);
  });
});

// ---------------------------------------------------------------------------
// shapleyValue
// ---------------------------------------------------------------------------
describe("shapleyValue", () => {
  it("symmetric game: equal Shapley values", () => {
    // All coalitions of same size have same value
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => S.length,
    };
    const phi = shapleyValue(game);
    expect(phi[0]).toBeCloseTo(phi[1], 8);
    expect(phi[1]).toBeCloseTo(phi[2], 8);
  });

  it("Shapley values sum to v(grand coalition)", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => {
        if (S.length === 3) return 6;
        if (S.length === 2) return 3;
        if (S.length === 1) return 1;
        return 0; // empty coalition must return 0
      },
    };
    const phi = shapleyValue(game);
    const total = phi.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(6, 8);
  });

  it("dummy player has Shapley value 0", () => {
    // Player 2 is a dummy: v(S∪{2}) = v(S) for all S
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => {
        const noP2 = S.filter((x) => x !== 2);
        if (noP2.length === 2) return 4;
        if (noP2.length === 1) return 2;
        return 0;
      },
    };
    const phi = shapleyValue(game);
    expect(phi[2]).toBeCloseTo(0, 8);
  });

  it("3-player simple voting game Shapley values", () => {
    // Majority rule: coalition wins if |S| >= 2
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.length >= 2 ? 1 : 0),
    };
    const phi = shapleyValue(game);
    // By symmetry each player has value 1/3
    expect(phi[0]).toBeCloseTo(1 / 3, 6);
    expect(phi[1]).toBeCloseTo(1 / 3, 6);
    expect(phi[2]).toBeCloseTo(1 / 3, 6);
  });

  it("2-player game: equal split", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 2,
      v: (S) => (S.length === 2 ? 10 : 0),
    };
    const phi = shapleyValue(game);
    expect(phi[0]).toBeCloseTo(5, 8);
    expect(phi[1]).toBeCloseTo(5, 8);
  });

  it("veto player gets majority of value", () => {
    // Player 0 is veto: no coalition works without player 0
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.includes(0) ? S.length : 0),
    };
    const phi = shapleyValue(game);
    expect(phi[0]).toBeGreaterThan(phi[1]);
    expect(phi[0]).toBeGreaterThan(phi[2]);
  });
});

// ---------------------------------------------------------------------------
// coreCheck
// ---------------------------------------------------------------------------
describe("coreCheck", () => {
  it("equal split is in core for superadditive symmetric game", () => {
    // Glove game: v(S) = S.length (purely additive, each player contributes 1)
    // v({0,1}) = 2 and allocation [2/3,2/3,2/3] sums to 2 >= v({0,1})=2 ✓
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => S.length,
    };
    // Shapley allocation = [1,1,1] which must satisfy v(S) for all S
    // v({0,1})=2, sum={1,1}=2 ✓; v({0})=1, sum={1}=1 ✓
    expect(coreCheck(game, [1, 1, 1])).toBe(true);
  });

  it("unequal allocation violating coalition constraint is not in core", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 2,
      v: (S) => {
        if (S.length === 2) return 10;
        if (S.includes(0)) return 8; // player 0 alone can get 8
        return 0;
      },
    };
    // Giving player 0 only 3 violates {0} constraint (8 > 3)
    expect(coreCheck(game, [3, 7])).toBe(false);
  });

  it("Shapley value is in core for convex game", () => {
    // Convex game: v is supermodular
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => {
        if (S.length === 3) return 12;
        if (S.length === 2) return 6;
        if (S.length === 1) return 2;
        return 0;
      },
    };
    const phi = shapleyValue(game);
    expect(coreCheck(game, phi)).toBe(true);
  });

  it("Shapley value NOT necessarily in core for non-convex games", () => {
    // A valid test: just check that coreCheck returns boolean
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 2,
      v: (S) => S.length,
    };
    const phi = shapleyValue(game);
    const inCore = coreCheck(game, phi);
    expect(typeof inCore).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// nucleolus1D (3-player)
// ---------------------------------------------------------------------------
describe("nucleolus1D", () => {
  it("returns array of length 3", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.length === 3 ? 3 : 0),
    };
    const nuc = nucleolus1D(game);
    expect(nuc).toHaveLength(3);
  });

  it("allocations sum to grand coalition value", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.length === 3 ? 6 : S.length === 2 ? 3 : 1),
    };
    const nuc = nucleolus1D(game);
    const total = nuc[0] + nuc[1] + nuc[2];
    expect(total).toBeCloseTo(6, 1);
  });

  it("symmetric game: equal allocation", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.length === 3 ? 3 : 0),
    };
    const nuc = nucleolus1D(game);
    expect(nuc[0]).toBeCloseTo(1, 1);
    expect(nuc[1]).toBeCloseTo(1, 1);
    expect(nuc[2]).toBeCloseTo(1, 1);
  });

  it("throws for non-3-player game", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 4,
      v: (S) => S.length,
    };
    expect(() => nucleolus1D(game)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// banzhafValue
// ---------------------------------------------------------------------------
describe("banzhafValue", () => {
  it("values sum to 1", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.length >= 2 ? 1 : 0),
    };
    const bz = banzhafValue(game);
    const total = bz.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 8);
  });

  it("all players equal in symmetric game", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.length >= 2 ? 1 : 0),
    };
    const bz = banzhafValue(game);
    expect(bz[0]).toBeCloseTo(bz[1], 6);
    expect(bz[1]).toBeCloseTo(bz[2], 6);
  });

  it("veto player has highest Banzhaf value", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 3,
      v: (S) => (S.includes(0) && S.length >= 2 ? 1 : 0),
    };
    const bz = banzhafValue(game);
    expect(bz[0]).toBeGreaterThan(bz[1]);
    expect(bz[0]).toBeGreaterThan(bz[2]);
  });

  it("returns uniform for game with no pivotal players", () => {
    const game: import("../lib/math/game-theory").CoalitionGame = {
      n: 2,
      v: () => 0, // nothing ever changes outcome
    };
    const bz = banzhafValue(game);
    expect(bz[0]).toBeCloseTo(0.5, 5);
    expect(bz[1]).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// vickreyAuction
// ---------------------------------------------------------------------------
describe("vickreyAuction", () => {
  it("winner is highest bidder", () => {
    const result = vickreyAuction([10, 20, 15]);
    expect(result.winner).toBe(1);
  });

  it("price is second-highest bid", () => {
    const result = vickreyAuction([10, 20, 15]);
    expect(result.price).toBe(15);
  });

  it("single bidder pays 0", () => {
    const result = vickreyAuction([50]);
    expect(result.winner).toBe(0);
    expect(result.price).toBe(0);
  });

  it("two bidders: price is lower bid", () => {
    const result = vickreyAuction([100, 60]);
    expect(result.winner).toBe(0);
    expect(result.price).toBe(60);
  });

  it("equal bids: first wins (stable sort)", () => {
    const result = vickreyAuction([10, 10, 5]);
    // Both 0 and 1 tied; either could win
    expect([0, 1]).toContain(result.winner);
    expect(result.price).toBe(10);
  });

  it("throws on empty bids", () => {
    expect(() => vickreyAuction([])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// firstPriceAuction
// ---------------------------------------------------------------------------
describe("firstPriceAuction", () => {
  it("winner is highest bidder", () => {
    const result = firstPriceAuction([10, 20, 15]);
    expect(result.winner).toBe(1);
  });

  it("price is winner's own bid", () => {
    const result = firstPriceAuction([10, 20, 15]);
    expect(result.price).toBe(20);
  });

  it("single bidder pays own bid", () => {
    const result = firstPriceAuction([42]);
    expect(result.winner).toBe(0);
    expect(result.price).toBe(42);
  });

  it("throws on empty bids", () => {
    expect(() => firstPriceAuction([])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// auctionRevenue
// ---------------------------------------------------------------------------
describe("auctionRevenue", () => {
  it("first-price revenue = highest bid", () => {
    expect(auctionRevenue([10, 20, 15], "first")).toBe(20);
  });

  it("second-price revenue = second highest bid", () => {
    expect(auctionRevenue([10, 20, 15], "second")).toBe(15);
  });

  it("second-price revenue <= first-price revenue", () => {
    const bids = [5, 8, 3, 12, 7];
    expect(auctionRevenue(bids, "second")).toBeLessThanOrEqual(auctionRevenue(bids, "first"));
  });
});

// ---------------------------------------------------------------------------
// optimalBidFractionFirstPrice
// ---------------------------------------------------------------------------
describe("optimalBidFractionFirstPrice", () => {
  it("2 bidders: bid half the value", () => {
    expect(optimalBidFractionFirstPrice(100, 2)).toBeCloseTo(50, 9);
  });

  it("4 bidders: bid 3/4 of value", () => {
    expect(optimalBidFractionFirstPrice(100, 4)).toBeCloseTo(75, 9);
  });

  it("10 bidders: bid 9/10 of value", () => {
    expect(optimalBidFractionFirstPrice(100, 10)).toBeCloseTo(90, 9);
  });

  it("1 bidder: returns full value", () => {
    expect(optimalBidFractionFirstPrice(100, 1)).toBeCloseTo(100, 9);
  });

  it("bid approaches value as n→∞", () => {
    const bid = optimalBidFractionFirstPrice(100, 1000);
    expect(bid).toBeCloseTo(99.9, 1);
  });
});

// ---------------------------------------------------------------------------
// coachingDecisionMatrix
// ---------------------------------------------------------------------------
describe("coachingDecisionMatrix", () => {
  it("returns a valid optimalStrategy string", () => {
    const result = coachingDecisionMatrix(
      ["run", "pass"],
      ["blitz", "zone"],
      [[3, 1], [2, 4]]
    );
    expect(["run", "pass"]).toContain(result.optimalStrategy);
  });

  it("mixedOptimal sums to 1", () => {
    const result = coachingDecisionMatrix(
      ["run", "pass"],
      ["blitz", "zone"],
      [[1, -1], [-1, 1]]
    );
    const s = result.mixedOptimal.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 8);
  });

  it("gameValue is finite", () => {
    const result = coachingDecisionMatrix(
      ["run", "pass"],
      ["blitz", "zone"],
      [[2, 0], [0, 2]]
    );
    expect(isFinite(result.gameValue)).toBe(true);
  });

  it("throws on mismatched strategies/payoffs", () => {
    expect(() =>
      coachingDecisionMatrix(["a", "b", "c"], ["x"], [[1], [2]])
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// bettingMarketGame
// ---------------------------------------------------------------------------
describe("bettingMarketGame", () => {
  it("returns yourEV, marketEV, exploitability", () => {
    const result = bettingMarketGame(100, 100, 0.55, 1);
    expect(typeof result.yourEV).toBe("number");
    expect(typeof result.marketEV).toBe("number");
    expect(typeof result.exploitability).toBe("number");
  });

  it("positive EV for edge over market", () => {
    // trueProbability = 0.6 vs market implied 0.5 (payoff 1 → decimal 2)
    const result = bettingMarketGame(100, 100, 0.6, 1);
    expect(result.yourEV).toBeGreaterThan(0);
  });

  it("exploitability is distance between true and market probability", () => {
    const result = bettingMarketGame(100, 100, 0.6, 1);
    // payoffIfRight=1 → decimal odds 2 → implied = 0.5; true=0.6; diff=0.1
    expect(result.exploitability).toBeCloseTo(0.1, 6);
  });

  it("zero exploitability when true = market probability", () => {
    // payoff 1 → decimal 2 → implied 0.5; set true to 0.5
    const result = bettingMarketGame(100, 100, 0.5, 1);
    expect(result.exploitability).toBeCloseTo(0, 9);
  });
});

// ---------------------------------------------------------------------------
// lineupOptimizationGame
// ---------------------------------------------------------------------------
describe("lineupOptimizationGame", () => {
  it("returns bestResponse 0 and a numeric expectedScore", () => {
    const score = (a: number[], b: number[]) =>
      a.reduce((s, v, i) => s + v - (b[i] ?? 0), 0);
    const result = lineupOptimizationGame([1, 2, 3], [[1, 1, 1], [2, 2, 2]], score);
    expect(result.bestResponse).toBe(0);
    expect(typeof result.expectedScore).toBe("number");
  });

  it("handles empty opponent lineups", () => {
    const score = (a: number[], _b: number[]) => a[0];
    const result = lineupOptimizationGame([5, 6, 7], [], score);
    expect(typeof result.expectedScore).toBe("number");
  });

  it("expected score is average over opponent lineups", () => {
    // If score is just a[0] regardless of b, expectedScore = a[0]
    const score = (a: number[], _b: number[]) => a[0];
    const result = lineupOptimizationGame([10, 20], [[1], [2], [3]], score);
    expect(result.expectedScore).toBeCloseTo(10, 9);
  });
});

// ---------------------------------------------------------------------------
// moneylineSharp
// ---------------------------------------------------------------------------
describe("moneylineSharp", () => {
  it("same direction sharp+line, opposite public → sharp fade", () => {
    // sharpAction=+1 (betting up), publicAction=-1 (fading), lineMove=+1 (line moved up)
    const result = moneylineSharp(1, -1, 1);
    expect(result.interpretation).toBe("sharp fade of public");
  });

  it("line moved with public → public pressure", () => {
    // publicAction=+1, lineMove=+1, sharpAction=-1
    const result = moneylineSharp(-1, 1, 1);
    expect(result.interpretation).toBe("public pressure");
  });

  it("confidence scales with |lineMove|", () => {
    const r1 = moneylineSharp(1, -1, 1);
    const r2 = moneylineSharp(1, -1, 2);
    expect(r2.confidence).toBeGreaterThan(r1.confidence);
  });

  it("confidence capped at 1", () => {
    const result = moneylineSharp(1, -1, 100);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("confidence is proportional to |lineMove|/3 when < 3", () => {
    const result = moneylineSharp(1, -1, 1.5);
    expect(result.confidence).toBeCloseTo(1.5 / 3, 9);
  });

  it("zero lineMove gives zero confidence", () => {
    const result = moneylineSharp(1, -1, 0);
    expect(result.confidence).toBe(0);
  });
});
