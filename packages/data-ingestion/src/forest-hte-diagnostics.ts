/**
 * What Makes Forest-Based Heterogeneous Treatment Effect Estimators Work?
 *
 * arXiv:2206.10323v2 · lane:causal_injury · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the paper's CATE ingredient ranking as GSE's default causal recipe: for any binary
 * treatment (short rest, turf, new play-caller) and outcome (EPA/play, win, injury): propensity
 * forest + marginal-mean forest, then a model-based forest on E[Y|x,t] = m-hat(x) + tau(x)(t - pi-
 * hat(x)) with simultaneous prognostic/predictive splits — minimum viable version = treatment-
 * centering only (mob(W-hat)), which captured most of the gain under confounding; Poisson-forest
 * likelihood for injury counts, interval-censored likelihood for games-missed with heaping.
 *
 * ACCEPTANCE GATE: ADOPT the mob(W-hat) implementation iff the semi-synthetic short-rest test shows MSE(tau-hat) <=
 * 1.2x the causal-forest MSE (parity) and >=2x improvement over uncentered mob; otherwise REJECT
 * the custom implementation and use off-the-shelf grf causal forests. The ingredient ranking
 * (treatment-centering mandatory, outcome-centering optional) is adopted as recipe immediately.
 *
 * Ingest role: feature builder (causal-forest HTE diagnostics: honesty, calibration, RATE).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.10323v2" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the mob(W-hat) implementation iff the semi-synthetic short-rest test shows MSE(tau-hat) <=
 * 1.2x the causal-forest MSE (parity) and >=2x improvement over uncentered mob; otherwise REJECT
 * the custom implementation and use off-the-shelf grf causal forests. The ingredient ranking
 * (treatment-centering mandatory, outcome-centering optional) is adopted as recipe immediately.`;

export const CONFIG = {
  enabled: false,
  method: "causal forest diagnostics",
  honesty: "sample splitting",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface HteUnit {
  readonly tauHat: number;
  readonly y: number;
  readonly w: 0 | 1;
  readonly e: number;
}

export function isHteUnit(x: unknown): x is HteUnit {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    isFiniteNumber(o["tauHat"]) &&
    isFiniteNumber(o["y"]) &&
    (o["w"] === 0 || o["w"] === 1) &&
    isFiniteNumber(o["e"]) && (o["e"] as number) > 0 && (o["e"] as number) < 1
  );
}

/** Calibration regression slope of the doubly-robust pseudo-outcome on tauHat. */
export function hteCalibrationSlope(units: readonly unknown[]): { slope: number; intercept: number } | null {
  const v: HteUnit[] = [];
  for (const u of units) if (isHteUnit(u)) v.push(u);
  if (v.length < 2) return null;
  const dr = v.map((u) => {
    const mu1 = u.y;
    const mu0 = u.y;
    return mu1 - mu0 + ((u.w - u.e) / (u.e * (1 - u.e))) * (u.y - (u.w * mu1 + (1 - u.w) * mu0));
  });
  const xs = v.map((u) => u.tauHat);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = dr.reduce((a, b) => a + b, 0) / dr.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += ((xs[i] ?? 0) - mx) * ((dr[i] ?? 0) - my);
    den += ((xs[i] ?? 0) - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

/** RATE / TOC curve: prioritization gain from targeting by tauHat. */
export function rateCurve(units: readonly unknown[], grid: readonly number[]): Array<{ q: number; gain: number }> | null {
  const v: HteUnit[] = [];
  for (const u of units) if (isHteUnit(u)) v.push(u);
  if (v.length === 0 || !grid.every((g) => isFiniteNumber(g) && g > 0 && g <= 1)) return null;
  const sorted = [...v].sort((a, b) => b.tauHat - a.tauHat);
  const ate = v.reduce((s, u) => s + u.tauHat, 0) / v.length;
  return grid.map((q) => {
    const k = Math.max(1, Math.floor(q * sorted.length));
    const top = sorted.slice(0, k);
    const att = top.reduce((s, u) => s + u.tauHat, 0) / top.length;
    return { q, gain: att - ate };
  });
}

/** Honesty check: train/holdout tau correlation. */
export function honestyCorrelation(trainTau: readonly number[], holdTau: readonly number[]): number | null {
  if (trainTau.length !== holdTau.length || trainTau.length < 2) return null;
  if (!trainTau.every(isFiniteNumber) || !holdTau.every(isFiniteNumber)) return null;
  const mx = trainTau.reduce((a, b) => a + b, 0) / trainTau.length;
  const my = holdTau.reduce((a, b) => a + b, 0) / holdTau.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < trainTau.length; i++) {
    num += ((trainTau[i] ?? 0) - mx) * ((holdTau[i] ?? 0) - my);
    dx += ((trainTau[i] ?? 0) - mx) ** 2;
    dy += ((holdTau[i] ?? 0) - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}
