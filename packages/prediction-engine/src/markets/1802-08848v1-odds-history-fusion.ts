/**
 * arXiv 1802.08848v1: Combining historical data and bookmakers'odds in modelling football scores
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * The paper fuses a historical team-strength model with bookmaker-implied scoring rates as a convex combination with a learned mixture weight, keeping both signals honest. We port the construction to NFL: history-only Elo/state-space probabilities fused with odds-implied (de-vigged, Skellam-inverted) probabilities, weight fit by holdout log-loss.
 *
 * Record improvement (verbatim):
 * Port the paper's hierarchical convex-combination construction for combining historical data and bookmakers' odds in modelling football scores to NFL: historical team-strength model as theta (GSE's existing nflverse ratings / dynamic Elo state-space replacing the paper's seasonal AR), odds-implied scoring rates lambda from inverting de-vigged spread/total markets through a margin Skellam, fused as p.theta + (1-p).lambda with per-match weights learned (Beta prior). Honesty rule (BASELINE): if the learned mixture weight collapses to p~0, the market already prices everything the history model knows and GSE should just use de-vigged consensus directly -- say so instead of shipping a fused model that is really the market in a trench coat. GSE improvement over the paper: make p state-dependent, p_m = logistic(beta0 + beta1.line_age + beta2.handle_proxy + beta3.injury_news_flag), estimating when the market knows more than the model -- the paper's static Beta prior wastes this information.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the odds fusion level only if the 2023-2025 holdout shows the fused model beats both the history-only and odds-only baselines on moneyline log-loss by >=0.005 with 95% posterior CI excluding zero; reject if the mixture weight collapses to p~0 (pure market model).
 */

export const ENABLED = false;

/** Remove overround by renormalizing (proportional de-vigging). */
export function devig(rawImplied: number[]): number[] {
  const s = rawImplied.reduce((a, b) => a + b, 0);
  return s > 0 ? rawImplied.map((p) => p / s) : rawImplied.map(() => 1 / rawImplied.length);
}

/** Convex combination of history-only and odds-implied probability vectors. */
export function convexFuse(hist: number[], odds: number[], p: number): number[] {
  const w = Math.min(1, Math.max(0, p));
  return hist.map((h, i) => w * h + (1 - w) * odds[i]!);
}

export function logLoss(probs: number[], outcome: number): number {
  return -Math.log(Math.max(probs[outcome]!, 1e-12));
}

export interface FusionFit {
  p: number;
  fusedLogLoss: number;
  histLogLoss: number;
  oddsLogLoss: number;
}

/** Grid-search the mixture weight minimizing holdout log-loss. */
export function fitFusionWeight(
  hist: number[][],
  odds: number[][],
  outcomes: number[],
): FusionFit {
  const ll = (ps: number[][], os: number[]) =>
    ps.reduce((s, pr, i) => s + logLoss(pr, os[i]!), 0) / ps.length;
  const histLL = ll(hist, outcomes);
  const oddsLL = ll(odds, outcomes);
  let bestP = 0;
  let bestLL = Infinity;
  for (let g = 0; g <= 40; g++) {
    const p = g / 40;
    const fused = hist.map((h, i) => convexFuse(h, odds[i]!, p));
    const v = ll(fused, outcomes);
    if (v < bestLL) {
      bestLL = v;
      bestP = p;
    }
  }
  return { p: bestP, fusedLogLoss: bestLL, histLogLoss: histLL, oddsLogLoss: oddsLL };
}

/**
 * Gate: adopt the fusion level only if fused beats both baselines by >= 0.005
 * nats with a 95% paired CI excluding zero, and the weight does not collapse.
 */
export function fusionGate(fit: FusionFit, pairedSe: number): "ADOPT" | "REJECT" {
  const gainHist = fit.histLogLoss - fit.fusedLogLoss;
  const gainOdds = fit.oddsLogLoss - fit.fusedLogLoss;
  const ciExcludesZero = gainHist - 1.96 * pairedSe > 0 && gainOdds - 1.96 * pairedSe > 0;
  if (fit.p < 0.02) return "REJECT"; // collapsed to pure market
  if (gainHist >= 0.005 && gainOdds >= 0.005 && ciExcludesZero) return "ADOPT";
  return "REJECT";
}
