/**
 * Building an NCAA mens basketball predictive model and quantifying its success
 *
 * arXiv:1412.0248v1 · lane:win_spread_total · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add a spread-calibrated market leg to the GSE ensemble: fit logit(P(home win)) = beta_0 +
 * beta_1*(de-vigged spread-implied probability) on 2010-2024 NFL games as the market leg alongside
 * the efficiency/model leg, grid-search the market-vs-model weight on past seasons' log-loss walk-
 * forward (re-tuned annually), and replicate the paper's skill-vs-luck season simulation under the
 * engine's own probabilities to publish the 'even perfect probabilities only win X% of the time'
 * figure for pick-product expectation-setting.
 *
 * ACCEPTANCE GATE: ADOPT the spread-calibrated market leg + tuned ensemble weights if the walk-forward shows the
 * tuned ensemble beats both standalone legs on log-loss in >=6 of 9 held-out seasons with no
 * season worse by >0.01.
 *
 * Ingest role: feature builder (market leg for the GSE ensemble + skill-vs-luck simulator).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1412.0248v1" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the spread-calibrated market leg + tuned ensemble weights if the walk-forward shows the
 * tuned ensemble beats both standalone legs on log-loss in >=6 of 9 held-out seasons with no
 * season worse by >0.01.`;

export const CONFIG = { enabled: false, minSeasonsBetter: 6, heldOutSeasons: 9, maxSeasonRegression: 0.01 } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** De-vig a two-way decimal-odds pair to a fair home-win probability. */
export function devigHomeProb(homeDec: number, awayDec: number): number | null {
  if (!isFiniteNumber(homeDec) || !isFiniteNumber(awayDec) || homeDec <= 1 || awayDec <= 1) return null;
  const pH = 1 / homeDec;
  const pA = 1 / awayDec;
  const s = pH + pA;
  if (s === 0) return null;
  return pH / s;
}

function logit(p: number): number | null {
  if (!isFiniteNumber(p) || p <= 0 || p >= 1) return null;
  return Math.log(p / (1 - p));
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** logit(P(home win)) = beta_0 + beta_1 * logit(de-vigged spread-implied prob). */
export function logitMarketProb(spreadImpliedP: number, beta0: number, beta1: number): number | null {
  const l = logit(spreadImpliedP);
  if (l === null || !isFiniteNumber(beta0) || !isFiniteNumber(beta1)) return null;
  return sigmoid(beta0 + beta1 * l);
}

/** Blend market leg with the efficiency/model leg at weight w (market weight). */
export function blendLegs(pMarket: number, pModel: number, wMarket: number): number | null {
  if (![pMarket, pModel, wMarket].every(isFiniteNumber)) return null;
  if (pMarket < 0 || pMarket > 1 || pModel < 0 || pModel > 1 || wMarket < 0 || wMarket > 1) return null;
  return wMarket * pMarket + (1 - wMarket) * pModel;
}

/** Binary log-loss. */
export function logLoss(ps: readonly number[], ys: readonly number[]): number | null {
  if (ps.length !== ys.length || ps.length === 0) return null;
  let s = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = Math.min(Math.max(ps[i] ?? 0.5, 1e-9), 1 - 1e-9);
    const y = ys[i];
    if (y !== 0 && y !== 1) return null;
    s += (y === 1 ? -Math.log(p) : -Math.log(1 - p));
  }
  return s / ps.length;
}

/** Grid-search the market-vs-model weight on walk-forward log-loss. */
export function gridSearchMarketWeight(
  pMarket: readonly number[],
  pModel: readonly number[],
  ys: readonly number[],
  grid: readonly number[] = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
): number | null {
  let best: number | null = null;
  let bestLoss = Infinity;
  for (const w of grid) {
    const blended: number[] = [];
    let ok = true;
    for (let i = 0; i < pMarket.length; i++) {
      const b = blendLegs(pMarket[i] ?? 0.5, pModel[i] ?? 0.5, w);
      if (b === null) {
        ok = false;
        break;
      }
      blended.push(b);
    }
    if (!ok) continue;
    const ll = logLoss(blended, ys);
    if (ll !== null && ll < bestLoss) {
      bestLoss = ll;
      best = w;
    }
  }
  return best;
}

/** Season-simulation: expected win rate of a perfect-probability picker (expectation-setting). */
export function perfectPickerWinRate(probs: readonly number[]): number | null {
  if (probs.length === 0 || !probs.every((p) => isFiniteNumber(p) && p >= 0 && p <= 1)) return null;
  const s = probs.reduce((a, p) => a + Math.max(p, 1 - p), 0);
  return s / probs.length;
}
