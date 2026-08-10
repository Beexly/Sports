/**
 * Season standings win% → independent ML fair value (Bradley–Terry / logit).
 *
 * Pure math. Never invents win%. Null when either side missing or sample thin.
 * Source label: "mlb_standings" (or caller override) — model-fair only, not a book.
 *
 *   logit(p_home) = logit(wpct_h) − logit(wpct_a) + hfa_logit
 *   p_home = sigmoid(logit)
 *
 * HFA default ~0.18 logit (~55% for two .500 teams) — baseball home edge.
 */

import type { IndependentMarketFairValue } from "@sports/types";

const EPS = 1e-6;

function clipProb(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

function logit(p: number): number {
  const x = clipProb(p);
  return Math.log(x / (1 - x));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export type StandingsStrengthInput = {
  readonly homeWinPct: number;
  readonly awayWinPct: number;
  /** Minimum games played (wins+losses) per side when available. */
  readonly homeGames?: number;
  readonly awayGames?: number;
  /** Default 0.18 (≈ +4.5% for equal teams). */
  readonly hfaLogit?: number;
  /** Soft-fail when either side has fewer games (default 20). */
  readonly minGames?: number;
  readonly source?: string;
};

/**
 * Convert two season win rates into home/away win probs.
 * Returns null on non-finite, out-of-range, or thin-sample inputs.
 */
export function standingsWinPctToWinProbs(
  input: StandingsStrengthInput,
): { readonly pHome: number; readonly pAway: number; readonly marginLogit: number } | null {
  const { homeWinPct, awayWinPct } = input;
  if (
    !Number.isFinite(homeWinPct) ||
    !Number.isFinite(awayWinPct) ||
    homeWinPct <= 0 ||
    homeWinPct >= 1 ||
    awayWinPct <= 0 ||
    awayWinPct >= 1
  ) {
    return null;
  }
  const minGames = input.minGames ?? 20;
  if (
    (input.homeGames != null && input.homeGames < minGames) ||
    (input.awayGames != null && input.awayGames < minGames)
  ) {
    return null;
  }
  const hfa =
    input.hfaLogit != null && Number.isFinite(input.hfaLogit) ? input.hfaLogit : 0.18;
  // Discrimination scale: mild stretch so strong/weak teams separate (RES lever).
  // 1.1 — was 1.15; pair with softer blend stretch for Brier/ECE discipline.
  const DISCRIM = 1.1;
  const marginLogit = (logit(homeWinPct) - logit(awayWinPct) + hfa) * DISCRIM;
  const pHome = clipProb(sigmoid(marginLogit));
  return { pHome, pAway: clipProb(1 - pHome), marginLogit };
}

export function standingsWinPctToIndependentFairValue(
  input: StandingsStrengthInput,
  options?: { readonly now?: () => Date },
): IndependentMarketFairValue | null {
  const r = standingsWinPctToWinProbs(input);
  if (!r) return null;
  return {
    source: input.source ?? "mlb_standings",
    homeFairProb: r.pHome,
    awayFairProb: r.pAway,
    capturedAt: (options?.now ?? (() => new Date()))().toISOString(),
  };
}
