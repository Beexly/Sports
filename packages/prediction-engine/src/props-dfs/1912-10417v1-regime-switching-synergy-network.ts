/**
 * arXiv 1912.10417v1: Modelling Basketball Players' Performance and Interactions Between Teammates with a Regime Switching Approach
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Per-player 2-state Markov switching on per-drive smoothed fantasy-points-above-expectation to classify hot/cold regimes, then ARIMAX/logistic on regime labels with on-field co-presence dummies (WR2 in route tree, backup RB on 3rd down) producing a signed synergy network; QB<->WR positive edges become DFS stack candidates.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build teammate-synergy detection: per-player 2-state Markov switching on per-drive smoothed fantasy-points-above-expectation to classify hot/cold regimes, then ARIMAX/logistic on regime labels with on-field co-presence dummies (WR2 in route tree, backup RB on 3rd down) producing a signed synergy network -- QB<->WR positive edges become DFS stack candidates.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if Test 1 passes (regimes are real, not k-artifacts) AND Test 2 passes (synergies replicate out-of-sample with >=+1.5 pts/game and p<0.05). REJECT if regimes are degenerate or synergies don't replicate.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Scaled forward algorithm; returns log-likelihood of the observation sequence. */
export function hmmForwardLogLik(
  pi: number[],
  A: number[][],
  logEmit: number[][],
): number {
  const T = logEmit.length;
  const K = pi.length;
  let logLik = 0;
  let alpha = pi.map((p, k) => Math.log(Math.max(1e-300, p)) + logEmit[0]![k]!);
  for (let t = 1; t < T; t++) {
    const next = new Array<number>(K).fill(-Infinity);
    for (let k = 0; k < K; k++) {
      let m = -Infinity;
      for (let j = 0; j < K; j++) {
        const v = alpha[j]! + Math.log(Math.max(1e-300, A[j]![k]!));
        if (v > m) m = v;
      }
      let s = 0;
      for (let j = 0; j < K; j++) s += Math.exp(alpha[j]! + Math.log(Math.max(1e-300, A[j]![k]!)) - m);
      next[k] = m + Math.log(Math.max(1e-300, s)) + logEmit[t]![k]!;
    }
    const mx = Math.max(...next);
    const scale = Math.log(next.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
    logLik += scale;
    alpha = next.map((v) => v - scale);
  }
  const mx = Math.max(...alpha);
  return logLik + Math.log(alpha.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
}

/** Viterbi most-likely state path. */
export function viterbi(pi: number[], A: number[][], logEmit: number[][]): number[] {
  const T = logEmit.length;
  const K = pi.length;
  const delta: number[][] = [];
  const psi: number[][] = [];
  delta.push(pi.map((p, k) => Math.log(Math.max(1e-300, p)) + logEmit[0]![k]!));
  psi.push(new Array<number>(K).fill(0));
  for (let t = 1; t < T; t++) {
    const dRow = new Array<number>(K).fill(-Infinity);
    const pRow = new Array<number>(K).fill(0);
    for (let k = 0; k < K; k++) {
      let best = -Infinity;
      let bj = 0;
      for (let j = 0; j < K; j++) {
        const v = delta[t - 1]![j]! + Math.log(Math.max(1e-300, A[j]![k]!));
        if (v > best) { best = v; bj = j; }
      }
      dRow[k] = best + logEmit[t]![k]!;
      pRow[k] = bj;
    }
    delta.push(dRow);
    psi.push(pRow);
  }
  const path = new Array<number>(T).fill(0);
  path[T - 1] = delta[T - 1]!.indexOf(Math.max(...delta[T - 1]!));
  for (let t = T - 2; t >= 0; t--) path[t] = psi[t + 1]![path[t + 1]!]!;
  return path;
}

/** Stationary distribution of a transition matrix (power iteration). */
export function hmmStationary(A: number[][], iters = 1000): number[] {
  const K = A.length;
  let v = new Array<number>(K).fill(1 / K);
  for (let it = 0; it < iters; it++) {
    const w = new Array<number>(K).fill(0);
    for (let j = 0; j < K; j++) for (let k = 0; k < K; k++) w[k]! += v[j]! * A[j]![k]!;
    v = w;
  }
  return v;
}

/**
 * Hamilton filter for a 2-state Markov-switching Gaussian model.
 * Returns filtered P(state=1 | y_1..y_t).
 */
export function hamiltonFilter(
  ys: number[],
  mu: [number, number],
  sig: [number, number],
  p11: number,
  p22: number,
): number[] {
  const out: number[] = [];
  let f0 = 0.5;
  let f1 = 0.5;
  for (const y of ys) {
    const e0 = gaussDens(y, mu[0], sig[0]);
    const e1 = gaussDens(y, mu[1], sig[1]);
    const p0 = (f0 * p11 + f1 * (1 - p22)) * e0;
    const p1 = (f0 * (1 - p11) + f1 * p22) * e1;
    const s = p0 + p1;
    f0 = p0 / Math.max(1e-300, s);
    f1 = p1 / Math.max(1e-300, s);
    out.push(f1);
  }
  return out;
}

function gaussDens(y: number, mu: number, sig: number): number {
  const z = (y - mu) / Math.max(1e-9, sig);
  return Math.exp(-0.5 * z * z) / (Math.max(1e-9, sig) * 2.5066282746310002);
}

export interface PairSequence {
  pairId: string;
  dropbacksTogether: number;
  jointEpa: number;
}

/** JOI/dropback: joint production per shared dropback for a QB-pass-catcher pair. */
export function joiPerDropback(jointEpa: number, dropbacksTogether: number): number {
  return dropbacksTogether <= 0 ? 0 : jointEpa / dropbacksTogether;
}

/** Signed synergy network edges from co-presence regime regressions. */
export function synergyEdge(
  jointMean: number,
  soloMeanA: number,
  soloMeanB: number,
  se: number,
): { edge: number; z: number } {
  const edge = jointMean - (soloMeanA + soloMeanB) / 2;
  return { edge, z: se > 0 ? edge / se : 0 };
}

/** Rank pairs by predicted JOI for DFS stacking. */
export function rankStackPairs(pairs: PairSequence[]): PairSequence[] {
  return [...pairs].sort(
    (a, b) => joiPerDropback(b.jointEpa, b.dropbacksTogether) - joiPerDropback(a.jointEpa, a.dropbacksTogether),
  );
}
