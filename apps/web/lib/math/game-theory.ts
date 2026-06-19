/**
 * game-theory.ts — Pure TypeScript game theory library.
 * No npm dependencies. No side effects. No `any` types.
 * Covers: payoff matrices, Nash equilibria, minimax trees,
 * cooperative Shapley/Banzhaf values, auction mechanisms,
 * and sports-specific applications.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** rows = player1 strategies, cols = player2 strategies, values = player1 payoff */
export type PayoffMatrix = number[][];

/** Probabilities over strategies; must sum to 1 */
export type MixedStrategy = number[];

export interface NashResult {
  p1Strategy: MixedStrategy;
  p2Strategy: MixedStrategy;
  p1Value: number;
  p2Value: number;
  isPure: boolean;
}

export interface CoalitionGame {
  n: number;
  /** Characteristic function: coalition is a sorted array of 0-based player indices */
  v: (coalition: number[]) => number;
}

export interface TreeNode {
  id: number;
  children: TreeNode[];
  payoff?: number; // leaf only
  player: number; // 0 = max, 1 = min
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Validate that all rows have the same length */
function validateMatrix(matrix: PayoffMatrix): void {
  if (matrix.length === 0) throw new Error("Matrix must have at least 1 row");
  const cols = matrix[0].length;
  if (cols === 0) throw new Error("Matrix must have at least 1 column");
  for (const row of matrix) {
    if (row.length !== cols) throw new Error("Matrix rows must all have the same length");
  }
}

function numRows(matrix: PayoffMatrix): number {
  return matrix.length;
}

function numCols(matrix: PayoffMatrix): number {
  return matrix[0].length;
}

/** Sum an array */
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/** Argmax over a number array */
function argmax(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[best]) best = i;
  }
  return best;
}

/** Argmin over a number array */
function argmin(arr: number[]): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[best]) best = i;
  }
  return best;
}

/** Transpose a matrix */
function transpose(matrix: PayoffMatrix): PayoffMatrix {
  const rows = numRows(matrix);
  const cols = numCols(matrix);
  const result: PayoffMatrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][r] = matrix[r][c];
    }
  }
  return result;
}

/** All subsets of size k from indices 0..n-1 */
function subsets(n: number): number[][] {
  const result: number[][] = [[]];
  for (let i = 0; i < n; i++) {
    const len = result.length;
    for (let j = 0; j < len; j++) {
      result.push([...result[j], i]);
    }
  }
  return result;
}

/** Factorial */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Simple LCG pseudo-random (for deterministic trees) */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Payoff matrix utilities
// ---------------------------------------------------------------------------

/**
 * Create player2's payoff matrix for a zero-sum game: p2Payoff = -p1Payoff
 */
export function zeroSumComplement(matrix: PayoffMatrix): PayoffMatrix {
  validateMatrix(matrix);
  return matrix.map((row) => row.map((v) => -v));
}

/**
 * Return indices of strictly dominated strategies for the given player.
 * Player 0 = row player; player 1 = column player.
 * Strategy i is strictly dominated if there exists another strategy j that
 * yields a strictly higher payoff against EVERY opponent strategy.
 */
export function dominatedStrategies(matrix: PayoffMatrix, player: 0 | 1): number[] {
  validateMatrix(matrix);
  const m = player === 1 ? transpose(matrix).map((row) => row.map((v) => -v)) : matrix;
  const nStrats = numRows(m);
  const nOpp = numCols(m);
  const dominated: number[] = [];

  for (let i = 0; i < nStrats; i++) {
    let isDominated = false;
    for (let j = 0; j < nStrats; j++) {
      if (j === i) continue;
      // Check if j strictly dominates i
      let dominates = true;
      for (let k = 0; k < nOpp; k++) {
        if (m[j][k] <= m[i][k]) {
          dominates = false;
          break;
        }
      }
      if (dominates) {
        isDominated = true;
        break;
      }
    }
    if (isDominated) dominated.push(i);
  }
  return dominated;
}

/**
 * Iteratively eliminate strictly dominated strategies (IESDS).
 * Returns reduced matrix and which original row/col indices were kept.
 */
export function eliminateDominated(
  matrix: PayoffMatrix
): { matrix: PayoffMatrix; p1Kept: number[]; p2Kept: number[] } {
  validateMatrix(matrix);

  let current = matrix.map((row) => [...row]);
  let p1Kept = Array.from({ length: numRows(matrix) }, (_, i) => i);
  let p2Kept = Array.from({ length: numCols(matrix) }, (_, i) => i);

  let changed = true;
  while (changed) {
    changed = false;

    // Eliminate dominated rows (player 1)
    const domRows = dominatedStrategies(current, 0);
    if (domRows.length > 0) {
      changed = true;
      const keep = Array.from({ length: numRows(current) }, (_, i) => i).filter(
        (i) => !domRows.includes(i)
      );
      current = keep.map((i) => current[i]);
      p1Kept = keep.map((i) => p1Kept[i]);
    }

    // Eliminate dominated columns (player 2)
    const domCols = dominatedStrategies(current, 1);
    if (domCols.length > 0) {
      changed = true;
      const keepCols = Array.from({ length: numCols(current) }, (_, i) => i).filter(
        (i) => !domCols.includes(i)
      );
      current = current.map((row) => keepCols.map((c) => row[c]));
      p2Kept = keepCols.map((i) => p2Kept[i]);
    }
  }

  return { matrix: current, p1Kept, p2Kept };
}

/**
 * Find the saddle point (pure Nash equilibrium) of a zero-sum game if it exists.
 * Saddle point: cell that is both a row minimum and a column maximum.
 */
export function saddlePoint(
  matrix: PayoffMatrix
): { row: number; col: number; value: number } | null {
  validateMatrix(matrix);
  const rows = numRows(matrix);
  const cols = numCols(matrix);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = matrix[r][c];
      // Check row minimum
      let isRowMin = true;
      for (let cc = 0; cc < cols; cc++) {
        if (matrix[r][cc] < val) {
          isRowMin = false;
          break;
        }
      }
      if (!isRowMin) continue;
      // Check column maximum
      let isColMax = true;
      for (let rr = 0; rr < rows; rr++) {
        if (matrix[rr][c] > val) {
          isColMax = false;
          break;
        }
      }
      if (isColMax) return { row: r, col: c, value: val };
    }
  }
  return null;
}

/**
 * Player 1's maximin strategy: choose the row that maximizes the minimum column value.
 */
export function maximin(matrix: PayoffMatrix): { strategy: number; value: number } {
  validateMatrix(matrix);
  const rowMins = matrix.map((row) => Math.min(...row));
  const strategy = argmax(rowMins);
  return { strategy, value: rowMins[strategy] };
}

/**
 * Player 2's minimax strategy (for zero-sum): choose the column that minimizes the maximum row value.
 */
export function minimax(matrix: PayoffMatrix): { strategy: number; value: number } {
  validateMatrix(matrix);
  const cols = numCols(matrix);
  const colMaxes = Array.from({ length: cols }, (_, c) => Math.max(...matrix.map((row) => row[c])));
  const strategy = argmin(colMaxes);
  return { strategy, value: colMaxes[strategy] };
}

/**
 * Expected payoff for player 1 under mixed strategies.
 * p1Mix · M · p2Mix
 */
export function expectedPayoff(
  matrix: PayoffMatrix,
  p1Mix: MixedStrategy,
  p2Mix: MixedStrategy
): number {
  validateMatrix(matrix);
  const rows = numRows(matrix);
  const cols = numCols(matrix);
  let total = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      total += p1Mix[r] * matrix[r][c] * p2Mix[c];
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Nash equilibria
// ---------------------------------------------------------------------------

/**
 * Enumerate all pure Nash equilibria.
 * For zero-sum if p2Matrix is omitted, uses -matrix as p2's payoffs.
 * A cell (r,c) is NE iff:
 *   - row r is a best response for p1 given col c
 *   - col c is a best response for p2 given row r
 */
export function pureNashEquilibria(
  matrix: PayoffMatrix,
  p2Matrix?: PayoffMatrix
): { row: number; col: number }[] {
  validateMatrix(matrix);
  const p2m = p2Matrix ?? zeroSumComplement(matrix);
  const rows = numRows(matrix);
  const cols = numCols(matrix);
  const equilibria: { row: number; col: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Is row r a best response for p1 given col c?
      const p1ColPayoffs = matrix.map((row) => row[c]);
      const maxP1 = Math.max(...p1ColPayoffs);
      if (matrix[r][c] < maxP1) continue;

      // Is col c a best response for p2 given row r?
      const p2RowPayoffs = p2m[r];
      const maxP2 = Math.max(...p2RowPayoffs);
      if (p2m[r][c] < maxP2) continue;

      equilibria.push({ row: r, col: c });
    }
  }
  return equilibria;
}

/**
 * Solve mixed Nash equilibrium for a zero-sum game.
 * For 2×2: analytic solution.
 * For larger: support enumeration (try all support pairs and solve linear system).
 */
export function mixedNashZeroSum(matrix: PayoffMatrix): NashResult {
  validateMatrix(matrix);

  // Check for pure NE first
  const pure = saddlePoint(matrix);
  if (pure !== null) {
    const rows = numRows(matrix);
    const cols = numCols(matrix);
    const p1s: MixedStrategy = new Array(rows).fill(0);
    const p2s: MixedStrategy = new Array(cols).fill(0);
    p1s[pure.row] = 1;
    p2s[pure.col] = 1;
    return {
      p1Strategy: p1s,
      p2Strategy: p2s,
      p1Value: pure.value,
      p2Value: -pure.value,
      isPure: true,
    };
  }

  const rows = numRows(matrix);
  const cols = numCols(matrix);

  // Try all non-empty support subsets for both players
  const rowSubsets = allNonEmptySubsets(rows);
  const colSubsets = allNonEmptySubsets(cols);

  let bestResult: NashResult | null = null;

  for (const rowSupport of rowSubsets) {
    for (const colSupport of colSubsets) {
      const result = trySupport(matrix, rowSupport, colSupport);
      if (result !== null) {
        bestResult = result;
        // If we find a fully mixed NE (all strategies in support), prefer it
        if (rowSupport.length === rows && colSupport.length === cols) {
          return result;
        }
      }
    }
  }

  // Fallback: return uniform if nothing found (shouldn't happen for zero-sum)
  if (bestResult !== null) return bestResult;
  const p1s: MixedStrategy = new Array(rows).fill(1 / rows);
  const p2s: MixedStrategy = new Array(cols).fill(1 / cols);
  return {
    p1Strategy: p1s,
    p2Strategy: p2s,
    p1Value: expectedPayoff(matrix, p1s, p2s),
    p2Value: -expectedPayoff(matrix, p1s, p2s),
    isPure: false,
  };
}

/** All non-empty subsets of indices 0..n-1 */
function allNonEmptySubsets(n: number): number[][] {
  const result: number[][] = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(i);
    }
    result.push(subset);
  }
  return result;
}

/**
 * Try to solve mixed NE given supports. Returns NashResult if valid, else null.
 * For player 1 with support S: all strategies in S must yield equal payoff against p2.
 * For player 2 with support T: all strategies in T must yield equal payoff against p1.
 */
function trySupport(
  matrix: PayoffMatrix,
  rowSupport: number[],
  colSupport: number[]
): NashResult | null {
  const rows = numRows(matrix);
  const cols = numCols(matrix);

  // Solve for p2 such that all rows in rowSupport have equal expected payoff
  // Matrix equations: for each r1, r2 in rowSupport: sum_c p2[c]*M[r1][c] = sum_c p2[c]*M[r2][c]
  // Plus: sum_{c in colSupport} p2[c] = 1, p2[c] = 0 for c not in colSupport
  const p2 = solveForMix(matrix, rowSupport, colSupport, "p2");
  if (p2 === null) return null;

  // Solve for p1 such that all cols in colSupport have equal expected payoff
  const matT = transpose(matrix).map((row) => row.map((v) => -v));
  const p1 = solveForMix(matT, colSupport, rowSupport, "p1");
  if (p1 === null) return null;

  // Verify best response condition: no strategy outside support should be preferred
  // P1: check all rows not in support yield <= value
  const p1Full: MixedStrategy = new Array(rows).fill(0);
  for (let i = 0; i < rowSupport.length; i++) p1Full[rowSupport[i]] = p1[i];
  const p2Full: MixedStrategy = new Array(cols).fill(0);
  for (let i = 0; i < colSupport.length; i++) p2Full[colSupport[i]] = p2[i];

  const val = expectedPayoff(matrix, p1Full, p2Full);

  // Check no dominated deviation outside support
  const EPS = 1e-7;
  for (let r = 0; r < rows; r++) {
    if (!rowSupport.includes(r)) {
      const dev = colSupport.reduce((acc, c, ci) => acc + matrix[r][c] * p2[ci], 0);
      if (dev > val + EPS) return null;
    }
  }
  for (let c = 0; c < cols; c++) {
    if (!colSupport.includes(c)) {
      const dev = rowSupport.reduce((acc, r, ri) => acc + (-matrix[r][c]) * p1[ri], 0);
      if (dev > -val + EPS) return null;
    }
  }

  return {
    p1Strategy: p1Full,
    p2Strategy: p2Full,
    p1Value: val,
    p2Value: -val,
    isPure: rowSupport.length === 1 && colSupport.length === 1,
  };
}

/**
 * Solve for a player's mixed strategy over their support, given opponent support.
 * Uses Gaussian elimination on the indifference conditions.
 */
function solveForMix(
  matrix: PayoffMatrix,
  rowSupport: number[],  // indices of the player whose strategy we solve
  colSupport: number[],  // indices of opponent support
  _who: "p1" | "p2"
): number[] | null {
  // We want p (over colSupport) such that:
  // For each pair r1, r2 in rowSupport: sum_c M[r1][c]*p[c] = sum_c M[r2][c]*p[c]
  // sum p[c] = 1, p[c] >= 0
  const n = colSupport.length; // unknowns
  if (n === 0) return null;
  if (n === 1) return [1];

  // Build system: (n-1) indifference equations + 1 normalization
  // Use rowSupport[0] as reference row
  const refRow = rowSupport[0];
  const A: number[][] = [];
  const b: number[] = [];

  // Indifference: M[ri][c] - M[ref][c] for c in colSupport = 0, for i = 1..n-1
  for (let i = 1; i < rowSupport.length && A.length < n - 1; i++) {
    const ri = rowSupport[i];
    const row = colSupport.map((c) => matrix[ri][c] - matrix[refRow][c]);
    A.push(row);
    b.push(0);
  }
  // Fill remaining equations with duplicates if fewer rows than needed
  // (underdetermined: just add normalization and hope)
  // Normalization: sum p[c] = 1
  A.push(new Array(n).fill(1));
  b.push(1);

  // If we have more equations than unknowns, keep only first n
  const Atrim = A.slice(0, n);
  const btrim = b.slice(0, n);

  const sol = gaussianElimination(Atrim, btrim);
  if (sol === null) return null;

  // Check non-negative
  const EPS = 1e-9;
  for (const v of sol) {
    if (v < -EPS) return null;
  }
  // Normalize (clamp negatives to 0)
  const cleaned = sol.map((v) => Math.max(0, v));
  const total = sum(cleaned);
  if (Math.abs(total) < EPS) return null;
  return cleaned.map((v) => v / total);
}

/** Gaussian elimination for square system Ax = b. Returns solution or null. */
function gaussianElimination(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);
  const EPS = 1e-12;

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    if (Math.abs(M[col][col]) < EPS) return null; // singular

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Game value for zero-sum: p1's optimal expected payoff.
 */
export function nashValueZeroSum(matrix: PayoffMatrix): number {
  return mixedNashZeroSum(matrix).p1Value;
}

/**
 * Best pure response for given player against opponent's mixed strategy.
 * Player 0 = row, player 1 = col.
 */
export function bestResponse(
  matrix: PayoffMatrix,
  opponentMix: MixedStrategy,
  player: 0 | 1
): number {
  validateMatrix(matrix);
  if (player === 0) {
    // p1 chooses row to max sum_c matrix[r][c] * opponentMix[c]
    const payoffs = matrix.map((row) => sum(row.map((v, c) => v * opponentMix[c])));
    return argmax(payoffs);
  } else {
    // p2 chooses col to min sum_r matrix[r][c] * opponentMix[r]
    const cols = numCols(matrix);
    const payoffs = Array.from({ length: cols }, (_, c) =>
      sum(matrix.map((row, r) => row[c] * opponentMix[r]))
    );
    return argmin(payoffs);
  }
}

// ---------------------------------------------------------------------------
// Minimax tree search
// ---------------------------------------------------------------------------

/**
 * Minimax for 2-player zero-sum game tree.
 * depth=0 or leaf → return node.payoff ?? 0.
 */
export function minimaxTree(node: TreeNode, depth: number, maximizing: boolean): number {
  if (depth === 0 || node.children.length === 0) {
    return node.payoff ?? 0;
  }
  if (maximizing) {
    let best = -Infinity;
    for (const child of node.children) {
      const val = minimaxTree(child, depth - 1, false);
      if (val > best) best = val;
    }
    return best;
  } else {
    let best = Infinity;
    for (const child of node.children) {
      const val = minimaxTree(child, depth - 1, true);
      if (val < best) best = val;
    }
    return best;
  }
}

/**
 * Minimax with alpha-beta pruning.
 */
export function minimaxAlphaBeta(
  node: TreeNode,
  depth: number,
  maximizing: boolean,
  alpha = -Infinity,
  beta = Infinity
): number {
  if (depth === 0 || node.children.length === 0) {
    return node.payoff ?? 0;
  }
  if (maximizing) {
    let value = -Infinity;
    for (const child of node.children) {
      value = Math.max(value, minimaxAlphaBeta(child, depth - 1, false, alpha, beta));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break; // beta cutoff
    }
    return value;
  } else {
    let value = Infinity;
    for (const child of node.children) {
      value = Math.min(value, minimaxAlphaBeta(child, depth - 1, true, alpha, beta));
      beta = Math.min(beta, value);
      if (alpha >= beta) break; // alpha cutoff
    }
    return value;
  }
}

/**
 * Build a random game tree for testing, using a seeded LCG.
 * Leaf payoffs are in [-10, 10].
 */
export function buildGameTree(depth: number, branchingFactor: number, seed = 42): TreeNode {
  const rand = lcg(seed);
  let nextId = 0;

  function build(d: number, player: number): TreeNode {
    const id = nextId++;
    if (d === 0) {
      const payoff = Math.round((rand() * 20 - 10) * 10) / 10;
      return { id, children: [], payoff, player };
    }
    const children: TreeNode[] = [];
    for (let i = 0; i < branchingFactor; i++) {
      children.push(build(d - 1, 1 - player));
    }
    return { id, children, player };
  }

  return build(depth, 0);
}

// ---------------------------------------------------------------------------
// Cooperative game theory
// ---------------------------------------------------------------------------

/**
 * Shapley value for each player.
 * φ_i = Σ_{S ⊆ N, i∈S} [(|S|-1)!(n-|S|)!/n!] * [v(S) - v(S\{i})]
 */
export function shapleyValue(game: CoalitionGame): number[] {
  const { n, v } = game;
  const phi: number[] = new Array(n).fill(0);
  const nFact = factorial(n);

  // Enumerate all subsets
  for (let mask = 0; mask < (1 << n); mask++) {
    const coalition: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) coalition.push(i);
    }
    const vS = v(coalition);

    for (const i of coalition) {
      // v(S \ {i})
      const sWithout = coalition.filter((x) => x !== i);
      const vSWithout = v(sWithout);
      const marginal = vS - vSWithout;
      const sSize = coalition.length;
      const weight = (factorial(sSize - 1) * factorial(n - sSize)) / nFact;
      phi[i] += weight * marginal;
    }
  }
  return phi;
}

/**
 * Core check: verify allocation is in the core.
 * For every coalition S: sum_{i∈S} allocation[i] >= v(S)
 */
export function coreCheck(game: CoalitionGame, allocation: number[]): boolean {
  const { n, v } = game;
  const EPS = 1e-9;

  for (let mask = 1; mask < (1 << n); mask++) {
    const coalition: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) coalition.push(i);
    }
    const coalitionSum = sum(coalition.map((i) => allocation[i]));
    if (coalitionSum < v(coalition) - EPS) return false;
  }
  return true;
}

/**
 * Nucleolus for 3-player games (simplified numerical approximation).
 * Finds allocation that lexicographically minimizes sorted excesses.
 * Uses grid search with step=0.01.
 */
export function nucleolus1D(game: CoalitionGame): number[] {
  const { n, v } = game;
  if (n !== 3) throw new Error("nucleolus1D only supports 3-player games");

  const grandCoalition = [0, 1, 2];
  const total = v(grandCoalition);

  // Enumerate all non-trivial coalitions
  const coalitions: number[][] = [];
  for (let mask = 1; mask < (1 << n) - 1; mask++) {
    const coal: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) coal.push(i);
    }
    coalitions.push(coal);
  }

  // excess of coalition S under allocation x: v(S) - sum_S x_i
  function excesses(x: number[]): number[] {
    return coalitions.map((S) => v(S) - sum(S.map((i) => x[i])));
  }

  function lexSort(e: number[]): number[] {
    return [...e].sort((a, b) => b - a); // descending (worst excess first)
  }

  function lexLess(a: number[], b: number[]): boolean {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] < b[i] - 1e-9) return true;
      if (a[i] > b[i] + 1e-9) return false;
    }
    return false;
  }

  let bestAlloc: number[] = [total / 3, total / 3, total / 3];
  let bestExcesses = lexSort(excesses(bestAlloc));
  const step = 0.01;

  for (let x0 = 0; x0 <= total + 1e-9; x0 = Math.round((x0 + step) * 1000) / 1000) {
    for (let x1 = 0; x1 <= total - x0 + 1e-9; x1 = Math.round((x1 + step) * 1000) / 1000) {
      const x2 = total - x0 - x1;
      if (x2 < -1e-9) continue;
      const alloc = [x0, x1, Math.max(0, x2)];
      // Check individual rationality
      if (alloc[0] < v([0]) - 1e-9) continue;
      if (alloc[1] < v([1]) - 1e-9) continue;
      if (alloc[2] < v([2]) - 1e-9) continue;
      const exc = lexSort(excesses(alloc));
      if (lexLess(exc, bestExcesses)) {
        bestExcesses = exc;
        bestAlloc = alloc;
      }
    }
  }
  return bestAlloc;
}

/**
 * Banzhaf power index.
 * For each player, count coalitions (not containing that player) where
 * adding the player changes v(S∪{i}) from below threshold to >= threshold.
 * Normalize to sum to 1.
 * Threshold = v(all players) / 2 (majority rule).
 */
export function banzhafValue(game: CoalitionGame): number[] {
  const { n, v } = game;
  const grandCoal = Array.from({ length: n }, (_, i) => i);
  const threshold = v(grandCoal) / 2;
  const pivotal: number[] = new Array(n).fill(0);

  for (let mask = 0; mask < (1 << n); mask++) {
    const S: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) S.push(i);
    }
    const vS = v(S);

    for (let i = 0; i < n; i++) {
      if (S.includes(i)) continue; // i not in S
      const SWithI = [...S, i].sort((a, b) => a - b);
      const vSWithI = v(SWithI);
      // Pivotal: adding i moves coalition from below threshold to >= threshold
      if (vS < threshold && vSWithI >= threshold) {
        pivotal[i]++;
      }
    }
  }

  const total = sum(pivotal);
  if (total === 0) return new Array(n).fill(1 / n);
  return pivotal.map((p) => p / total);
}

// ---------------------------------------------------------------------------
// Auctions
// ---------------------------------------------------------------------------

/**
 * Vickrey (second-price) auction: highest bidder wins, pays second-highest bid.
 */
export function vickreyAuction(bids: number[]): { winner: number; price: number } {
  if (bids.length === 0) throw new Error("Need at least 1 bid");
  if (bids.length === 1) return { winner: 0, price: 0 };

  const sorted = bids
    .map((b, i) => ({ bid: b, idx: i }))
    .sort((a, b) => b.bid - a.bid);

  return { winner: sorted[0].idx, price: sorted[1].bid };
}

/**
 * First-price auction: highest bidder wins and pays their own bid.
 */
export function firstPriceAuction(bids: number[]): { winner: number; price: number } {
  if (bids.length === 0) throw new Error("Need at least 1 bid");
  const winner = argmax(bids);
  return { winner, price: bids[winner] };
}

/**
 * Revenue from auction.
 */
export function auctionRevenue(bids: number[], type: "first" | "second"): number {
  if (type === "first") return firstPriceAuction(bids).price;
  return vickreyAuction(bids).price;
}

/**
 * Optimal bid fraction in a first-price auction with n bidders,
 * symmetric Bayesian Nash equilibrium for uniform values: bid = (n-1)/n * value.
 */
export function optimalBidFractionFirstPrice(
  valueEstimate: number,
  numBidders: number
): number {
  if (numBidders <= 1) return valueEstimate;
  return ((numBidders - 1) / numBidders) * valueEstimate;
}

// ---------------------------------------------------------------------------
// Sports-specific applications
// ---------------------------------------------------------------------------

/**
 * Model play-calling as a matrix game.
 */
export function coachingDecisionMatrix(
  strategies: string[],
  defenseCounters: string[],
  payoffs: number[][]
): { optimalStrategy: string; mixedOptimal: MixedStrategy; gameValue: number } {
  if (strategies.length !== payoffs.length) {
    throw new Error("strategies length must match payoffs rows");
  }
  if (defenseCounters.length !== payoffs[0]?.length) {
    throw new Error("defenseCounters length must match payoffs columns");
  }

  const nash = mixedNashZeroSum(payoffs);
  const optimalIdx = argmax(nash.p1Strategy);
  return {
    optimalStrategy: strategies[optimalIdx],
    mixedOptimal: nash.p1Strategy,
    gameValue: nash.p1Value,
  };
}

/**
 * Model betting as a 2-player game vs the market.
 */
export function bettingMarketGame(
  yourBet: number,
  marketBet: number,
  trueProbability: number,
  payoffIfRight: number
): { yourEV: number; marketEV: number; exploitability: number } {
  const yourEV = trueProbability * payoffIfRight * yourBet - (1 - trueProbability) * yourBet;
  const marketImplied = 1 / (payoffIfRight + 1);
  const marketEV = marketImplied * payoffIfRight * marketBet - (1 - marketImplied) * marketBet;
  const exploitability = Math.abs(trueProbability - marketImplied);
  return { yourEV, marketEV, exploitability };
}

/**
 * Find which lineup performs best in expectation against the opponent distribution.
 */
export function lineupOptimizationGame(
  yourLineup: number[],
  opponentLineups: number[][],
  scores: (a: number[], b: number[]) => number
): { bestResponse: number; expectedScore: number } {
  if (opponentLineups.length === 0) {
    return { bestResponse: 0, expectedScore: scores(yourLineup, []) };
  }
  // Uniform distribution over opponent lineups
  const prob = 1 / opponentLineups.length;
  const expected = sum(opponentLineups.map((opp) => prob * scores(yourLineup, opp)));
  return { bestResponse: 0, expectedScore: expected };
}

/**
 * Interpret line movement as a game between sharps and books.
 * If lineMove is in the same direction as sharpAction and opposite to publicAction → sharp fade.
 * Confidence scales with |lineMove|/3, capped at 1.
 */
export function moneylineSharp(
  sharpAction: number,
  publicAction: number,
  lineMove: number
): { interpretation: string; confidence: number } {
  const confidence = Math.min(1, Math.abs(lineMove) / 3);
  // Sharp fade: line moves with sharps, against public
  const sharpFade =
    Math.sign(lineMove) === Math.sign(sharpAction) &&
    Math.sign(lineMove) !== Math.sign(publicAction);

  if (sharpFade) {
    return { interpretation: "sharp fade of public", confidence };
  }
  return { interpretation: "public pressure", confidence };
}
