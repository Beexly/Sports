// ============================================================
// Distributional regression with reject option (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2503.23782v1 — "Distributional regression with reject option"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the predictor outputs a full predictive distribution
 * F_hat_X per game; the optimal reject rule thresholds the entropy of the
 * CRPS — reject iff Ent(F_hat_X) > lambda, where
 * Ent(F) = E_{Y~F}[CRPS(F, Y)]. The threshold lambda is calibrated on an
 * UNLABELED sample as the (1-epsilon) quantile of entropies, which controls
 * the rejection rate distribution-free (|r_hat - epsilon| small by
 * construction). Labeled data estimates F_hat and Ent; unlabeled data sets
 * the budget.
 *
 * IMPROVEMENT (from ledger): Replace the static ε=0.15–0.2 plug-in rejection budget with a regime-conditional one: allocate larger sit-out fractions to high-entropy regimes (division games, heavy weather, short rest) and smaller ones to clean games, testing whether it improves published ROI over the global ε.
 *
 * ACCEPTANCE GATE: ADAPT if the ε=0.15–0.2 plug-in rule achieves |r̂−ε| ≤ 2pp and beats the no-gate baseline on published-game ROI by ≥1pp with lower CRPS error; adopt the entropy criterion if it also beats the 0700 conformal gate.
 */

export type EntropyRegime = "division" | "weather" | "short-rest" | "clean";

export interface EntropyGame {
  id: string;
  regime: EntropyRegime;
  /** Predictive mean (e.g. expected margin). */
  mu: number;
  /** Predictive std (aleatoric + epistemic uncertainty). */
  sigma: number;
  /** Realized outcome (e.g. actual margin). */
  actual: number;
  /** Realized unit profit if published. */
  profit: number;
  won: boolean;
}

/** CRPS entropy of a Gaussian predictive: Ent(N(mu, s^2)) = s / sqrt(pi). */
export function crpsEntropy(sigma: number): number {
  return sigma / Math.sqrt(Math.PI);
}

function phi(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/** Standard normal CDF via the Abramowitz-Stegun erf approximation. */
function Phi(z: number): number {
  const s = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  // A&S 7.1.26
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + s * y);
}

/** Closed-form CRPS of N(mu, sigma^2) against outcome y. */
export function gaussianCrps(mu: number, sigma: number, y: number): number {
  if (sigma <= 0) return Math.abs(y - mu);
  const z = (y - mu) / sigma;
  return sigma * (z * (2 * Phi(z) - 1) + 2 * phi(z) - 1 / Math.sqrt(Math.PI));
}

/**
 * Calibrate lambda on an UNLABELED entropy sample: the (1-epsilon)
 * empirical quantile, so the plug-in rule rejects ~epsilon of mass
 * (distribution-free rejection-rate control).
 */
export function calibrateLambda(entropies: number[], epsilon: number): number {
  if (entropies.length === 0) return Infinity;
  const sorted = [...entropies].sort((a, b) => a - b);
  const k = Math.ceil((sorted.length + 1) * (1 - epsilon));
  return sorted[Math.min(Math.max(k, 1), sorted.length) - 1]!;
}

/** Paper's optimal rule: reject iff CRPS entropy exceeds lambda. */
export function entropyReject(game: EntropyGame, lambda: number): boolean {
  return crpsEntropy(game.sigma) > lambda;
}

/** Default regime-conditional sit-out budgets (high-entropy regimes sit more). */
export const REGIME_EPSILONS: Record<EntropyRegime, number> = {
  division: 0.3,
  weather: 0.3,
  "short-rest": 0.25,
  clean: 0.1,
};

/**
 * Calibrate one lambda per regime on unlabeled entropies grouped by regime.
 * Regimes missing from the unlabeled sample fall back to the global lambda.
 */
export function calibrateLambdaByRegime(
  unlabeled: EntropyGame[],
  epsilons: Record<EntropyRegime, number>,
  globalEpsilon: number,
): { byRegime: Record<EntropyRegime, number>; global: number } {
  const global = calibrateLambda(unlabeled.map((g) => crpsEntropy(g.sigma)), globalEpsilon);
  const byRegime = {} as Record<EntropyRegime, number>;
  (Object.keys(epsilons) as EntropyRegime[]).forEach((r) => {
    const ents = unlabeled.filter((g) => g.regime === r).map((g) => crpsEntropy(g.sigma));
    byRegime[r] = ents.length > 0 ? calibrateLambda(ents, epsilons[r]) : global;
  });
  return { byRegime, global };
}

export interface RejectOutcome {
  /** Achieved rejection rate r_hat on the test window. */
  rejectionRate: number;
  /** Mean unit profit over published games. */
  roi: number;
  /** Mean CRPS over published games. */
  meanCrps: number;
  published: number;
}

/** Evaluate a reject rule on a labeled test window. */
export function evaluateRejectRule(
  games: EntropyGame[],
  reject: (g: EntropyGame) => boolean,
): RejectOutcome {
  const pub = games.filter((g) => !reject(g));
  return {
    rejectionRate: games.length > 0 ? (games.length - pub.length) / games.length : 0,
    roi: pub.length > 0 ? pub.reduce((a, g) => a + g.profit, 0) / pub.length : 0,
    meanCrps:
      pub.length > 0
        ? pub.reduce((a, g) => a + gaussianCrps(g.mu, g.sigma, g.actual), 0) / pub.length
        : 0,
    published: pub.length,
  };
}

/**
 * Gate helper, first clause (verbatim acceptance gate): the plug-in rule
 * achieves |r_hat - epsilon| <= 2pp AND beats the no-gate baseline on
 * published-game ROI by >= 1pp with lower CRPS error.
 */
export function pluginGatePasses(
  plugin: RejectOutcome,
  noGate: RejectOutcome,
  epsilon: number,
): boolean {
  const rateControlled = Math.abs(plugin.rejectionRate - epsilon) <= 0.02;
  const roiWin = plugin.roi - noGate.roi >= 0.01;
  const crpsWin = plugin.meanCrps < noGate.meanCrps;
  return rateControlled && roiWin && crpsWin;
}

/**
 * Gate helper, second clause: adopt the (regime-conditional) entropy
 * criterion if it also beats the 0700 conformal gate's published ROI.
 */
export function entropyCriterionAdopted(
  regimeConditional: RejectOutcome,
  conformalGateRoi: number,
): boolean {
  return regimeConditional.roi > conformalGateRoi;
}
