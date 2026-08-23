/**
 * Team-only forward MLB totals predictor (T01 / Path B).
 *
 * Pre-registration: docs/ops/edge/2026-08-2x-prereg-team-only-forward.md
 * Frozen-hash manifest: scripts/edge-lab/freeze-team-only-hash.mjs
 *
 * ONLY the formula below. No I/O, no env, no feature flags. PURE.
 *
 * Estimator family: Efron–Morris shrinkage on log totals.
 *   theta_i = Xbar + (1 - B_i)(X_i - Xbar)
 * where B_i weights the GRAND mean (not the data). The H-F5 cycle used
 * `mve-model-js.ts` and was KILLed (n=100, E=0.0204). This is a DISTINCT
 * module / DISTINCT forward window. Do NOT import NbRbpf (the R-9 shadow
 * engine); reuse only the exported `logNbPmf` for the NB2 tail.
 *
 * qOver = P(Y > line | mu, phi=12), mu = exp((theta_home + theta_away)/2).
 * Line is the ENTRY total, never close.
 */

import { logNbPmf } from "./nb-rbpf.js";

export const MVE_TO_PHI = 12;
export const MVE_TO_C = 1.5;
export const MVE_TO_POOLED_VAR_FALLBACK = 0.04;

/** log(y + 0.5) */
function logShift(y: number): number {
  return Math.log(y + 0.5);
}

/**
 * Bessel sample variance (denom n-1) of game-level log(y+0.5) values.
 * Returns MVE_TO_POOLED_VAR_FALLBACK when fewer than 8 games league-wide.
 */
function pooledVariance(logShiftGames: readonly number[], fallback: number): number {
  const n = logShiftGames.length;
  if (n < 8) return fallback;
  const mean = logShiftGames.reduce((a, b) => a + b, 0) / n;
  let ss = 0;
  for (const v of logShiftGames) {
    const d = v - mean;
    ss += d * d;
  }
  return ss / (n - 1);
}

/**
 * Efron–Morris shrinkage of team-level log-mean estimates toward the grand mean.
 *
 *   X_i  = mean of log(y_g + 0.5) over team i's past games (y = home+away)
 *          (if n_i = 0, theta_i = Xbar and B_i = 1)
 *   Xbar = unweighted mean of the k team-level X_i (k = teams with n_i >= 1)
 *   s^2  = Bessel variance of all game-level log(y+0.5); fallback if <8 games
 *   D_i  = s^2 / n_i
 *   k    = teams with n_i >= 1
 *   A_hat = max(0, (sum_i (X_i - Xbar)^2 - sum_i D_i) / k)
 *   B_i  = D_i / (A_hat + D_i); denom 0 -> B_i = 1  (weights GRAND mean)
 *   theta_i = Xbar + (1 - B_i)(X_i - Xbar)        (NOT Xbar + B_i*(X_i-Xbar))
 *
 * Limited translation: delta = B_i*(X_i-Xbar); theta = X_i - delta;
 *   if |delta| > c*sqrt(D_i) -> delta = sign(delta)*c*sqrt(D_i), c = MVE_TO_C.
 *
 * k < 3 -> identity (theta_i = X_i; n=0 -> Xbar). A_hat floors at 0.
 * No Math.random / Date.
 */
export function shrinkLogMeans(
  units: readonly { id: string; x: number; n: number }[],
  pooledVar: number,
): ReadonlyMap<string, number> {
  // Partition teams with data from teams without (n_i >= 1 vs n_i == 0).
  const seen: { id: string; x: number; n: number }[] = [];
  const zeros: { id: string }[] = [];
  for (const u of units) {
    if (u.n >= 1) seen.push({ id: u.id, x: u.x, n: u.n });
    else zeros.push({ id: u.id });
  }

  const k = seen.length;
  const result = new Map<string, number>();

  // No shrinkage when k < 3; n=0 units still get Xbar.
  if (k < 3) {
    let xbar = 0;
    if (k > 0) {
      let sx = 0;
      for (const s of seen) sx += s.x;
      xbar = sx / k;
    }
    for (const s of seen) result.set(s.id, s.x);
    for (const z of zeros) result.set(z.id, xbar);
    return result;
  }

  // Grand mean = unweighted mean of the k team-level X_i.
  let sumX = 0;
  for (const s of seen) sumX += s.x;
  const xbar = sumX / k;

  let sumSq = 0;
  let sumD = 0;
  const dVals: number[] = [];
  for (const s of seen) {
    const d = pooledVar / s.n;
    dVals.push(d);
    const dev = s.x - xbar;
    sumSq += dev * dev;
    sumD += d;
  }

  const aHat = Math.max(0, (sumSq - sumD) / k);

  for (let i = 0; i < k; i++) {
    const s = seen[i]!;
    const d = dVals[i]!;
    const denom = aHat + d;
    const b = denom > 0 ? d / denom : 1; // B_i weights grand mean
    const delta = b * (s.x - xbar);
    const cap = MVE_TO_C * Math.sqrt(d);
    let theta: number;
    if (Math.abs(delta) > cap) {
      // Limited translation: clamp delta, theta = X_i - delta_clamped.
      const clamped = (delta >= 0 ? 1 : -1) * cap;
      theta = s.x - clamped;
    } else {
      theta = xbar + (1 - b) * (s.x - xbar); // = X_i - delta
    }
    result.set(s.id, theta);
  }

  // n=0 units: theta_i = Xbar, B_i = 1 (grand mean).
  for (const z of zeros) result.set(z.id, xbar);

  return result;
}

/**
 * P(Y > line) for a single game given past games.
 *
 * Past games are {homeId, awayId, y} where y = combined home+away total.
 * We aggregate per-team: X_i = mean of log(y+0.5) over all of team i's games,
 * n_i = count. pooledVar = Bessel variance over all game-level log(y+0.5)
 * (fallback when <8 games league-wide). Then:
 *   mu = exp((theta_home + theta_away)/2), qOver = P(Y>line|mu, phi=12) via NB2 tail.
 *
 * `line` is the ENTRY total. qOverFromPast never reads a future y.
 */
export function qOverFromPast(input: {
  homeId: string;
  awayId: string;
  line: number;
  past: readonly { homeId: string; awayId: string; y: number }[];
}): number {
  const past = input.past;
  const gameShifts: number[] = [];
  const byId = new Map<string, { sum: number; n: number }>();

  const touch = (id: string) => {
    let acc = byId.get(id);
    if (!acc) {
      acc = { sum: 0, n: 0 };
      byId.set(id, acc);
    }
    return acc;
  };

  for (const g of past) {
    const v = logShift(g.y);
    gameShifts.push(v);
    touch(g.homeId).sum += v;
    touch(g.homeId).n += 1;
    touch(g.awayId).sum += v;
    touch(g.awayId).n += 1;
  }

  const units: { id: string; x: number; n: number }[] = [];
  for (const [id, acc] of byId) {
    units.push({ id, x: acc.sum / acc.n, n: acc.n });
  }

  const pooled = pooledVariance(gameShifts, MVE_TO_POOLED_VAR_FALLBACK);
  const theta = shrinkLogMeans(units, pooled);

  const thetaHome = theta.get(input.homeId);
  const thetaAway = theta.get(input.awayId);
  if (thetaHome == null || thetaAway == null) return 0.5;

  const mu = Math.exp((thetaHome + thetaAway) / 2);
  if (!Number.isFinite(mu) || mu <= 0) return 0.5;

  // NB2 tail P(Y > line): 1 - CDF(0..floor(line)).
  let cdf = 0;
  const limit = Math.floor(input.line);
  for (let y = 0; y <= limit; y++) {
    const lp = logNbPmf(y, mu, MVE_TO_PHI);
    cdf += Math.exp(lp);
  }
  if (!Number.isFinite(cdf)) return 0.5;
  return Math.min(1 - 1e-6, Math.max(1e-6, 1 - cdf));
}
