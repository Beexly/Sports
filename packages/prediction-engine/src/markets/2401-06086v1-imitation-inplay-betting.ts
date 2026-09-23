/**
 * arXiv 2401.06086v1: XGBoost Learning of Dynamic Wager Placement for In-Play Betting on an Agent-Based Model of a Sports Betting Exchange
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * As engine-honesty infrastructure, port the learning loop, not the horse-race policy: build a GSE in-play simulator (or use recorded NFL live-odds + win-probability traces) as the synthetic environment; define simple baseline in-play betting policies (always-back-closing-favorite, momentum-chaser, Kelly-on-live-model-edge); record their actions and profits; train XGBoost to imitate the most profitable agents' back/lay decisions from (game-state, live-market-state) features -- then add the online-learning extension (policy updates during live games) and swap the binary back/lay objective for stake sizing (Kelly fraction regression).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * As engine-honesty infrastructure, port the learning loop, not the horse-race policy: build a GSE in-play simulator (or use recorded NFL live-odds + win-probability traces) as the synthetic environment; define simple baseline in-play betting policies (always-back-closing-favorite, momentum-chaser, Kelly-on-live-model-edge); record their actions and profits; train XGBoost to imitate the most profitable agents' back/lay decisions from (game-state, live-market-state) features - then add the online-learning extension (policy updates during live games) and swap the binary back/lay objective for stake sizing (Kelly fraction regression).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the imitation-learning loop for GSE's in-play lane only if the learned policy beats every scripted baseline on 2025 holdout profit with p < 0.05 (Wilcoxon, as in the paper); if it merely matches the best baseline, keep the scripted policies and the recorded live-odds dataset as the asset; reject the 'learner beats teachers' claim as a simulator artifact.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: markets | verdict: ADAPT | doctrine: BASELINE
 */

export const ENABLED = false;

/** Epsilon-greedy arm selection. */
export function epsilonGreedyStep(q: number[], eps: number, rand: () => number): number {
  if (rand() < eps) return Math.floor(rand() * q.length);
  let best = 0;
  for (let i = 1; i < q.length; i++) if (q[i]! > q[best]!) best = i;
  return best;
}

/** UCB1 arm selection. */
export function ucb1Step(counts: number[], means: number[], t: number): number {
  let best = 0;
  let bestV = -Infinity;
  for (let i = 0; i < counts.length; i++) {
    const v = counts[i]! === 0 ? Infinity : means[i]! + Math.sqrt((2 * Math.log(Math.max(1, t))) / counts[i]!);
    if (v > bestV) { bestV = v; best = i; }
  }
  return best;
}

/** Gamma sampler (Marsaglia-Tsang) for Thompson sampling. */
export function gammaSample(rand: () => number, shape: number): number {
  if (shape < 1) return gammaSample(rand, shape + 1) * Math.pow(rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let u = 0;
    while (u === 0) u = rand();
    x = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    const v = 1 + c * x;
    if (v <= 0) continue;
    const v3 = v * v * v;
    const u2 = rand();
    if (u2 < 1 - 0.0331 * (x * x) * (x * x)) return d * v3;
    if (Math.log(u2) < 0.5 * x * x + d * (1 - v3 + Math.log(v3))) return d * v3;
  }
}

/** Beta-Bernoulli Thompson sampling arm selection. */
export function thompsonBetaStep(alphas: number[], betas: number[], rand: () => number): number {
  let best = 0;
  let bestV = -1;
  for (let i = 0; i < alphas.length; i++) {
    const g1 = gammaSample(rand, alphas[i]!);
    const g2 = gammaSample(rand, betas[i]!);
    const v = g1 / (g1 + g2);
    if (v > bestV) { bestV = v; best = i; }
  }
  return best;
}

/** Decay epsilon-greedy schedule: eps_t = eps0 * decay^t. */
export function decayEps(eps0: number, decay: number, t: number): number {
  return eps0 * Math.pow(decay, t);
}
