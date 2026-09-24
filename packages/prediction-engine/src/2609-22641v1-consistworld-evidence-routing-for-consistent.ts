/**
 * arXiv:2609.22641v1 — ConsistWorld: Evidence Routing for Consistent Multi-Agent World Models
 *
 * Multi-view play fusion: per-chunk tracks from broadcast/All-22/end-zone with calibrated camera poses; a
 * visibility gate weights which camera's detections update the shared state per field region;
 * pose-conditioned retrieval reconstructs handoffs. Disabled: needs the chunk archive.
 *
 * Improvement: Build a multi-view play-fusion module: per-play video from broadcast, All-22, and end-zone angles with calibrated camera poses; per-chunk player/ball tracks in field coordinates plus camera pose as state chunks; pose-conditioned retrieval over the committed chunk archive; and a visibility gate weighting which camera's detections update the shared state per field region - outputting a single consistent world state per play.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if on held-out 2024 plays: (a) fused cross-view player-position disagreement <= 0.5 yards mean (vs >=0.8 yards for naive averaging), AND (b) retrieval-based handoff reconstruction error <= 1.0 yard, AND (c) ablation shows the visibility gate (not just retrieval) contributes >=15% of the disagreement reduction; reject if geometric retrieval shows no advantage over recency-based retrieval.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** One camera's per-chunk track estimate with pose quality. */
export interface ViewChunk {
  camera: "broadcast" | "all22" | "endzone";
  /** Position estimate in field coordinates [x, y]. */
  pos: [number, number];
  /** Detection confidence. */
  confidence: number;
  /** Visibility of this field region from this camera in [0,1]. */
  visibility: number;
}

/**
 * Visibility-gated fusion: weight = confidence * visibility, normalized.
 * Output is the single consistent fused position.
 */
export function fuseViews(chunks: readonly ViewChunk[]): [number, number] {
  if (chunks.length === 0) throw new Error("fuseViews: no chunks");
  let wx = 0;
  let wy = 0;
  let wsum = 0;
  for (const c of chunks) {
    const wgt = Math.max(0, c.confidence) * Math.max(0, Math.min(1, c.visibility));
    wx += wgt * c.pos[0];
    wy += wgt * c.pos[1];
    wsum += wgt;
  }
  if (wsum <= 0) throw new Error("fuseViews: zero total weight");
  return [wx / wsum, wy / wsum];
}

/** Cross-view disagreement: mean pairwise distance (the (a) gate metric). */
export function crossViewDisagreement(chunks: readonly ViewChunk[]): number {
  if (chunks.length < 2) return 0;
  let s = 0;
  let n = 0;
  for (let i = 0; i < chunks.length; i++) {
    for (let j = i + 1; j < chunks.length; j++) {
      const a = chunks[i]?.pos ?? [0, 0];
      const b = chunks[j]?.pos ?? [0, 0];
      s += Math.hypot(a[0] - b[0], a[1] - b[1]);
      n++;
    }
  }
  return s / Math.max(1, n);
}
