// ============================================================
// RISAN-style instance-specific abstention (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the (f, rho) joint learner is
 * trained by the training system (a human/system call), and activation
 * requires the gate (>=3pt accepted hit-rate at matched coverage, robust
 * under 20% noise) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2107.03090 — "RISAN: Robust Instance Specific Deep Abstention Network"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: RISAN learns a per-instance abstention width rho(x)
 * jointly with the predictor f via a double-sigmoid surrogate of the
 * 0-d-1 loss: each instance gets its own abstention band whose width adapts
 * to local difficulty, rather than one global threshold. The robust
 * extension trains under label noise.
 *
 * IMPROVEMENT (from ledger): Build GSE-RISAN as a second gate head: take
 * the pick model's feature trunk, add a rho(x) head outputting a per-pick
 * abstention width, train jointly with a double-sigmoid-style surrogate
 * adapted to unit loss (replace 0-d-1's fixed d with a per-pick cost d(x) =
 * stake fraction at risk), compare against the global-threshold gate and
 * the ledger-1775 learned score on accepted hit-rate at matched card sizes
 * with 10-20% injected outcome noise — and learn a market-conditioned width
 * rho(x, line-movement) so the abstention band widens when the market
 * disagrees with the model (abstain when the market knows something the
 * model doesn't).
 *
 * ACCEPTANCE GATE: ADAPT accepted if the joint (f, rho) learner beats the
 * global gate by >= 3 points of accepted hit-rate at matched coverage on
 * clean data AND degrades less under 20% injected noise; else REJECT (keep
 * the fixed-predictor learned score from 1775).
 */

/** Double-sigmoid surrogate adapted to unit loss with per-pick cost d(x).
 *
 *  L(margin, rho, d) = 2(1-d)·σ(−β(margin+ρ)) + d·σ(β(margin+ρ))·σ(−β(margin−ρ))
 *
 *  Limiting behavior (the 0-d-1 shape, smoothed): confident-correct
 *  (margin >> ρ) → 0; confident-wrong (−margin >> ρ) → 2(1−d); inside the
 *  abstention band (|margin| < ρ) → ≈ d. The fixed 0-d-1 abstention cost is
 *  replaced by the per-pick cost d(x) = stake fraction at risk.
 */
export function doubleSigmoidUnitLoss(
  margin: number, // y * f(x): signed confidence in the true outcome
  rho: number, // per-pick abstention half-width
  d: number, // per-pick abstention cost = stake fraction at risk
  beta = 5,
): number {
  const s = (t: number): number => 1 / (1 + Math.exp(-beta * t));
  const wrongTerm = 2 * (1 - d) * s(-margin - rho);
  const abstainTerm = d * s(margin + rho) * s(-margin + rho);
  return wrongTerm + abstainTerm;
}

/**
 * Market-conditioned abstention width rho(x, lineMove): the band widens
 * when the market disagrees with the model (line moved against the pick).
 * baseRho from the rho head; disagreement in points >= 0.
 */
export function marketConditionedRho(baseRho: number, lineDisagreement: number, sensitivity = 0.35): number {
  return Math.max(0, baseRho + sensitivity * Math.max(lineDisagreement, 0));
}

/** RISAN publish rule: publish when the signed margin clears the abstention band. */
export function risanPublish(margin: number, rho: number): boolean {
  return Math.abs(margin) >= rho;
}

export interface RisanPick {
  id: string;
  margin: number; // signed model confidence y*f(x)
  baseRho: number; // rho(x) head output
  lineDisagreement: number; // points the market moved against the model
  won: boolean;
}

/**
 * Accepted hit-rate at a matched card size: publish the top-k by
 * (margin - rho) (most-confident-outside-the-band first).
 */
export function risanAcceptedHitRate(picks: RisanPick[], cardSize: number, sensitivity = 0.35): number {
  const ranked = picks
    .map((p) => ({ p, score: p.margin - marketConditionedRho(p.baseRho, p.lineDisagreement, sensitivity) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, cardSize));
  const wins = ranked.filter((r) => r.p.won).length;
  return ranked.length > 0 ? wins / ranked.length : 0;
}

/** Inject label noise at the given rate (deterministic flip of every 1/rate-th pick). */
export function injectOutcomeNoise(picks: RisanPick[], noiseRate: number): RisanPick[] {
  if (noiseRate <= 0) return picks.map((p) => ({ ...p }));
  const every = Math.max(1, Math.round(1 / noiseRate));
  return picks.map((p, i) => (i % every === 0 ? { ...p, won: !p.won } : { ...p }));
}

/** Global-threshold gate baseline: publish the top-k by |margin|. */
export function globalGateHitRate(picks: RisanPick[], cardSize: number): number {
  const ranked = [...picks].sort((a, b) => Math.abs(b.margin) - Math.abs(a.margin)).slice(0, Math.max(1, cardSize));
  const wins = ranked.filter((p) => p.won).length;
  return ranked.length > 0 ? wins / ranked.length : 0;
}

/**
 * Gate helper: RISAN beats the global gate by >= 3pt on clean data AND its
 * degradation under 20% noise is no worse than the global gate's.
 */
export function risanGatePasses(
  risanClean: number,
  globalClean: number,
  risanNoisy: number,
  globalNoisy: number,
): boolean {
  const cleanWin = risanClean - globalClean >= 0.03;
  const risanDegradation = risanClean - risanNoisy;
  const globalDegradation = globalClean - globalNoisy;
  return cleanWin && risanDegradation <= globalDegradation + 1e-9;
}
