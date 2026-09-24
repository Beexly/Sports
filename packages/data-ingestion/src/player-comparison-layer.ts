/**
 * A Scalable Framework for NBA Player and Team Comparisons Using Player Tracking Data
 *
 * arXiv:1511.04351v2 · lane:tracking · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build a GSE player-comparison layer on NFL tracking data adapted from the paper's NBA framework:
 * standardize position-specific per-route/per-carry/per-target efficiency plus
 * alignment/speed/separation/cushion metrics, reduce with PCA/SVD retaining ~70% variance, run SDI
 * nearest-neighbors per position (WR/RB/TE separately) with snap-weighted team aggregation --
 * exposed as a 'similar players' comp API and team-level PC scores as matchup features.
 *
 * ACCEPTANCE GATE: ADOPT the SDI comp system as a GSE feature IF comp-based EPA/target forecasts beat the
 * positional-average baseline by >= 0.03 R^2 on the 2024 holdout AND nearest-neighbor lists show
 * >=50% overlap when refit on 2020-2022 vs 2021-2023 (stability check).
 *
 * Ingest role: feature builder (SDI nearest-neighbor comps + team PC scores).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1511.04351v2" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the SDI comp system as a GSE feature IF comp-based EPA/target forecasts beat the
 * positional-average baseline by >= 0.03 R^2 on the 2024 holdout AND nearest-neighbor lists show
 * >=50% overlap when refit on 2020-2022 vs 2021-2023 (stability check).`;

export const CONFIG = { enabled: false, varianceRetained: 0.7, positions: ["WR", "RB", "TE"] as const } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PlayerVector {
  readonly playerId: string;
  readonly position: string;
  readonly snaps: number;
  readonly features: readonly number[];
}

export function isPlayerVector(x: unknown): x is PlayerVector {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["playerId"] === "string" &&
    typeof o["position"] === "string" &&
    isFiniteNumber(o["snaps"]) &&
    Array.isArray(o["features"]) && (o["features"] as unknown[]).every(isFiniteNumber)
  );
}

/** Z-score standardization per feature column (pooled across the position group). */
export function standardize(matrix: readonly number[][]): number[][] | null {
  if (matrix.length === 0) return null;
  const d = matrix[0]?.length ?? 0;
  if (d === 0 || !matrix.every((r) => r.length === d && r.every(isFiniteNumber))) return null;
  const means: number[] = [];
  const sds: number[] = [];
  for (let j = 0; j < d; j++) {
    const col = matrix.map((r) => r[j] ?? 0);
    const m = col.reduce((a, b) => a + b, 0) / col.length;
    const v = col.reduce((a, b) => a + (b - m) * (b - m), 0) / col.length;
    means.push(m);
    sds.push(Math.sqrt(v) || 1);
  }
  return matrix.map((r) => r.map((v, j) => ((v ?? 0) - (means[j] ?? 0)) / (sds[j] ?? 1)));
}

/** Cosine similarity in [-1, 1]. Null on zero vectors / mismatch. */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) * (a[i] ?? 0);
    nb += (b[i] ?? 0) * (b[i] ?? 0);
  }
  if (na === 0 || nb === 0) return null;
  return dot / Math.sqrt(na * nb);
}

/** SDI nearest neighbors: k most similar same-position players (excludes self). */
export function nearestNeighbors(
  target: PlayerVector,
  pool: readonly PlayerVector[],
  k: number,
): Array<{ playerId: string; similarity: number }> {
  const out: Array<{ playerId: string; similarity: number }> = [];
  if (!isFiniteNumber(k) || k <= 0) return out;
  for (const p of pool) {
    if (p.playerId === target.playerId || p.position !== target.position) continue;
    const s = cosineSimilarity(target.features, p.features);
    if (s !== null) out.push({ playerId: p.playerId, similarity: s });
  }
  out.sort((a, b) => b.similarity - a.similarity);
  return out.slice(0, k);
}

/** Snap-weighted team aggregation of player PC scores. */
export function snapWeightedAggregate(scores: ReadonlyMap<string, number>, snaps: ReadonlyMap<string, number>): number | null {
  let num = 0;
  let den = 0;
  for (const [id, s] of scores) {
    const w = snaps.get(id) ?? 0;
    if (!isFiniteNumber(s) || !isFiniteNumber(w) || w < 0) return null;
    num += s * w;
    den += w;
  }
  if (den === 0) return null;
  return num / den;
}
