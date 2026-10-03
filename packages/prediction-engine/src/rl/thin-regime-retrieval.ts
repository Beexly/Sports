/**
 * Retrieval-based CQL for thin-regime weeks (arXiv 2307.02752v2).
 *
 * Offline RL with imbalanced slate-state data: quantify imbalance by
 * histogramming weekly slate states (2021-2024) over regime features
 * (slate size, mean total, weather flags, holiday) and fitting a power
 * law to identify thin regimes (< 30 samples); build D_aux from all
 * historical weeks 2015-2024 (pre-2021 weeks excluded from main
 * training become the auxiliary pool) + bootstrap-perturbed copies of
 * thin-regime weeks (jitter edges/odds within measurement noise);
 * retrieve k=8 nearest neighbors per thin-regime training state
 * (MIPS over a state-encoder embedding); train RB-CQL (CQL loss on
 * main data + retrieved (s,a,r,s') tuples upweighted for thin
 * regimes).
 *
 * The portable core here: regime histogramming, power-law
 * identification of thin regimes, bootstrap perturbation of
 * thin-regime tuples, k-NN retrieval over the auxiliary pool, and the
 * RB-CQL sample-weighting rule.
 *
 * ACCEPTANCE GATE: ADOPT iff on 2024 thin-regime weeks RB-CQL beats
 * plain CQL ROI by >= 3 pp with overall-season ROI no worse than
 * -1 pp vs plain CQL.
 *
 * Research-only module. Not wired into any live RL path.
 */

export interface SlateState {
  /** Regime features: [slate size, mean total, weather flag, holiday]. */
  features: number[];
}

/** Bin a continuous regime feature vector into a regime key. */
export function regimeKey(features: readonly number[], bins: readonly number[]): string {
  if (features.length !== bins.length) throw new Error("regimeKey: features/bins mismatch");
  return features
    .map((x, i) => Math.floor(x / (bins[i] as number)))
    .join(":");
}

/** Histogram slate states into regime counts. */
export function regimeHistogram(
  states: readonly SlateState[],
  bins: readonly number[],
): Map<string, number> {
  const hist = new Map<string, number>();
  for (const s of states) {
    const k = regimeKey(s.features, bins);
    hist.set(k, (hist.get(k) ?? 0) + 1);
  }
  return hist;
}

export interface PowerLawFit {
  /** Exponent alpha of count ~ rank^-alpha. */
  alpha: number;
  /** R^2 of the log-log fit. */
  rSquared: number;
}

/**
 * Fit a power law to the regime-count distribution: log(count) =
 * a - alpha*log(rank). Returns the exponent and fit quality.
 */
export function fitPowerLaw(counts: readonly number[]): PowerLawFit {
  const sorted = [...counts].filter((c) => c > 0).sort((a, b) => b - a);
  if (sorted.length < 3) throw new Error("fitPowerLaw: need >= 3 positive counts");
  const xs = sorted.map((_, i) => Math.log(i + 1));
  const ys = sorted.map((c) => Math.log(c));
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += ((xs[i] as number) - mx) * ((ys[i] as number) - my);
    sxx += ((xs[i] as number) - mx) ** 2;
  }
  const slope = sxy / Math.max(1e-12, sxx);
  const alpha = -slope;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = my + slope * ((xs[i] as number) - mx);
    ssRes += ((ys[i] as number) - pred) ** 2;
    ssTot += ((ys[i] as number) - my) ** 2;
  }
  return { alpha, rSquared: 1 - ssRes / Math.max(1e-12, ssTot) };
}

/** Thin regimes: fewer than minSamples training states. */
export function thinRegimes(
  hist: ReadonlyMap<string, number>,
  minSamples = 30,
): Set<string> {
  const thin = new Set<string>();
  for (const [k, c] of hist) if (c < minSamples) thin.add(k);
  return thin;
}

export interface Transition {
  s: number[]; // state embedding
  a: number; // action
  r: number; // reward
  s2: number[]; // next-state embedding
}

/**
 * Bootstrap-perturbed copies of thin-regime transitions: jitter
 * edges/odds (here: reward and state) within measurement noise.
 */
export function perturbTransitions(
  transitions: readonly Transition[],
  noiseScale: number,
  copies: number,
  rand: () => number,
): Transition[] {
  if (noiseScale < 0) throw new Error("perturbTransitions: noiseScale >= 0");
  const out: Transition[] = [];
  for (const t of transitions) {
    for (let c = 0; c < copies; c++) {
      const j = () => (rand() - 0.5) * 2 * noiseScale;
      out.push({
        s: t.s.map((x) => x + j()),
        a: t.a,
        r: t.r + j(),
        s2: t.s2.map((x) => x + j()),
      });
    }
  }
  return out;
}

function euclidean(a: readonly number[], b: readonly number[]): number {
  return Math.sqrt(a.reduce((s, x, i) => s + (x - (b[i] as number)) ** 2, 0));
}

/**
 * k-NN retrieval (MIPS-flavored Euclidean) of auxiliary transitions
 * for one thin-regime training state.
 */
export function retrieveNeighbors(
  query: readonly number[],
  auxPool: readonly Transition[],
  k = 8,
): Transition[] {
  if (auxPool.length === 0) return [];
  return [...auxPool]
    .map((t) => ({ t, d: euclidean(query, t.s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.max(0, k))
    .map((x) => x.t);
}

export interface WeightedBatch {
  transitions: Transition[];
  /** Per-transition loss weights (retrieved thin-regime tuples upweighted). */
  weights: number[];
}

/**
 * RB-CQL batch: main transitions at weight 1 plus retrieved
 * thin-regime neighbors upweighted by `upweight`.
 */
export function buildRbCqlBatch(
  main: readonly Transition[],
  retrieved: readonly Transition[],
  upweight = 2,
): WeightedBatch {
  if (upweight < 1) throw new Error("buildRbCqlBatch: upweight >= 1");
  return {
    transitions: [...main, ...retrieved],
    weights: [
      ...main.map(() => 1),
      ...retrieved.map(() => upweight),
    ],
  };
}
