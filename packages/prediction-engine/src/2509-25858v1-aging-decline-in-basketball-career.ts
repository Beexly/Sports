/**
 * arXiv:2509.25858v1 — Aging Decline in Basketball Career Trend Prediction Based on Machine Learning and LSTM Model
 *
 * Archetype-conditioned aging forecaster: K-means career archetypes (early-peak, late-bloomer, cliff) over
 * efficiency curves; next-season efficiency is the archetype decay path re-anchored at the player's level.
 *
 * Improvement: GSE forecasts veteran aging curves with an archetype-conditioned forecaster: autoencoder + K-means career archetypes (early-peak, late-bloomer, cliff) fed into an LSTM predicting next-season efficiency for prop/DFS projections.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt into the prop/DFS projection pipeline if on the 2023-2024 holdout it beats the last-value baseline on MAE for veterans AND archetype assignments are stable across bootstrap re-clustering (Jaccard >=0.7).
 */

/** Career archetype centroid: efficiency by age. */
export interface Archetype {
  name: string;
  /** Centroid efficiency at ages[0..k]. */
  centroid: number[];
  ages: number[];
}

/** Deterministic K-means over career efficiency vectors (k archetypes). */
export function kmeansArchetypes(
  careers: readonly number[][],
  k: number,
  iters = 50,
): Archetype[] {
  if (careers.length < k || k < 1) throw new Error("kmeansArchetypes: need >= k careers");
  const dim = careers[0]?.length ?? 0;
  let centroids = careers.slice(0, k).map((c) => [...c]);
  let assign: number[] = new Array(careers.length).fill(0);
  for (let it = 0; it < iters; it++) {
    assign = careers.map((c) => {
      let best = 0;
      let bd = Infinity;
      for (let j = 0; j < k; j++) {
        const d = c.reduce((s, v, d2) => s + ((v - (centroids[j]?.[d2] ?? 0)) ** 2), 0);
        if (d < bd) { bd = d; best = j; }
      }
      return best;
    });
    const next = centroids.map(() => new Array<number>(dim).fill(0));
    const cnt = new Array<number>(k).fill(0);
    careers.forEach((c, i) => {
      const j = assign[i] ?? 0;
      cnt[j] = (cnt[j] ?? 0) + 1;
      c.forEach((v, d2) => { next[j]![d2] = (next[j]?.[d2] ?? 0) + v; });
    });
    centroids = next.map((nc, j) => nc.map((v) => v / Math.max(1, cnt[j] ?? 1)));
  }
  return centroids.map((centroid, j) => ({ name: `archetype-${j}`, centroid, ages: centroid.map((_, d2) => d2) }));
}

/**
 * Forecast next-season efficiency: find nearest archetype, take its age-to-age
 * delta, and apply it to the player's current level.
 */
export function forecastNextSeason(
  archetypes: readonly Archetype[],
  efficiencyByAge: readonly number[],
  currentAgeIdx: number,
): number {
  if (archetypes.length === 0) throw new Error("forecastNextSeason: no archetypes");
  const cur = efficiencyByAge[currentAgeIdx] ?? 0;
  let best = archetypes[0]!;
  let bd = Infinity;
  for (const a of archetypes) {
    const d = efficiencyByAge.reduce((s, v, i) => {
      const c = a.centroid[i] ?? 0;
      return i <= currentAgeIdx ? s + (v - c) ** 2 : s;
    }, 0);
    if (d < bd) { bd = d; best = a; }
  }
  const cNow = best.centroid[currentAgeIdx] ?? 0;
  const cNext = best.centroid[currentAgeIdx + 1] ?? cNow;
  return cur + (cNext - cNow);
}

/** Jaccard stability of two cluster assignments (bootstrap re-clustering). */
export function assignmentJaccard(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error("assignmentJaccard: length mismatch");
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const sameA = a[i] === a[j];
      const sameB = b[i] === b[j];
      if (sameA && sameB) inter++;
      if (sameA || sameB) union++;
    }
  }
  return union === 0 ? 1 : inter / union;
}
