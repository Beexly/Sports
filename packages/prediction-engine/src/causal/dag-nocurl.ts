/**
 * DAG-NoCurl projection via Hodge decomposition (arXiv 2106.07197v1).
 *
 * The paper's two-step procedure: (1) unconstrained optimization
 * (L-BFGS) producing a possibly-cyclic weight matrix W; (2) Hodge
 * projection onto the acyclic (curl-free) subspace, then threshold.
 * This module implements step (2) in the pairwise-comparison form:
 *   - take the skew-symmetric part A = (W - W^T)/2 (net directed flow);
 *   - solve for node potentials p minimizing
 *       sum_{i<j} (A_ij - (p_j - p_i))^2      (least-squares ranking);
 *   - project: keep edge i->j only when it agrees with the potential
 *     order (p_j > p_i), zeroing backward edges;
 *   - threshold small surviving weights.
 * The nonlinear variant (NoCurl + DAG-GNN backbone) and the lag-augmented
 * time-series extension (lag-NoCurl vs DYNOTEARS vs PCMCI+ParCorr) reuse
 * this projection on the contemporaneous block.
 *
 * ACCEPTANCE GATE: ADOPT DAG-NoCurl as the production
 * continuous-optimization solver if: (a) SHD within 10% of NOTEARS on
 * synthetic; (b) >= 10x wall-clock speedup on the 35-indicator panel;
 * (c) a football-equivalent sanity check recovers known edges.
 *
 * Research-only module. Not wired into any live discovery path.
 */

/** Solve a dense symmetric positive-definite system via Gaussian elimination. */
function solveSPD(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col] as number) > Math.abs(M[piv]![col] as number)) piv = r;
    }
    if (Math.abs(M[piv]![col] as number) < 1e-12) {
      throw new Error("solveSPD: singular system");
    }
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const diag = M[col]![col] as number;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (M[r]![col] as number) / diag;
      for (let c = col; c <= n; c++) M[r]![c] = (M[r]![c] as number) - f * (M[col]![c] as number);
    }
  }
  return M.map((row, i) => (row[n] as number) / (row[i] as number));
}

/**
 * Hodge potentials: least-squares node scores p with p_0 = 0 (gauge fix)
 * minimizing sum over active pairs of (flow_ij - (p_j - p_i))^2 for
 * skew-symmetric A. `mask[i][j]` marks pairs with an observed edge
 * (default: all pairs); absent edges are excluded, not treated as zero
 * flow.
 */
export function hodgePotentials(A: number[][], mask?: boolean[][]): number[] {
  const n = A.length;
  if (n === 0) throw new Error("hodgePotentials: empty matrix");
  if (A.some((row) => row.length !== n)) throw new Error("hodgePotentials: not square");
  const active = (i: number, j: number): boolean =>
    mask ? (mask[i] as boolean[])[j] !== false && (mask[j] as boolean[])[i] !== false : true;
  // Normal equations on free variables p_1..p_{n-1} (p_0 fixed at 0).
  const m = n - 1;
  const G: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const rhs: number[] = new Array<number>(m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!active(i, j)) continue;
      const a = ((A[i] as number[])[j] as number) - ((A[j] as number[])[i] as number);
      const flow = a / 2; // skew-symmetric flow i -> j
      // residual: flow - (p_j - p_i); accumulate normal equations
      const di = i === 0 ? -1 : i - 1; // coefficient index of p_i (gauge: p_0 = 0)
      const dj = j === 0 ? -1 : j - 1;
      if (di >= 0) {
        const Gdi = G[di] as number[];
        Gdi[di] = (Gdi[di] as number) + 1;
        rhs[di] = (rhs[di] as number) - flow;
        if (dj >= 0) {
          const Gdj = G[dj] as number[];
          Gdi[dj] = (Gdi[dj] as number) - 1;
          Gdj[di] = (Gdj[di] as number) - 1;
        }
      }
      if (dj >= 0) {
        const Gdj = G[dj] as number[];
        Gdj[dj] = (Gdj[dj] as number) + 1;
        rhs[dj] = (rhs[dj] as number) + flow;
      }
    }
  }
  if (m === 0) return [0];
  const free = solveSPD(G, rhs);
  return [0, ...free];
}

/**
 * NoCurl projection: keep W_ij only when the edge direction agrees with
 * the Hodge potential order (p_j > p_i + tol), then hard-threshold at
 * `threshold`. Returns an acyclic matrix by construction.
 */
export function nocurlProject(W: number[][], threshold = 0.1): number[][] {
  const n = W.length;
  if (n === 0) throw new Error("nocurlProject: empty matrix");
  if (W.some((row) => row.length !== n)) throw new Error("nocurlProject: not square");
  const A = W.map((row, i) =>
    row.map((w, j) => (w - ((W[j] as number[])[i] as number)) / 2),
  );
  const mask = W.map((row, i) =>
    row.map((w, j) => Math.abs(w) + Math.abs((W[j] as number[])[i] as number) > 1e-12),
  );
  const p = hodgePotentials(A, mask);
  return W.map((row, i) =>
    row.map((w, j) => {
      if (i === j) return 0;
      if ((p[j] as number) <= (p[i] as number)) return 0; // backward edge: curl
      return Math.abs(w) >= threshold ? w : 0;
    }),
  );
}

/** True when the directed graph of nonzero entries is acyclic. */
export function isAcyclic(W: number[][]): boolean {
  const n = W.length;
  const color = new Array<number>(n).fill(0); // 0=unvisited 1=in-stack 2=done
  const visit = (v: number): boolean => {
    color[v] = 1;
    for (let w = 0; w < n; w++) {
      if (Math.abs((W[v] as number[])[w] as number) < 1e-12) continue;
      if (color[w] === 1) return false;
      if (color[w] === 0 && !visit(w)) return false;
    }
    color[v] = 2;
    return true;
  };
  for (let v = 0; v < n; v++) if (color[v] === 0 && !visit(v)) return false;
  return true;
}

/** Structural Hamming distance between two adjacency patterns. */
export function shd(A: number[][], B: number[][]): number {
  const n = A.length;
  if (B.length !== n) throw new Error("shd: size mismatch");
  let d = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = Math.abs((A[i] as number[])[j] as number) > 1e-12 ? 1 : 0;
      const b = Math.abs((B[i] as number[])[j] as number) > 1e-12 ? 1 : 0;
      if (a !== b) d++;
    }
  }
  return d;
}
