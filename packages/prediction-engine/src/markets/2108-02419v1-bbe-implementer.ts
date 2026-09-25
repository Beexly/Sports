/**
 * arXiv 2108.02419v1: Implementing the BBE Agent-Based Model of a Sports-Betting Exchange
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions
 * and is a NEEDS HUMAN CALL). Pure helpers for an NFL-flavoured BBE scaffold:
 * drive/game-state types, EP/WP transition stubs, bettor-archetype stake/error
 * primitives, synthetic live odds-tape ticks, closing-line-move MAD, and relative
 * log-loss for the ACCEPTANCE GATE below.
 *
 * MECHANISM: BBE is an agent-based sports-betting-exchange simulator. Bettor
 * archetypes post and take prices; a drive-level game state advances EP/WP; the
 * tape of synthetic live odds is the lab input for a live-total model.
 *
 * IMPROVEMENT: NFL-flavoured BBE with drive-level game simulator (down/distance/
 * yardline, EP/WP), bettor archetypes, synthetic live odds tapes, and Kelly
 * stress-test primitives. Cross-market interplay deferred. Synthetic steam lab
 * only — no live publish path.
 *
 * ACCEPTANCE GATE (verbatim from IMPROVEMENT-LEDGER): ADOPT the synthetic-live-
 * market simulator if the synthetic-trained live-total model achieves within 10%
 * relative log-loss of the real-trained model on the 2024 test set AND the
 * simulator reproduces closing-line-move distributions within +-0.5 points MAD.
 *
 * Gate status: NOT EVALUATED
 *
 * owner: Motif-lab | bucket: MODEL | lane: markets | verdict: ADAPT
 */

export const ENABLED = false;

/** Relative log-loss tolerance from the ACCEPTANCE GATE (10%). */
export const RELATIVE_LOG_LOSS_TOLERANCE = 0.1;

/** Closing-line-move MAD tolerance in points from the ACCEPTANCE GATE. */
export const CLOSING_LINE_MOVE_MAD_TOLERANCE = 0.5;

export type DriveState = {
  readonly down: 1 | 2 | 3 | 4;
  readonly distance: number;
  readonly yardline: number;
  readonly scoreDiff: number;
  readonly secondsRemaining: number;
};

export type GameState = {
  readonly possession: "home" | "away";
  readonly drive: DriveState;
  readonly homeScore: number;
  readonly awayScore: number;
};

export type BettorArchetype = {
  readonly id: string;
  /** Mean absolute error on fair probability, in [0, 1]. */
  readonly errorScale: number;
  /** Fraction of bankroll risked per edge unit, in (0, 1]. */
  readonly stakeFraction: number;
};

export type OddsTick = {
  readonly t: number;
  readonly spread: number;
  readonly total: number;
  readonly homeMl: number;
  readonly awayMl: number;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/**
 * Crude EP stub: expected points from field position only.
 * Not a calibrated EP model — scaffold for synthetic tapes.
 */
export function expectedPointsStub(yardline: number): number {
  if (!Number.isFinite(yardline)) return 0;
  const yl = Math.max(1, Math.min(99, yardline));
  return (100 - yl) / 20;
}

/**
 * Crude WP stub from score differential and time remaining.
 * Not a calibrated WP model — scaffold for synthetic tapes.
 */
export function winProbStub(scoreDiff: number, secondsRemaining: number): number {
  if (!Number.isFinite(scoreDiff) || !Number.isFinite(secondsRemaining)) {
    return 0.5;
  }
  const timeWeight = Math.max(0, Math.min(1, 1 - secondsRemaining / 3600));
  const margin = scoreDiff * (0.04 + 0.12 * timeWeight);
  return clamp01(1 / (1 + Math.exp(-margin)));
}

/**
 * Advance down/distance after a play of `yardsGained`.
 * Returns a new DriveState; does not mutate input.
 */
export function advanceDrive(drive: DriveState, yardsGained: number): DriveState {
  if (!Number.isFinite(yardsGained)) return drive;
  const gained = Math.max(-99, Math.min(99, yardsGained));
  const newYardline = Math.max(1, Math.min(99, drive.yardline - gained));
  const remaining = drive.distance - gained;
  if (remaining <= 0) {
    return {
      down: 1,
      distance: 10,
      yardline: newYardline,
      scoreDiff: drive.scoreDiff,
      secondsRemaining: Math.max(0, drive.secondsRemaining - 6),
    };
  }
  if (drive.down === 4) {
    return {
      down: 1,
      distance: 10,
      yardline: Math.max(1, Math.min(99, 100 - newYardline)),
      scoreDiff: -drive.scoreDiff,
      secondsRemaining: Math.max(0, drive.secondsRemaining - 6),
    };
  }
  return {
    down: (drive.down + 1) as 2 | 3 | 4,
    distance: Math.max(1, remaining),
    yardline: newYardline,
    scoreDiff: drive.scoreDiff,
    secondsRemaining: Math.max(0, drive.secondsRemaining - 6),
  };
}

/**
 * Bettor posts a noisy fair-prob estimate: clamp(fair + U[-error, +error]).
 */
export function bettorFairEstimate(fairProb: number, archetype: BettorArchetype, noise: number): number {
  const err = Math.max(0, archetype.errorScale);
  const n = Number.isFinite(noise) ? Math.max(-1, Math.min(1, noise)) : 0;
  return clamp01(fairProb + n * err);
}

/**
 * Stake size = bankroll * stakeFraction * max(0, edge).
 * Edge = estimate - fair when betting the side; zero when estimate <= fair.
 */
export function bettorStake(
  bankroll: number,
  fairProb: number,
  estimate: number,
  archetype: BettorArchetype,
): number {
  if (!Number.isFinite(bankroll) || bankroll <= 0) return 0;
  const edge = Math.max(0, estimate - fairProb);
  const frac = Math.max(0, Math.min(1, archetype.stakeFraction));
  return bankroll * frac * edge;
}

/**
 * One synthetic odds-tape tick. Spread/total drift with vp; ML from a crude
 * logistic of the current home WP stub.
 */
export function syntheticOddsTick(
  t: number,
  prior: OddsTick,
  homeWp: number,
  volatility: number,
): OddsTick {
  const vp = Number.isFinite(volatility) ? Math.max(0, volatility) : 0;
  const wave = Math.sin(t) * vp;
  const wp = clamp01(homeWp);
  const homeMl = wp >= 0.5 ? Math.round(-100 * wp / (1 - wp + 1e-9)) : Math.round(100 * (1 - wp) / (wp + 1e-9));
  const awayMl = wp <= 0.5 ? Math.round(-100 * (1 - wp) / (wp + 1e-9)) : Math.round(100 * wp / (1 - wp + 1e-9));
  return {
    t,
    spread: prior.spread + wave,
    total: Math.max(0.5, prior.total + wave * 0.5),
    homeMl,
    awayMl,
  };
}

/**
 * Generate a synthetic live odds tape of `n` ticks from an opening line.
 */
export function generateSyntheticTape(
  open: OddsTick,
  n: number,
  homeWpSeries: readonly number[],
  volatility: number,
): OddsTick[] {
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return [];
  const ticks: OddsTick[] = [{ ...open, t: 0 }];
  for (let i = 1; i < count; i++) {
    const prev = ticks[i - 1];
    if (prev === undefined) break;
    const wp = homeWpSeries[Math.min(i, homeWpSeries.length - 1)] ?? 0.5;
    ticks.push(syntheticOddsTick(i, prev, wp, volatility));
  }
  return ticks;
}

/**
 * Mean absolute deviation of (close - open) moves vs a reference move series.
 * Both arrays must be the same length; empty → 0.
 */
export function closingLineMoveMad(
  simulatedMoves: readonly number[],
  referenceMoves: readonly number[],
): number {
  const n = Math.min(simulatedMoves.length, referenceMoves.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = simulatedMoves[i];
    const r = referenceMoves[i];
    if (s === undefined || r === undefined || !Number.isFinite(s) || !Number.isFinite(r)) {
      continue;
    }
    sum += Math.abs(s - r);
  }
  return sum / n;
}

/**
 * Mean log-loss of probabilistic forecasts against binary labels.
 * Labels must be 0 or 1; forecasts clamped to (eps, 1-eps).
 */
export function meanLogLoss(forecasts: readonly number[], labels: readonly number[]): number {
  const n = Math.min(forecasts.length, labels.length);
  if (n === 0) return 0;
  const eps = 1e-15;
  let sum = 0;
  let counted = 0;
  for (let i = 0; i < n; i++) {
    const pRaw = forecasts[i];
    const y = labels[i];
    if (pRaw === undefined || y === undefined || !Number.isFinite(pRaw) || !Number.isFinite(y)) {
      continue;
    }
    const p = Math.max(eps, Math.min(1 - eps, pRaw));
    sum += y === 1 ? -Math.log(p) : -Math.log(1 - p);
    counted += 1;
  }
  return counted === 0 ? 0 : sum / counted;
}

/**
 * Relative log-loss of synthetic vs real: (synth - real) / real.
 * Negative means synthetic is better. Zero real → Infinity if synth > 0 else 0.
 */
export function relativeLogLoss(syntheticLl: number, realLl: number): number {
  if (!Number.isFinite(syntheticLl) || !Number.isFinite(realLl)) return Number.POSITIVE_INFINITY;
  if (realLl === 0) return syntheticLl === 0 ? 0 : Number.POSITIVE_INFINITY;
  return (syntheticLl - realLl) / realLl;
}

/**
 * Evaluate the ACCEPTANCE GATE without side effects.
 * Returns whether both clauses would pass given the measured numbers.
 */
export function acceptanceGatePasses(
  relativeLl: number,
  closingLineMad: number,
): boolean {
  if (!Number.isFinite(relativeLl) || !Number.isFinite(closingLineMad)) return false;
  return relativeLl <= RELATIVE_LOG_LOSS_TOLERANCE && closingLineMad <= CLOSING_LINE_MOVE_MAD_TOLERANCE;
}
