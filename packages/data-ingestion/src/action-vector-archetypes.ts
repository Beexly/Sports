/**
 * Analyzing In-Game Movements of Soccer Players at Scale
 *
 * arXiv:1603.05583v1 · lane:tracking · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adapt the paper's soccer in-game movements pipeline to sparse NFL event data for the no-tracking
 * case (college, historical NFL): build per-player 'action vectors' (start/end field zones, time
 * between events, ball-possession flag, play type) from nflverse + charting 2019-2025 for
 * WR/RB/TE, run clustering with mini-batch K-means (K~50), form player profiles as normalized
 * cluster histograms, and use cosine-distance similarity / uniqueness / half-to-half consistency
 * to find role archetypes for draft-prospect and free-agent comp finding, plus archetype labels as
 * target-share/YAC model features.
 *
 * ACCEPTANCE GATE: ADOPT the archetype pipeline as a GSE feature source IF half-to-half profile stability reaches
 * ARI >= 0.5 AND adding archetype-cluster indicators to a target-share regression lifts out-of-
 * sample R^2 by >= 0.02 on the 2024 season.
 *
 * Ingest role: feature builder (unsupervised role archetypes for the no-tracking case).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1603.05583v1" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the archetype pipeline as a GSE feature source IF half-to-half profile stability reaches
 * ARI >= 0.5 AND adding archetype-cluster indicators to a target-share regression lifts out-of-
 * sample R^2 by >= 0.02 on the 2024 season.`;

export const CONFIG = { enabled: false, kMeansK: 50, batchNote: "mini-batch K-means at production scale; Lloyd's here for the offline prototype" } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface ActionVector {
  readonly startZone: number;
  readonly endZone: number;
  readonly secondsBetween: number;
  readonly possession: 0 | 1;
  readonly playType: string;
}

const PLAY_TYPES = ["pass", "rush", "target", "block", "return"] as const;

export function isActionVector(x: unknown): x is ActionVector {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    isFiniteNumber(o["startZone"]) && isFiniteNumber(o["endZone"]) &&
    isFiniteNumber(o["secondsBetween"]) && (o["secondsBetween"] as number) >= 0 &&
    (o["possession"] === 0 || o["possession"] === 1) &&
    typeof o["playType"] === "string"
  );
}

/** Numeric encoding: zones normalized to [0,1], log-gap time, possession, one-hot play type. */
export function actionVectorToNumbers(v: ActionVector): number[] {
  const oneHot = PLAY_TYPES.map((t) => (v.playType === t ? 1 : 0));
  return [v.startZone / 100, v.endZone / 100, Math.log1p(v.secondsBetween), v.possession, ...oneHot];
}

/** Deterministic PRNG (mulberry32) for reproducible clustering. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function l2sq(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return s;
}

/** Lloyd's K-means (offline prototype). Returns cluster assignment per point. */
export function lloydKMeans(points: readonly number[][], k: number, iters = 25, seed = 7): number[] {
  const n = points.length;
  if (n === 0 || !Number.isFinite(k) || k <= 0 || k > n) return [];
  const d = points[0]?.length ?? 0;
  const rng = mulberry32(seed);
  const centroids: number[][] = [];
  const used = new Set<number>();
  while (centroids.length < k) {
    const i = Math.floor(rng() * n);
    if (!used.has(i)) {
      used.add(i);
      centroids.push([...(points[i] ?? [])]);
    }
  }
  let assign = new Array<number>(n).fill(0);
  for (let t = 0; t < iters; t++) {
    const next = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dd = l2sq(points[i] ?? [], centroids[c] ?? []);
        if (dd < bestD) {
          bestD = dd;
          best = c;
        }
      }
      next[i] = best;
    }
    assign = next;
    const sums: number[][] = Array.from({ length: k }, () => new Array<number>(d).fill(0));
    const counts = new Array<number>(k).fill(0);
    for (let i = 0; i < n; i++) {
      const c = assign[i] ?? 0;
      counts[c] = (counts[c] ?? 0) + 1;
      const s = sums[c];
      const p = points[i];
      if (s && p) for (let j = 0; j < d; j++) s[j] = (s[j] ?? 0) + (p[j] ?? 0);
    }
    for (let c = 0; c < k; c++) {
      if ((counts[c] ?? 0) > 0) {
        centroids[c] = (sums[c] ?? []).map((v) => v / (counts[c] ?? 1));
      }
    }
  }
  return assign;
}

/** Normalized cluster histogram = the player profile. */
export function clusterHistogram(assignments: readonly number[], k: number): number[] | null {
  if (!Number.isFinite(k) || k <= 0) return null;
  const h = new Array<number>(k).fill(0);
  for (const a of assignments) {
    if (!Number.isInteger(a) || a < 0 || a >= k) return null;
    h[a] = (h[a] ?? 0) + 1;
  }
  const n = assignments.length;
  if (n === 0) return null;
  return h.map((v) => v / n);
}

/** Cosine similarity between two player profiles. */
export function profileSimilarity(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
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
