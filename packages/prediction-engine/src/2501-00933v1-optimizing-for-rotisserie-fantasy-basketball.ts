/**
 * arXiv:2501.00933v1 — Optimizing for Rotisserie Fantasy Basketball
 *
 * Tournament-objective DFS mode: adaptive payline distribution conditional on slate features, maximizing
 * E_payline[Phi((mu-payline)/sigma)] by Gauss-Hermite quadrature so high-total slates build the variance
 * they need.
 *
 * Improvement: Add a tournament-objective mode to the weekly DFS pipeline that replaces the fixed historical payline with an adaptive payline distribution conditional on slate features (total, pace, chalk ownership), maximizing E_payline[Φ((µ−payline)/σ)] by quadrature so high-total shootout slates build the variance they need.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the GPP objective into the weekly DFS pipeline only if, on the 2024 17-week backtest, tournament-objective lineups beat max-expectation lineups by ≥ 5 pp in cash rate AND the top-1% hit rate is not worse.
 */

/** Gauss-Hermite nodes/weights (5-point) for E[f] under N(0,1). */
const GH_X = [-2.020182870456086, -0.958572464613819, 0, 0.958572464613819, 2.020182870456086];
const GH_W = [0.019953242059045, 0.393619323152241, 0.945308720482942, 0.393619323152241, 0.019953242059045];

/** Standard normal CDF (Abramowitz-Stegun). */
export function phiStd(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-0.5 * x * x);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
}

/**
 * Tournament objective: E over the adaptive payline distribution of the cash
 * probability Phi((mu - payline)/sigma). Payline ~ N(payMean, paySd).
 */
export function tournamentObjective(
  mu: number,
  sigma: number,
  payMean: number,
  paySd: number,
): number {
  if (sigma <= 0 || paySd < 0) throw new Error("tournamentObjective: sigma > 0, paySd >= 0");
  let total = 0;
  for (let i = 0; i < GH_X.length; i++) {
    const payline = payMean + Math.SQRT2 * paySd * (GH_X[i] ?? 0);
    total += (GH_W[i] ?? 0) * phiStd((mu - payline) / sigma);
  }
  return total / Math.sqrt(Math.PI);
}

/**
 * Adaptive payline moments conditional on slate features:
 * payMean = a0 + a1*total + a2*pace + a3*chalk; paySd likewise.
 */
export function adaptivePayline(
  slate: { total: number; pace: number; chalk: number },
  coefMean: readonly [number, number, number, number],
  coefSd: readonly [number, number, number, number],
): { payMean: number; paySd: number } {
  const dot = (c: readonly [number, number, number, number]) =>
    c[0] + c[1] * slate.total + c[2] * slate.pace + c[3] * slate.chalk;
  return { payMean: dot(coefMean), paySd: Math.max(1e-6, dot(coefSd)) };
}
