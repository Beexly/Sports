/**
 * GSE Analytics & Projection Methods — a catalog of statistical methods (in-sport
 * and transferred from outside sports) PLUS a small set of executable primitives
 * that fill gaps the repo does not already cover.
 *
 * The repo's `packages/prediction-engine` already ships Elo, Poisson, Shin de-vig,
 * Kelly, CLV, opponent-adjusted ratings, composite scoring, and Brier/ECE
 * calibration. This module does NOT duplicate those. It (1) registers the method
 * landscape with an honest HAVE / GAP marker so the next agent can see what to
 * build, and (2) implements four genuinely-new, dependency-free primitives:
 * ensemble opinion pools, superforecaster extremizing, split-conformal intervals,
 * and isotonic (PAVA) reliability calibration.
 *
 * Companion doc: docs/research/GSE_2026_ANALYTICS_AND_PROJECTION_METHODS.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Method registry
// ─────────────────────────────────────────────────────────────────────────────

export type MethodDomain =
  | "rating"
  | "score_model"
  | "projection"
  | "market"
  | "bankroll"
  | "dfs"
  | "calibration"
  | "ensemble"
  | "uncertainty"
  | "drift"
  | "outside_transfer";

export type MethodMaturity = "have" | "partial" | "gap";
export type MethodDifficulty = "easy" | "medium" | "hard";

export interface AnalyticsMethod {
  readonly id: string;
  readonly name: string;
  readonly domain: MethodDomain;
  readonly summary: string;
  /** What GSE surface/score it improves. */
  readonly gseTranslation: string;
  readonly maturity: MethodMaturity;
  readonly difficulty: MethodDifficulty;
  /** If transferred from outside sports, where it comes from. */
  readonly outsideOrigin?: string;
}

export const ANALYTICS_METHODS: readonly AnalyticsMethod[] = [
  // ── HAVE (already in packages/prediction-engine) ──────────────────────────
  { id: "elo", name: "Elo ratings", domain: "rating", summary: "Iterative team strength from results.", gseTranslation: "Power ratings feeding spreads/totals.", maturity: "have", difficulty: "easy" },
  { id: "poisson", name: "Poisson scoreline model", domain: "score_model", summary: "Goal/point counts as Poisson.", gseTranslation: "Fair totals + win prob.", maturity: "have", difficulty: "medium" },
  { id: "shin_devig", name: "Shin de-vig", domain: "market", summary: "Remove bookmaker margin accounting for insider trading.", gseTranslation: "Market-implied fair probabilities.", maturity: "have", difficulty: "medium" },
  { id: "kelly", name: "Fractional Kelly", domain: "bankroll", summary: "Stake sizing from edge + odds.", gseTranslation: "Disciplined stake guidance.", maturity: "have", difficulty: "easy" },
  { id: "clv", name: "Closing-line value", domain: "market", summary: "Beat-the-close as a skill proxy.", gseTranslation: "Process metric on the Trust Ledger.", maturity: "have", difficulty: "easy" },
  { id: "opp_adjusted", name: "Opponent-adjusted ratings", domain: "rating", summary: "Strength-of-schedule adjusted efficiency.", gseTranslation: "Team efficiency cards.", maturity: "have", difficulty: "medium" },
  { id: "brier_ece", name: "Brier / ECE calibration", domain: "calibration", summary: "Proper scoring + bin error.", gseTranslation: "Calibration health score.", maturity: "have", difficulty: "easy" },
  { id: "composite", name: "Composite weighted signals", domain: "projection", summary: "Weighted blend of signals.", gseTranslation: "Edge engine composite.", maturity: "have", difficulty: "easy" },

  // ── GAP / PARTIAL (build targets) ─────────────────────────────────────────
  { id: "glicko2", name: "Glicko-2 ratings", domain: "rating", summary: "Elo + rating-variance + volatility.", gseTranslation: "Uncertainty-aware power ratings; flags uncertain teams.", maturity: "partial", difficulty: "medium" },
  { id: "dixon_coles", name: "Dixon-Coles", domain: "score_model", summary: "Bivariate-Poisson w/ low-score correction + time decay.", gseTranslation: "Soccer scorelines + correct-score props.", maturity: "partial", difficulty: "hard", outsideOrigin: "Dixon & Coles 1997" },
  { id: "hier_bayes", name: "Bayesian hierarchical / partial pooling", domain: "projection", summary: "Shrink small samples toward group priors.", gseTranslation: "Stable player projections early in season.", maturity: "gap", difficulty: "hard", outsideOrigin: "multilevel models / epidemiology" },
  { id: "log_opinion_pool", name: "Log opinion pool ensemble", domain: "ensemble", summary: "Weighted geometric mean of probabilities.", gseTranslation: "Combine model + market + agent verdicts coherently.", maturity: "partial", difficulty: "easy", outsideOrigin: "forecasting / decision theory" },
  { id: "extremize", name: "Extremizing", domain: "ensemble", summary: "Push averaged forecasts away from 0.5 in log-odds.", gseTranslation: "Sharper combined confidence when forecasters are independent.", maturity: "partial", difficulty: "easy", outsideOrigin: "Good Judgment / superforecasting" },
  { id: "isotonic", name: "Isotonic (PAVA) calibration", domain: "calibration", summary: "Monotone map from raw score to empirical rate.", gseTranslation: "Calibrate confidence without assuming a sigmoid.", maturity: "partial", difficulty: "medium", outsideOrigin: "isotonic regression" },
  { id: "platt", name: "Platt / temperature scaling", domain: "calibration", summary: "Logistic / single-temperature recalibration.", gseTranslation: "Lightweight confidence calibration.", maturity: "partial", difficulty: "easy" },
  { id: "conformal", name: "Split-conformal intervals", domain: "uncertainty", summary: "Distribution-free prediction intervals from residual quantiles.", gseTranslation: "Honest projection ranges (safe/balanced/upside).", maturity: "partial", difficulty: "medium", outsideOrigin: "conformal prediction" },
  { id: "crps", name: "CRPS scoring", domain: "calibration", summary: "Proper score for full predictive distributions.", gseTranslation: "Grade projection distributions, not just point error.", maturity: "partial", difficulty: "medium", outsideOrigin: "weather ensemble forecasting" },
  { id: "kalman_form", name: "State-space / Kalman form tracking", domain: "rating", summary: "Latent form as a smoothed evolving state.", gseTranslation: "In-season form that reacts without overreacting.", maturity: "partial", difficulty: "hard", outsideOrigin: "control theory / epi nowcasting" },
  { id: "psi_drift", name: "Population Stability Index", domain: "drift", summary: "Distribution-shift metric between expected and actual.", gseTranslation: "Detect data/feature drift before it corrupts picks.", maturity: "partial", difficulty: "easy", outsideOrigin: "credit risk scoring" },
  { id: "black_litterman", name: "Black-Litterman style blend", domain: "market", summary: "Blend a market-implied prior with model views by confidence.", gseTranslation: "Principled model+market fusion instead of ad-hoc weights.", maturity: "partial", difficulty: "hard", outsideOrigin: "quant portfolio theory" },
  { id: "shrinkage_cov", name: "Ledoit-Wolf shrinkage covariance", domain: "dfs", summary: "Stable correlation estimates from few samples.", gseTranslation: "Better DFS stacking/correlation under small samples.", maturity: "gap", difficulty: "hard", outsideOrigin: "quant finance" },
  { id: "risk_parity", name: "Risk-parity exposure", domain: "dfs", summary: "Balance risk contribution across positions.", gseTranslation: "DFS portfolio exposure that isn't concentration in disguise.", maturity: "partial", difficulty: "medium", outsideOrigin: "quant finance" },
  { id: "monte_carlo_slate", name: "Monte Carlo slate simulation", domain: "dfs", summary: "Simulate correlated outcomes for lineup EV/variance.", gseTranslation: "Tournament EV + duplication-aware leverage.", maturity: "partial", difficulty: "hard" },
  { id: "aging_curves", name: "Aging curves / Marcel", domain: "projection", summary: "Age + regression-to-mean baselines.", gseTranslation: "Defensible baseline projections.", maturity: "partial", difficulty: "medium", outsideOrigin: "sabermetrics" },
  { id: "matrix_fact", name: "Matrix factorization comps", domain: "projection", summary: "Latent-factor player similarity.", gseTranslation: "Player comps + nearest-neighbor priors.", maturity: "gap", difficulty: "medium", outsideOrigin: "recommender systems" },
  { id: "thompson", name: "Thompson sampling / bandits", domain: "outside_transfer", summary: "Balance explore/exploit across strategies.", gseTranslation: "Pick which model/strategy to trust as evidence accrues.", maturity: "partial", difficulty: "medium", outsideOrigin: "reinforcement learning" },
  { id: "gbm", name: "Gradient boosting (XGBoost/LightGBM)", domain: "projection", summary: "Tabular nonlinear learner.", gseTranslation: "Feature-rich projections where data supports it.", maturity: "gap", difficulty: "medium" },
] as const;

/** Look up a method by id. */
export function getMethod(id: string): AnalyticsMethod | undefined {
  return ANALYTICS_METHODS.find((m) => m.id === id);
}

/** All methods at a given maturity (e.g. the GAP build list). */
export function methodsByMaturity(maturity: MethodMaturity): readonly AnalyticsMethod[] {
  return ANALYTICS_METHODS.filter((m) => m.maturity === maturity);
}

// ─────────────────────────────────────────────────────────────────────────────
// Executable primitives (new — not in packages/prediction-engine)
// ─────────────────────────────────────────────────────────────────────────────

const EPS = 1e-9;
const clamp01 = (p: number): number => (p < EPS ? EPS : p > 1 - EPS ? 1 - EPS : p);

function normalizeWeights(n: number, weights?: readonly number[]): number[] {
  if (!weights || weights.length !== n) return Array(n).fill(1 / Math.max(1, n));
  let sum = 0;
  for (const w of weights) sum += w > 0 ? w : 0;
  if (sum <= 0) return Array(n).fill(1 / Math.max(1, n));
  return weights.map((w) => (w > 0 ? w : 0) / sum);
}

/**
 * Linear opinion pool: weighted arithmetic mean of probabilities. Robust and
 * conservative — good when forecasters share information. Empty → 0.5 (neutral).
 */
export function linearOpinionPool(probs: readonly number[], weights?: readonly number[]): number {
  if (probs.length === 0) return 0.5;
  const w = normalizeWeights(probs.length, weights);
  let acc = 0;
  for (let i = 0; i < probs.length; i++) acc += clamp01(probs[i]!) * w[i]!;
  return acc;
}

/**
 * Log opinion pool: normalized weighted geometric mean for a binary probability.
 * Sharper than the linear pool and the coherent choice when forecasters are more
 * independent. Empty → 0.5.
 */
export function logOpinionPool(probs: readonly number[], weights?: readonly number[]): number {
  if (probs.length === 0) return 0.5;
  const w = normalizeWeights(probs.length, weights);
  let logNum = 0;
  let logDen = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = clamp01(probs[i]!);
    logNum += w[i]! * Math.log(p);
    logDen += w[i]! * Math.log(1 - p);
  }
  const num = Math.exp(logNum);
  const den = Math.exp(logDen);
  return num / (num + den);
}

/**
 * Extremize a combined forecast by pushing it away from 0.5 in log-odds space.
 * `factor > 1` sharpens (justified when the averaged forecasters are independent);
 * `factor = 1` is a no-op. From prediction-tournament research.
 */
export function extremize(p: number, factor = 1.5): number {
  const x = clamp01(p);
  const logit = Math.log(x / (1 - x));
  const sharpened = factor * logit;
  return 1 / (1 + Math.exp(-sharpened));
}

/**
 * Split-conformal half-width: the (1-alpha) quantile of absolute calibration
 * residuals. A point prediction ± this half-width is a distribution-free interval
 * with ~(1-alpha) coverage. Empty residuals → 0.
 */
export function splitConformalHalfWidth(residuals: readonly number[], alpha = 0.1): number {
  const n = residuals.length;
  if (n === 0) return 0;
  const abs = residuals.map((r) => Math.abs(r)).sort((a, b) => a - b);
  // Conformal rank: ceil((n+1)(1-alpha)); clamp into [1, n].
  const rank = Math.min(n, Math.max(1, Math.ceil((n + 1) * (1 - alpha))));
  return abs[rank - 1]!;
}

export interface ReliabilityCalibration {
  /** Bin upper edges in (0,1]; rates[i] is the calibrated probability for that bin. */
  readonly edges: readonly number[];
  readonly rates: readonly number[];
}

/**
 * Fit an isotonic (monotone non-decreasing) reliability map via pool-adjacent-
 * violators (PAVA) over equal-width bins. Turns raw model scores into calibrated
 * probabilities without assuming a parametric (sigmoid) shape. Returns a step
 * function consumable by {@link applyReliabilityCalibration}.
 */
export function fitReliabilityCalibration(
  points: ReadonlyArray<{ p: number; y: 0 | 1 }>,
  nBins = 10,
): ReliabilityCalibration {
  const bins = Math.max(2, nBins);
  const sum = Array(bins).fill(0) as number[];
  const cnt = Array(bins).fill(0) as number[];
  for (const { p, y } of points) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(clamp01(p) * bins)));
    sum[idx]! += y;
    cnt[idx]! += 1;
  }
  // Per-bin empirical rate (carry the last seen rate forward across empty bins so
  // the monotone fit has a value everywhere), then enforce non-decreasing via PAVA.
  const rawRate: number[] = [];
  const rawWeight: number[] = [];
  let last = 0;
  for (let i = 0; i < bins; i++) {
    if (cnt[i]! > 0) last = sum[i]! / cnt[i]!;
    rawRate.push(last);
    rawWeight.push(Math.max(cnt[i]!, EPS));
  }
  const monotone = isotonicByBin(rawRate, rawWeight);
  const edges = Array.from({ length: bins }, (_, i) => (i + 1) / bins);
  return { edges, rates: monotone };
}

/** Per-bin isotonic (PAVA) over an ordered rate array with weights. */
function isotonicByBin(values: readonly number[], weights: readonly number[]): number[] {
  const blocks: { rate: number; weight: number; size: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    let cur = { rate: values[i]!, weight: weights[i]!, size: 1 };
    while (blocks.length > 0 && blocks[blocks.length - 1]!.rate > cur.rate) {
      const prev = blocks.pop()!;
      const w = prev.weight + cur.weight;
      cur = { rate: (prev.rate * prev.weight + cur.rate * cur.weight) / w, weight: w, size: prev.size + cur.size };
    }
    blocks.push(cur);
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.size; k++) out.push(b.rate);
  return out;
}

/** Apply a fitted reliability map to a raw score → calibrated probability. */
export function applyReliabilityCalibration(cal: ReliabilityCalibration, p: number): number {
  const x = clamp01(p);
  for (let i = 0; i < cal.edges.length; i++) {
    if (x <= cal.edges[i]!) return cal.rates[i] ?? x;
  }
  return cal.rates[cal.rates.length - 1] ?? x;
}
