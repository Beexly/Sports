/**
 * ECDD — EWMA chart for detecting concept drift in the win-probability model.
 *
 * Streams weekly binary correctness (1 = model picked the loser, i.e. an
 * error) into an exponentially weighted moving average chart with λ = 0.2
 * and ARL₀ ≈ 1 season (~272 games, one false alarm per season on average).
 * Auto-resets the baseline at season start (the offseason is a guaranteed
 * regime change); an alarm triggers the post-drift refit policy (retrain on
 * trailing post-alarm games, challenger-vs-champion for 2 weeks).
 *
 * @see arXiv:1212.6018v1 — "Exponentially Weighted Moving Average Charts for Detecting Concept Drift"
 *
 * ACCEPTANCE GATE: ADOPT as the production drift monitor iff on 2020–2025
 * nflverse: (i) Brier within 0.001 of the 4-week fixed refit schedule,
 * (ii) observed false-alarm rate ≤ 1.5× the nominal ARL₀ rate, (iii)
 * refit-on-alarm does not degrade Brier by more than 0.002 vs the frozen
 * baseline on non-alarm weeks. The gate is a backtest concern; this module is
 * the pure EWMA kernel, not wired into any live path.
 */

export interface EcddState {
  /** Current EWMA level Z_t. */
  level: number;
  /** Games streamed since the last reset. */
  n: number;
  /** Whether the last update raised an alarm. */
  alarmed: boolean;
}

export interface EcddConfig {
  /** EWMA smoothing, paper default 0.2. */
  lambda?: number;
  /** Control-limit multiplier L; ~2.4 gives ARL₀ ≈ 272 at λ=0.2, p₀=0.5. */
  limitMultiplier?: number;
  /** In-control error rate (baseline model error probability). */
  baseErrorRate?: number;
}

/**
 * Create a fresh ECDD monitor. Call at season start (auto-reset) — the
 * offseason is a guaranteed regime change, so the baseline never carries
 * across seasons.
 */
export function createEcdd(config: EcddConfig = {}): EcddState {
  return { level: config.baseErrorRate ?? 0.5, n: 0, alarmed: false };
}

/**
 * Stream one weekly binary outcome: 1 = model picked the loser (error),
 * 0 = model picked the winner. Returns the updated state; `alarmed` is true
 * when the EWMA breaches the upper control limit.
 */
export function ecddUpdate(state: EcddState, error: 0 | 1, config: EcddConfig = {}): EcddState {
  const lambda = config.lambda ?? 0.2;
  const L = config.limitMultiplier ?? 2.4;
  const p0 = config.baseErrorRate ?? 0.5;
  if (!(lambda > 0 && lambda <= 1)) throw new Error("ecddUpdate: lambda must be in (0,1]");
  const level = lambda * error + (1 - lambda) * state.level;
  // Steady-state EWMA std for Bernoulli(p0): σ·√(λ/(2−λ)), σ = √(p0(1−p0))
  const sigmaZ = Math.sqrt(p0 * (1 - p0)) * Math.sqrt(lambda / (2 - lambda));
  const ucl = p0 + L * sigmaZ;
  return { level, n: state.n + 1, alarmed: level > ucl };
}

/**
 * How many consecutive errors (worst case) it takes to alarm from a fresh
 * monitor — a sanity bound on detection delay.
 */
export function ecddWorstCaseDelay(config: EcddConfig = {}): number {
  let s = createEcdd(config);
  let steps = 0;
  while (!s.alarmed && steps < 10000) {
    s = ecddUpdate(s, 1, config);
    steps++;
  }
  return steps;
}
