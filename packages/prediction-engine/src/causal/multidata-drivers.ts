/**
 * Multidata causal feature selection (arXiv 2304.05294v5).
 *
 * M-PC1 over the nflverse team-week panel with target = next-week
 * game outcome margin/cover is a heavy tigramite pipeline; the
 * portable small pieces here: lagged-correlation selection (the
 * baseline the driver set must beat), driver-set stability via Jaccard
 * between odd/even-season ensembles, stratified multidata discovery
 * (union of per-cluster driver sets with cluster-membership
 * interactions), and the gate verdict.
 *
 * ACCEPTANCE GATE: ADOPT iff (a) driver-set model Brier <= all-features
 * Brier using <= 50% of features; (b) validation Brier strictly better
 * than lagged-correlation selection at matched feature count;
 * (c) odd/even driver-set Jaccard >= 0.5; reject if (b) fails or
 * Jaccard < 0.4.
 *
 * Research-only module. Not wired into any live feature path.
 */

/** Jaccard similarity between two driver sets. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * Lagged-correlation baseline: rank features by |Pearson correlation|
 * with the lagged target and keep the top k.
 */
export function laggedCorrelationSelect(
  features: Readonly<Record<string, number[]>>,
  target: readonly number[],
  lag: number,
  k: number,
): string[] {
  const names = Object.keys(features);
  if (names.length === 0) throw new Error("laggedCorrelationSelect: no features");
  if (lag < 1) throw new Error("laggedCorrelationSelect: lag >= 1");
  if (target.length === 0) throw new Error("laggedCorrelationSelect: no target");
  const scored = names.map((name) => {
    const xs = features[name] as number[];
    const pairs: Array<[number, number]> = [];
    for (let t = lag; t < Math.min(xs.length, target.length); t++) {
      pairs.push([xs[t - lag] as number, target[t] as number]);
    }
    return { name, score: Math.abs(pearson(pairs)) };
  });
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, Math.max(0, k)).map((s) => s.name);
}

/**
 * Stratified multidata discovery: union of per-cluster driver sets,
 * plus cluster-membership interaction terms (cluster:feature).
 */
export function stratifiedUnion(
  clusterDrivers: Readonly<Record<string, ReadonlySet<string>>>,
): Set<string> {
  const out = new Set<string>();
  for (const [cluster, drivers] of Object.entries(clusterDrivers)) {
    for (const d of drivers) {
      out.add(d);
      out.add(`${cluster}:${d}`);
    }
  }
  return out;
}

/**
 * Driver-set stability: mean pairwise Jaccard across ensemble runs
 * (odd vs even seasons, bootstrap replicates, ...).
 */
export function driverStability(sets: ReadonlyArray<ReadonlySet<string>>): number {
  if (sets.length < 2) throw new Error("driverStability: need >= 2 sets");
  let sum = 0;
  let n = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      sum += jaccard(sets[i] as ReadonlySet<string>, sets[j] as ReadonlySet<string>);
      n++;
    }
  }
  return sum / n;
}

/** Gate verdict from the three acceptance conditions. */
export function driverVerdict(
  driverBrier: number,
  allFeaturesBrier: number,
  featureFraction: number,
  laggedBrier: number,
  jaccardOddEven: number,
): "adopt" | "reject" | "inconclusive" {
  if (laggedBrier <= driverBrier || jaccardOddEven < 0.4) return "reject";
  if (
    driverBrier <= allFeaturesBrier &&
    featureFraction <= 0.5 &&
    jaccardOddEven >= 0.5
  ) {
    return "adopt";
  }
  return "inconclusive";
}

function pearson(pairs: ReadonlyArray<readonly [number, number]>): number {
  const n = pairs.length;
  if (n < 2) return 0;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxy / Math.sqrt(Math.max(1e-12, sxx * syy));
}
