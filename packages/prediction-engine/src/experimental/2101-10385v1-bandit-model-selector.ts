/**
 * arXiv 2101.10385v1: Online and Scalable Model Selection with Multi-Armed Bandits
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * 'Engine Model Selector': arms = model versions (v5.2.7, challengers with different feature sets or lookbacks); reward = realized pick KPIs over a rolling window (ROI on posted picks and calibration/Brier, computed only on picks each version actually shipped); rotate challenger versions on low-stakes slates weekly (Thursday-only or a subset of props), not 15-minute; decay epsilon-greedy with weekly steps, epsilon_0 = 0.3, alpha ~= 8 weeks.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * 'Engine Model Selector': arms = model versions (e.g., v5.2.7, challenger versions with different feature sets or lookbacks); reward = realized pick KPIs over a rolling window (ROI on posted picks and calibration/Brier, computed only on picks each version actually shipped); rotate challenger versions on low-stakes slates weekly (Thursday-only or a subset of props), not 15-minute; decay epsilon-greedy with weekly steps, epsilon_0 = 0.3, alpha ~= 8 weeks.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if a replay of decay epsilon-greedy on 2024 NFL posted picks shows (a) cumulative-regret reduction >= 20% vs equal-split A/B in ROI terms by Week 9, AND (b) the selector's traffic share for the ex-post best arm >= 70% by Week 12; REJECT otherwise (the mechanism adds complexity without demonstrated traffic-savings).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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
