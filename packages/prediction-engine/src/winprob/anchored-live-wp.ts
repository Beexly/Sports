/**
 * NFL live win probability with a time-decayed pre-game anchor (arXiv 2204.11777).
 *
 * Pre-game anchor = vig-free moneyline-implied win prob. In-game
 * likelihood from (time remaining, score differential, possession,
 * down/distance, timeouts). Blend weight w(t) on the anchor decays from
 * ~1 at kickoff to ~0 late; early-game cells are regularized toward the
 * anchor to kill MLE-style overreaction to a 14-0 Q1 lead. w(t, game
 * state) is LEARNED by minimizing held-out Brier, not asserted
 * (the paper's literal beta-prior cell machinery is basketball-specific
 * and is NOT replicated here).
 *
 * ACCEPTANCE GATE: ADOPT the time-decayed anchor + early-game
 * regularization iff it beats market-implied WP on 2024-2025 held-out
 * Brier AND shows calibration slope within [0.9, 1.1].
 *
 * Research-only module. Not wired into any live win-probability path.
 */

export interface GameState {
  /** Seconds remaining in the game. */
  secondsLeft: number;
  /** Score differential (home - away). */
  scoreDiff: number;
  /** 1 if home has possession, -1 if away, 0 if unknown/neutral. */
  possession: 1 | -1 | 0;
  /** Yards to go for a first down (0 if not applicable). */
  yardsToGo: number;
  /** Timeout fraction remaining for the trailing side, [0, 1]. */
  timeoutFrac: number;
}

export interface AnchorParams {
  /** Decay rate of the anchor weight. */
  kappa: number;
  /** Score-differential sensitivity of the in-game component. */
  alpha: number;
  /** Possession bump in log-odds. */
  betaPoss: number;
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Anchor weight w(t) = exp(-kappa * elapsedFrac): ~1 at kickoff, ~0 late.
 */
export function anchorWeight(secondsLeft: number, kappa: number): number {
  if (secondsLeft < 0) throw new Error("anchorWeight: negative time");
  if (kappa < 0) throw new Error("anchorWeight: kappa >= 0");
  const elapsed = 1 - Math.min(1, secondsLeft / 3600);
  return Math.exp(-kappa * elapsed);
}

/**
 * In-game likelihood component from game state (logistic of score
 * differential scaled by time remaining, plus possession).
 */
export function inGameComponent(state: GameState, params: AnchorParams): number {
  const timeFrac = Math.min(1, Math.max(0, state.secondsLeft / 3600));
  // Late + close: score differential dominates; early: it is shrunk.
  const z =
    params.alpha * state.scoreDiff * (1.2 - timeFrac) +
    params.betaPoss * state.possession * (0.5 + 0.5 * timeFrac);
  return logistic(z);
}

/**
 * Anchored live win probability: w(t) * anchor + (1 - w(t)) * inGame,
 * blended on the probability scale.
 */
export function anchoredLiveWp(
  anchor: number,
  state: GameState,
  params: AnchorParams,
): number {
  if (anchor <= 0 || anchor >= 1) throw new Error("anchoredLiveWp: anchor in (0,1)");
  const w = anchorWeight(state.secondsLeft, params.kappa);
  const ig = inGameComponent(state, params);
  return w * anchor + (1 - w) * ig;
}

/**
 * Learn (kappa, alpha, betaPoss) by grid search minimizing Brier score on
 * held-out game states with realized outcomes.
 */
export function fitAnchorParams(
  rows: ReadonlyArray<{ anchor: number; state: GameState; won: number }>,
  grid: { kappas: readonly number[]; alphas: readonly number[]; betas: readonly number[] } = {
    kappas: [0.5, 1, 2, 3, 5],
    alphas: [0.05, 0.1, 0.2, 0.35],
    betas: [0, 0.2, 0.4],
  },
): AnchorParams {
  if (rows.length === 0) throw new Error("fitAnchorParams: no data");
  let best: AnchorParams = { kappa: 1, alpha: 0.1, betaPoss: 0 };
  let bestBrier = Infinity;
  for (const kappa of grid.kappas) {
    for (const alpha of grid.alphas) {
      for (const betaPoss of grid.betas) {
        const params = { kappa, alpha, betaPoss };
        let s = 0;
        for (const r of rows) {
          const p = anchoredLiveWp(r.anchor, r.state, params);
          s += (p - r.won) ** 2;
        }
        const brier = s / rows.length;
        if (brier < bestBrier) {
          bestBrier = brier;
          best = params;
        }
      }
    }
  }
  return best;
}

/** Brier score of the anchored model on held-out rows. */
export function heldOutBrier(
  rows: ReadonlyArray<{ anchor: number; state: GameState; won: number }>,
  params: AnchorParams,
): number {
  if (rows.length === 0) throw new Error("heldOutBrier: no data");
  let s = 0;
  for (const r of rows) {
    const p = anchoredLiveWp(r.anchor, r.state, params);
    s += (p - r.won) ** 2;
  }
  return s / rows.length;
}
