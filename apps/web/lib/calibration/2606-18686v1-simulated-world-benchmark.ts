/**
 * arXiv 2606.18686v1: ForecastBench-Sim: A Simulated-World Forecasting Benchmark.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Simulated-world calibration benchmark (ForecastBench-Sim analog): freeze halftime game states, pose engine questions (final margin, total, 2H points), resolve by Monte-Carlo rollout of a drive-level game simulator (1,000+ sims), score Brier/CRPS against sim-resolved outcomes, run interventional mutations (QB injury, weather shift) and adversarial tail states (4th-quarter 1-score games).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Build a simulated-world calibration benchmark: freeze halftime game states, pose engine questions (final margin, total, 2H points), resolve by Monte-Carlo rollout of a drive-level game simulator (1,000+ sims), score Brier/CRPS against sim-resolved outcomes, run interventional mutations (QB injury, weather shift) to test counterfactual calibration, and generate adversarial tail states (4th-quarter 1-score games, extreme weather) where the bankroll lives or dies.
 *
 * ACCEPTANCE GATE:
 * ADOPT sim-resolved calibration if engine calibration curves against sim-resolved outcomes match real-outcome calibration within ±0.05 slope on 2024.
 *
 * No ENABLED flag: offline benchmark harness, not a publish path.
 */


export interface HalftimeState {
  readonly homeScore: number;
  readonly awayScore: number;
  /** Drives remaining per team (approx). */
  readonly drivesRemaining: number;
  /** Home team's per-drive scoring distribution (points). */
  readonly homeDriveDist: readonly number[];
  /** Away team's per-drive scoring distribution (points). */
  readonly awayDriveDist: readonly number[];
}

export function mulberry32Local(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One Monte-Carlo rollout of remaining drives from a frozen halftime state. */
export function rolloutGame(
  state: HalftimeState,
  rand: () => number,
): { homeFinal: number; awayFinal: number } {
  const draw = (dist: readonly number[]) =>
    dist[Math.floor(rand() * dist.length)]!;
  let h = state.homeScore;
  let a = state.awayScore;
  for (let d = 0; d < state.drivesRemaining; d++) {
    h += draw(state.homeDriveDist);
    a += draw(state.awayDriveDist);
  }
  return { homeFinal: h, awayFinal: a };
}

/**
 * Sim-resolved outcome distribution: nSims rollouts -> empirical distribution
 * of (final margin, total). The engine's forecast is scored against this.
 */
export function simResolvedDistribution(
  state: HalftimeState,
  nSims: number,
  seed: number,
): { margins: number[]; totals: number[] } {
  const rand = mulberry32Local(seed);
  const margins: number[] = [];
  const totals: number[] = [];
  for (let s = 0; s < nSims; s++) {
    const { homeFinal, awayFinal } = rolloutGame(state, rand);
    margins.push(homeFinal - awayFinal);
    totals.push(homeFinal + awayFinal);
  }
  return { margins, totals };
}

export interface EngineQuestion {
  /** P(home wins) forecast at the frozen halftime state. */
  readonly pHomeWin: number;
  /** Forecast mean total. */
  readonly meanTotal: number;
}

/** Brier score of the home-win forecast vs the sim-resolved outcome. */
export function simBrier(pHomeWin: number, simMargins: readonly number[]): number {
  const outcomes: number[] = simMargins.map((m) => (m > 0 ? 1 : 0));
  const mean = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
  return (pHomeWin - mean) * (pHomeWin - mean);
}

/** CRPS of a forecast sample set vs the sim-resolved outcomes. */
export function simCRPS(
  forecastSamples: readonly number[],
  simOutcomes: readonly number[],
): number {
  const n = forecastSamples.length;
  const m = simOutcomes.length;
  let term1 = 0;
  for (const x of forecastSamples) {
    for (const y of simOutcomes) term1 += Math.abs(x - y);
  }
  term1 /= n * m;
  let term2 = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) term2 += Math.abs(forecastSamples[i]! - forecastSamples[j]!);
  }
  term2 /= n * n;
  return term1 - 0.5 * term2;
}

/** Interventional mutation: scale a team's drive distribution (QB injury, weather). */
export function mutateDriveDist(
  dist: readonly number[],
  scale: number,
): number[] {
  return dist.map((x) => x * scale);
}

/**
 * Calibration-slope check: regress sim-resolved outcomes on engine probs;
 * slope within +/-0.05 of 1.0 means sim-resolved calibration matches real.
 */
export function calibrationSlope(
  probs: readonly number[],
  outcomes: readonly number[],
): number {
  const n = probs.length;
  const mp = probs.reduce((a, b) => a + b, 0) / n;
  const mo = outcomes.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (probs[i]! - mp) * (outcomes[i]! - mo);
    den += (probs[i]! - mp) * (probs[i]! - mp);
  }
  return den > 0 ? num / den : 0;
}

/** Gate: |slope - 1| <= 0.05 on the 2024 comparison. */
export function slopeGateOk(slope: number): boolean {
  return Math.abs(slope - 1) <= 0.05;
}
