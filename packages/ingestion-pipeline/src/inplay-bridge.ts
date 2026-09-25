/**
 * In-play bridge — wires antipersistent scoring, Markov WP, and
 * mixed-tier training into the live in-game path.
 *
 * This is the "reasoning while the game is happening" layer: next-score
 * probability with mean-reversion, Markov win probability from precomputed
 * transition powers, and tier-weighted logistic for mixed-quality samples.
 *
 * Fail-closed on missing inputs. Never invents a win probability.
 */

import {
  nextScoreProb,
  eventWinProb,
  inPlayWinProb,
  buildTransitionMatrix,
  teamConditionedBalance,
  augmentationWeights,
  weightedLogistic,
  tierBrier,
  type ScoringDynamicsParams,
  type InPlayChainParams,
  type TieredGame,
} from "@sports/prediction-engine";

export type NextScoreEval =
  | { readonly ok: true; readonly pNext: number }
  | { readonly ok: false; readonly reason: string };

/**
 * P(team A scores next) under antipersistent dynamics (mean-reverting
 * after a score, restorative when trailing).
 */
export function evalNextScore(
  params: ScoringDynamicsParams,
  leadA: number,
  aScoredLast: boolean,
): NextScoreEval {
  if (
    !params ||
    !Number.isFinite(params.offA) ||
    !Number.isFinite(params.offB) ||
    !Number.isFinite(params.defA) ||
    !Number.isFinite(params.defB) ||
    !Number.isFinite(params.restore) ||
    !Number.isFinite(params.antipersist)
  ) {
    return { ok: false, reason: "ScoringDynamicsParams must be finite" };
  }
  if (!Number.isFinite(leadA)) {
    return { ok: false, reason: "leadA must be finite" };
  }
  try {
    return { ok: true, pNext: nextScoreProb(params, leadA, aScoredLast) };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type InPlayWpEval =
  | { readonly ok: true; readonly wp: number }
  | { readonly ok: false; readonly reason: string };

/**
 * Markov in-play win probability from precomputed transition powers.
 */
export function evalInPlayWp(input: {
  readonly params: InPlayChainParams;
  readonly currentLead: number;
  readonly eventsLeft: number;
}): InPlayWpEval {
  const { params, currentLead, eventsLeft } = input;
  if (
    !params ||
    typeof params.balanceAt !== "function" ||
    !Number.isFinite(params.tempo) ||
    !Number.isFinite(currentLead)
  ) {
    return { ok: false, reason: "params (tempo + balanceAt) and finite currentLead required" };
  }
  if (!Number.isFinite(eventsLeft) || eventsLeft < 0) {
    return { ok: false, reason: "eventsLeft must be >= 0" };
  }
  try {
    const P = buildTransitionMatrix(params);
    const all: number[][][] = [P];
    for (let k = 1; k < Math.min(Math.max(eventsLeft, 1), 15); k++) {
      const prev = all[all.length - 1]!;
      const next = prev.map((row, i) =>
        row.map((_, j) =>
          row.reduce((s, _val, k2) => s + (prev[i]![k2] ?? 0) * (P[k2]?.[j] ?? 0), 0),
        ),
      );
      all.push(next);
    }
    const wp = inPlayWinProb(all, currentLead, eventsLeft);
    return { ok: true, wp: Number(wp.toFixed(6)) };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type MixedTierEval =
  | {
      readonly ok: true;
      readonly beta: readonly number[];
      readonly brierRegular: number;
      readonly brierPlayoff: number;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * Mixed-tier weighted logistic: train on tier-weighted samples so scarce
 * playoff games carry more weight. Returns the fitted beta and per-tier Brier.
 */
export function evalMixedTier(input: {
  readonly games: readonly TieredGame[];
  readonly playoffWeight?: number;
  readonly iters?: number;
}): MixedTierEval {
  const { games, iters, playoffWeight } = input;
  if (!Array.isArray(games) || games.length < 2) {
    return { ok: false, reason: "need at least 2 tiered games to train" };
  }
  try {
    const weights = augmentationWeights(games as TieredGame[], playoffWeight ?? 2);
    const beta = weightedLogistic(games as TieredGame[], weights, iters ?? 50);
    const brierRegular = tierBrier(games as TieredGame[], beta, "regular");
    const brierPlayoff = tierBrier(games as TieredGame[], beta, "playoff");
    return {
      ok: true,
      beta: beta as number[],
      brierRegular: Number.isFinite(brierRegular) ? Number(brierRegular.toFixed(6)) : Number.NaN,
      brierPlayoff: Number.isFinite(brierPlayoff) ? Number(brierPlayoff.toFixed(6)) : Number.NaN,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Team-conditioned balance factory: returns P(leader scores | lead L) as a
 * function of the pregame spread. This is what feeds InPlayChainParams.balanceAt.
 */
export function buildTeamBalance(
  pregameSpread: number,
  baseBalance = 0.55,
  sensitivity = 0.02,
): { readonly ok: true; readonly balanceAt: (lead: number) => number } | { readonly ok: false; readonly reason: string } {
  if (!Number.isFinite(pregameSpread)) {
    return { ok: false, reason: "pregameSpread must be finite" };
  }
  try {
    return {
      ok: true,
      balanceAt: teamConditionedBalance(pregameSpread, baseBalance, sensitivity),
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export {
  nextScoreProb,
  eventWinProb,
  inPlayWinProb,
  buildTransitionMatrix,
  teamConditionedBalance,
  augmentationWeights,
  weightedLogistic,
  tierBrier,
};
export type { ScoringDynamicsParams, InPlayChainParams, TieredGame };
