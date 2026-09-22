/**
 * Players Movements and Team Shooting Performance
 *
 * arXiv:1805.02501 · lane:tracking · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the unsupervised game-phase discovery pipeline: for each NFL game compute pairwise dyad
 * distances among the 22 players per tracking frame, k-means over frames (k=4-10, BD/TD elbow per
 * game), MDS visualization, label frames by derived phase (pre-snap/motion/play/dead-ball) or
 * down-and-distance context, build cluster transition matrices per team, and associate EPA/play
 * with cluster at snap to find high-value alignment configurations. Deliverable: per-team
 * formation-phase fingerprint -- which spacing configurations they live in and the EPA
 * distribution within each. Improvement beyond the paper: replace k-means on raw dyad distances
 * with a Gaussian mixture model on PCA-compressed dyad features plus a hidden Markov model over
 * the cluster sequence (the paper's own transition matrix suggests Markov structure), then test
 * whether HMM-smoothed phases predict EPA better than hard k-means assignments on a holdout game.
 *
 * ACCEPTANCE GATE: ADAPT only if: on >=3 NFL games, at least one discovered cluster shows mean EPA/snap >= 0.15
 * above the game mean on >=30 plays AND the cluster-membership pattern replicates (BD/TD elbow at
 * same k +/-1) across games. Otherwise REJECT the method for NFL.
 *
 * Ingest role: feature builder (run/pass prediction: mixture + HMM + team tendencies + context features).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1805.02501" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT only if: on >=3 NFL games, at least one discovered cluster shows mean EPA/snap >= 0.15
 * above the game mean on >=30 plays AND the cluster-membership pattern replicates (BD/TD elbow at
 * same k +/-1) across games. Otherwise REJECT the method for NFL.`;

export const CONFIG = {
  enabled: false,
  mixtureComponents: 3,
  hiddenStates: 3,
  logLossGainThreshold: 0.003,
  accuracyGate: 0.65,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PlayContext {
  readonly down: number;
  readonly distance: number;
  readonly yardline: number;
  readonly scoreDiff: number;
  readonly secondsLeft: number;
  readonly homePossession: boolean;
}

/** Context feature vector: the paper's pre-snap state s_t. */
export function contextFeatures(c: PlayContext): number[] | null {
  if (
    !isFiniteNumber(c.down) || !isFiniteNumber(c.distance) || !isFiniteNumber(c.yardline) ||
    !isFiniteNumber(c.scoreDiff) || !isFiniteNumber(c.secondsLeft) || typeof c.homePossession !== "boolean"
  ) {
    return null;
  }
  return [
    c.down / 4,
    Math.min(1, c.distance / 20),
    c.yardline / 100,
    Math.max(-1, Math.min(1, c.scoreDiff / 21)),
    c.secondsLeft / 3600,
    c.homePossession ? 1 : 0,
  ];
}

/** Logistic map (sigmoid). */
export function logistic(z: number): number | null {
  if (!isFiniteNumber(z)) return null;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Mixture run-probability: weighted average of component sigmoids over
 * (context features . component weights). Offline fit recipe:
 * EM on nflverse with the team's historical tendency as one component prior.
 */
export function mixtureRunProb(features: readonly number[], components: ReadonlyArray<{ w: number; beta: readonly number[] }>): number | null {
  if (features.length === 0 || components.length === 0) return null;
  let sum = 0;
  let wSum = 0;
  for (const c of components) {
    if (!isFiniteNumber(c.w) || c.w < 0 || c.beta.length !== features.length) return null;
    if (!c.beta.every(isFiniteNumber)) return null;
    const z = c.beta.reduce((a, b, i) => a + b * (features[i] ?? 0), 0);
    const p = logistic(z);
    if (p === null) return null;
    sum += c.w * p;
    wSum += c.w;
  }
  if (wSum === 0) return null;
  return sum / wSum;
}

/** Team tendency feature: historical run rate in this context bucket. */
export function teamTendency(runCounts: number, totalCounts: number, priorRuns = 5, priorTotal = 10): number | null {
  if (![runCounts, totalCounts, priorRuns, priorTotal].every(isFiniteNumber)) return null;
  if (runCounts < 0 || totalCounts < 0 || runCounts > totalCounts || priorTotal <= 0) return null;
  return (runCounts + priorRuns) / (totalCounts + priorTotal);
}

/** Brier score for the run-prob forecasts. */
export function brierScore(probs: readonly number[], actual: ReadonlyArray<0 | 1>): number | null {
  if (probs.length !== actual.length || probs.length === 0) return null;
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (!isFiniteNumber(p ?? NaN) || (p ?? 0) < 0 || (p ?? 0) > 1) return null;
    s += ((p ?? 0) - (actual[i] ?? 0)) ** 2;
  }
  return s / probs.length;
}
