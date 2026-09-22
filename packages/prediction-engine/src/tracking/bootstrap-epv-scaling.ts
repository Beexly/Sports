
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cluster-bootstrap SE of the mean (clusters = drives). */
export function bootstrapSe(
  values: readonly number[],
  clusters: readonly number[],
  nBoot = 1000,
  seed = 12345,
): number {
  if (values.length !== clusters.length || values.length === 0) {
    throw new Error("bootstrap-epv-scaling: aligned non-empty inputs required");
  }
  const rng = mulberry32(seed);
  const clusterIds = [...new Set(clusters)];
  const byCluster = clusterIds.map((c) => values.filter((_, i) => clusters[i] === c));
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const bootMeans: number[] = [];
  for (let b = 0; b < nBoot; b++) {
    const sample: number[] = [];
    for (let k = 0; k < clusterIds.length; k++) {
      const pick = byCluster[Math.floor(rng() * byCluster.length)] ?? [];
      sample.push(...pick);
    }
    bootMeans.push(sample.reduce((s, v) => s + v, 0) / Math.max(sample.length, 1));
  }
  const bm = bootMeans.reduce((s, v) => s + v, 0) / bootMeans.length;
  return Math.sqrt(bootMeans.reduce((s, v) => s + (v - bm) ** 2, 0) / Math.max(bootMeans.length - 1, 1));
}

/** Error-scaled decision threshold: require edge >= z * se before acting. */
export function errorScaledThreshold(baseEdge: number, se: number, z = 1.64): number {
  if (!(se >= 0)) throw new Error("bootstrap-epv-scaling: se must be nonnegative");
  return baseEdge + z * se;
}

/** Should we act? Act only when the estimated edge clears the error-scaled bar. */
export function actOnEpv(estimatedEdge: number, se: number, z = 1.64): boolean {
  return estimatedEdge >= errorScaledThreshold(0, se, z);
}
