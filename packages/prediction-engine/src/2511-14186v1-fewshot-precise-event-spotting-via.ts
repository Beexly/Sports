/**
 * arXiv:2511.14186v1 — Few-Shot Precise Event Spotting via Unified Multi-Entity Graph and Distillation
 *
 * Few-shot broadcast event spotting with a unified multi-entity graph: 22 player skeletons + ball keypoint
 * + field landmarks as nodes, prototype (nearest-centroid) scoring from ~100 labeled clips, with
 * tolerance-F1 and Edit-score evaluation. Disabled: the trained UMEG-Net weights and labeled clip set are
 *
 * Improvement: GSE spots broadcast events (snap, handoff, pass release, catch, tackle, TD, turnover, penalty flag) with a unified multi-entity graph: 22 player skeletons + ball keypoint + field landmarks, trained from ~100 labeled clips.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the UMEG-Net spotter as GSE's broadcast event-spotter only if on held-out NFL games it beats E2E-Spot trained on the same 100 clips by >=3pp F1evt AND achieves Edit score >=50.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Graph summary for the multi-entity input. */
export interface EntityGraph {
  nodes: number; // 22 players + ball + landmarks
  playerPlayerEdges: number;
  playerBallEdges: number;
  playerLandmarkEdges: number;
}

/** Build the unified multi-entity graph topology. */
export function buildEntityGraph(nPlayers: number, nLandmarks: number): EntityGraph {
  if (nPlayers <= 0 || nLandmarks < 0) throw new Error("buildEntityGraph: bad counts");
  return {
    nodes: nPlayers + 1 + nLandmarks,
    playerPlayerEdges: (nPlayers * (nPlayers - 1)) / 2,
    playerBallEdges: nPlayers,
    playerLandmarkEdges: nPlayers * nLandmarks,
  };
}

/** Cosine similarity. */
export function cosineSim(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error("cosineSim: dim mismatch");
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return na === 0 || nb === 0 ? 0 : dot / (na * nb);
}

/**
 * Few-shot prototype scoring: nearest class centroid by cosine similarity.
 * prototypes: class -> centroid embedding.
 */
export function prototypeScore(
  emb: readonly number[],
  prototypes: ReadonlyMap<string, number[]>,
): string {
  if (prototypes.size === 0) throw new Error("prototypeScore: no prototypes");
  let best = "";
  let bestS = -Infinity;
  for (const [cls, c] of prototypes) {
    const s = cosineSim(emb, c);
    if (s > bestS) { bestS = s; best = cls; }
  }
  return best;
}

/**
 * Event F1 with temporal tolerance: a predicted event counts as a hit if a
 * ground-truth event of the same class is within tol frames.
 */
export function f1Event(
  pred: readonly { frame: number; cls: string }[],
  truth: readonly { frame: number; cls: string }[],
  tol: number,
): number {
  if (tol < 0) throw new Error("f1Event: tol >= 0");
  const used = new Set<number>();
  let hits = 0;
  for (const p of pred) {
    const j = truth.findIndex((t, k) => !used.has(k) && t.cls === p.cls && Math.abs(t.frame - p.frame) <= tol);
    if (j >= 0) { used.add(j); hits++; }
  }
  const prec = pred.length === 0 ? 0 : hits / pred.length;
  const rec = truth.length === 0 ? 0 : hits / truth.length;
  return prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
}

/** Edit score: 1 - normalized Levenshtein distance over class sequences. */
export function editScore(a: readonly string[], b: readonly string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = Math.min(
        (dp[i - 1]?.[j] ?? 0) + 1,
        (dp[i]?.[j - 1] ?? 0) + 1,
        (dp[i - 1]?.[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  const dist = dp[m]?.[n] ?? 0;
  return Math.max(0, 1 - dist / Math.max(1, Math.max(m, n)));
}
