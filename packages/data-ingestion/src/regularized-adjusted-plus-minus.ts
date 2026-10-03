/**
 * Plus-Minus Player Ratings for Soccer
 *
 * arXiv:1706.04943v1 · lane:props_dfs · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build NFL regularized adjusted plus-minus from the soccer template: define 'segments' as maximal
 * play sequences with a fixed offensive personnel grouping (nflverse participation), target per
 * play = EPA (or WPA) signed to the offense, fit separate offensive/defensive APM ridge
 * regressions of play EPA on player on/off dummies + game-state controls (down, distance,
 * yardline, score, time) with half-week time decay weights -- output per-player regularized APM
 * (EPA/play above average attributable to presence) for player-prop adjustments (WR APM vs CB APM
 * matchups) and injury-replacement valuation.
 *
 * ACCEPTANCE GATE: ADAPT as a complementary player-valuation input if: (a) year-over-year correlation of player APM
 * >= 0.35, and (b) team APM sums add >=0.001 log-loss over the spread baseline on 2025 holdout.
 *
 * Ingest role: feature builder (NFL APM from fixed-personnel segments).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1706.04943v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT as a complementary player-valuation input if: (a) year-over-year correlation of player APM
 * >= 0.35, and (b) team APM sums add >=0.001 log-loss over the spread baseline on 2025 holdout.`;

export const CONFIG = {
  enabled: false,
  ridgeLambda: 1.0,
  yoyCorrelationGate: 0.35,
  maxDesignCols: 64,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface SegmentPlay {
  readonly playerOn: readonly string[];
  readonly epa: number;
  readonly down: number;
  readonly distance: number;
  readonly yardline: number;
  readonly scoreDiff: number;
  readonly secondsLeft: number;
  readonly weight: number;
}

export function isSegmentPlay(x: unknown): x is SegmentPlay {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const nums = ["epa", "down", "distance", "yardline", "scoreDiff", "secondsLeft", "weight"];
  return (
    Array.isArray(o["playerOn"]) && (o["playerOn"] as unknown[]).every((p) => typeof p === "string") &&
    nums.every((k) => isFiniteNumber(o[k]))
  );
}

/** Game-state control vector (down, distance, yardline, score, time). */
export function controlVector(p: SegmentPlay): number[] {
  return [p.down, p.distance, p.yardline / 100, p.scoreDiff, p.secondsLeft / 3600];
}

/**
 * Ridge regression via normal equations (small systems only; the offline
 * prototype. Production uses the paper's sparse solver).
 * Returns coefficients or null if singular / too large.
 */
export function ridgeSolve(X: readonly number[][], y: readonly number[], lambda: number): number[] | null {
  const n = X.length;
  if (n === 0 || !isFiniteNumber(lambda) || lambda < 0) return null;
  const d = X[0]?.length ?? 0;
  if (d === 0 || d > 64 || !X.every((r) => r.length === d && r.every(isFiniteNumber))) return null;
  if (y.length !== n || !y.every(isFiniteNumber)) return null;
  const XtX: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const Xty = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    const row = X[i] ?? [];
    for (let a = 0; a < d; a++) {
      Xty[a] = (Xty[a] ?? 0) + (row[a] ?? 0) * (y[i] ?? 0);
      for (let b = 0; b < d; b++) {
        const r = XtX[a];
        if (r) r[b] = (r[b] ?? 0) + (row[a] ?? 0) * (row[b] ?? 0);
      }
    }
  }
  for (let a = 0; a < d; a++) {
    const r = XtX[a];
    if (r) r[a] = (r[a] ?? 0) + lambda;
  }
  return gaussianSolve(XtX, Xty);
}

function gaussianSolve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]?.[c] ?? 0) > Math.abs(M[piv]?.[c] ?? 0)) piv = r;
    }
    if (Math.abs(M[piv]?.[c] ?? 0) < 1e-12) return null;
    const tmp = M[c];
    M[c] = M[piv] ?? [];
    M[piv] = tmp ?? [];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const factor = (M[r]?.[c] ?? 0) / (M[c]?.[c] ?? 1);
      for (let k = c; k <= n; k++) {
        const row = M[r];
        const crow = M[c];
        if (row && crow) row[k] = (row[k] ?? 0) - factor * (crow[k] ?? 0);
      }
    }
  }
  const x: number[] = [];
  for (let i = 0; i < n; i++) {
    const d = M[i]?.[i] ?? 0;
    if (d === 0) return null;
    x.push((M[i]?.[n] ?? 0) / d);
  }
  return x;
}

/** Build the APM design matrix: player dummies + game-state controls. */
export function apmDesign(
  plays: readonly SegmentPlay[],
  players: readonly string[],
): { X: number[][]; y: number[]; w: number[] } | null {
  const valid = plays.filter(isSegmentPlay);
  if (valid.length === 0 || players.length === 0) return null;
  const idx = new Map(players.map((p, i) => [p, i]));
  const X: number[][] = [];
  const y: number[] = [];
  const w: number[] = [];
  for (const p of valid) {
    const row = new Array<number>(players.length + 5).fill(0);
    for (const pl of p.playerOn) {
      const i = idx.get(pl);
      if (i !== undefined) row[i] = 1;
    }
    const cv = controlVector(p);
    for (let k = 0; k < 5; k++) row[players.length + k] = cv[k] ?? 0;
    X.push(row);
    y.push(p.epa);
    w.push(p.weight);
  }
  return { X, y, w };
}
