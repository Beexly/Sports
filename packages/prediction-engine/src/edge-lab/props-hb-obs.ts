/**
 * Observation-process layer for the hierarchical-Bayes props specialist.
 *
 * Nested pooling (#509 / props-hb-nested) answers *who to shrink toward*.
 * This module answers *how the likelihood is allowed to speak* — the count
 * process itself. Mined from the second Gamma-Poisson corpus; every routine
 * is closed-form, deterministic, no MCMC, no market/spread field.
 *
 *  1. Mean-dependent overdispersion (const-ae/glmGamPoi, NB2 / edgeR).
 *     Per-game Var(X) = μ + α μ²  ⇔  quasi-likelihood φ(μ) = 1 + α μ.
 *     Global φ (the 1/n extra-Poisson factor) treats TDs (μ ≈ 0.4) and
 *     receptions (μ ≈ 5) as equally over-dispersed. They are not. Family
 *     is chosen by weighted RSS among Poisson / constant-φ QL / NB2, with
 *     a parsimony gate so we do not invent φ from noise.
 *
 *  2. Shrunken quasi-likelihood φ (glmGamPoi / DESeq2). A 4-player TE group
 *     must not be allowed a wild φ; shrink toward 1 (or a supplied prior)
 *     with residual degrees of freedom.
 *
 *  3. fishHook idcap — cap one game's contribution before pooling so a
 *     single 5-TD explosion does not own a 3-game sample.
 *
 *  4. Recency / time-varying intensity (aschein/pgds dynamical PG; aturchetta
 *     tPG B-spline rates). Exponential decay is the closed-form analog of a
 *     known time-varying intensity up to a scalar; we do not fit B-splines.
 *
 *  5. Regime-shift band (xiaohuJemi radiation Poisson fluctuation bands).
 *     If a recent window is in the career posterior-predictive tail, the
 *     career shrink is the wrong background — flag it, do not silently pool.
 *
 *  6. Expected excess E[(X − line)+] (vivekrajsingh04 Gamma-Poisson CVaR
 *     of a count process). P(over) is the fire probability; expected surplus
 *     is how wrong the line is in count space.
 *
 * fishHook's other load-bearing idea — exposure is opportunity, not calendar
 * games — is already the RateSample contract: pass targets/routes/snaps as
 * `games`. This module does not rename that field.
 *
 * Not copied: glmGamPoi IRLS, tPG nloptr/B-splines, pgds Gibbs, traffic NUTS,
 * Nadeesha 10k posterior draws, duckLM SQL GLM (GSE already has Tweedie).
 *
 * Pure, no I/O.
 */

import { posteriorRate, probOver, type GammaPosterior, type GammaPrior, type RateSample } from "./props-hb.js";

export type CountFamily = "poisson" | "ql" | "nb2";

export interface MeanVarianceFit {
  readonly family: CountFamily;
  readonly pooledMean: number;
  readonly talentVar: number;
  /** Constant QL extra-Poisson factor (1 for Poisson). */
  readonly phi: number;
  /** NB2 per-game overdispersion α in Var(X) = μ + α μ² (0 unless family=nb2). */
  readonly alpha: number;
  readonly rss: { readonly poisson: number; readonly ql: number; readonly nb2: number };
  readonly playerCount: number;
}

export interface GameCount {
  readonly total: number;
}

/** Per-player game log — glmGamPoi identifies φ(μ) from cell-level variance, not from (games, total) aggregates. */
export interface PlayerGameLog {
  readonly games: readonly GameCount[];
}

export interface GameLogOptions {
  /** Exponential decay on older games; 1 = equal weight. (0, 1]. */
  readonly decay?: number;
  /** fishHook-style cap on events credited to any single game. */
  readonly cap?: number;
}

export type RegimeDirection = "high" | "low" | "none";

export interface RegimeShift {
  readonly direction: RegimeDirection;
  readonly pHigh: number;
  readonly pLow: number;
  readonly tail: number;
}

const MIN_PHI = 0.25;
const MAX_PHI = 16;
const MIN_FAMILY_PLAYERS = 8;
const REL_IMPROVE = 0.05;
const DEFAULT_PRIOR_DF = 10;
const EXCESS_SURVIVAL_EPS = 1e-15;
const MAX_EXCESS_TERMS = 10_000;

function assertSample(p: RateSample, label: string): void {
  if (!Number.isFinite(p.games) || !Number.isFinite(p.total)) {
    throw new RangeError(`${label}: games and total must be finite (got games=${p.games}, total=${p.total})`);
  }
  if (p.games <= 0) {
    throw new RangeError(`${label}: games must be > 0 (got games=${p.games})`);
  }
  if (p.total < 0) {
    throw new RangeError(`${label}: total must be >= 0 (got total=${p.total})`);
  }
}

function clampPhi(phi: number): number {
  if (!Number.isFinite(phi) || phi <= 0) {
    throw new RangeError(`φ must be finite and > 0 (got ${phi})`);
  }
  return Math.min(MAX_PHI, Math.max(MIN_PHI, phi));
}

function pooledMean(samples: readonly RateSample[]): number {
  let g = 0;
  let t = 0;
  for (const p of samples) {
    g += p.games;
    t += p.total;
  }
  return t / g;
}

function weightedOls(
  xs: readonly number[],
  ys: readonly number[],
  ws: readonly number[],
): { intercept: number; slope: number } | null {
  if (xs.length < 2 || xs.length !== ys.length || xs.length !== ws.length) return null;
  let sw = 0;
  let swx = 0;
  let swy = 0;
  let swxx = 0;
  let swxy = 0;
  for (let i = 0; i < xs.length; i++) {
    const w = ws[i] as number;
    const x = xs[i] as number;
    const y = ys[i] as number;
    if (!(w > 0) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    sw += w;
    swx += w * x;
    swy += w * y;
    swxx += w * x * x;
    swxy += w * x * y;
  }
  const denom = sw * swxx - swx * swx;
  if (!(Math.abs(denom) > 1e-18) || !(sw > 0)) return null;
  const slope = (sw * swxy - swx * swy) / denom;
  const intercept = (swy - slope * swx) / sw;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  return { intercept, slope };
}

function weightedRss(ys: readonly number[], pred: readonly number[], ws: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < ys.length; i++) {
    const r = (ys[i] as number) - (pred[i] as number);
    s += (ws[i] as number) * r * r;
  }
  return s;
}

function poissonPlugin(samples: readonly RateSample[]): MeanVarianceFit {
  const n = samples.length;
  const m = pooledMean(samples);
  return {
    family: "poisson",
    pooledMean: m,
    talentVar: 0,
    phi: 1,
    alpha: 0,
    rss: { poisson: Number.POSITIVE_INFINITY, ql: Number.POSITIVE_INFINITY, nb2: Number.POSITIVE_INFINITY },
    playerCount: n,
  };
}

/**
 * Fit Poisson vs constant-φ QL vs NB2 (Var = μ + α μ² per game) by weighted
 * RSS of (rate − m)² against 1/games. Upgrade Poisson → QL → NB2 only when
 * RSS drops by at least {@link REL_IMPROVE}.
 */
export function fitMeanVariance(playerRates: readonly RateSample[]): MeanVarianceFit | null {
  if (playerRates.length === 0) return null;
  for (const p of playerRates) assertSample(p, "fitMeanVariance");
  if (playerRates.length < MIN_FAMILY_PLAYERS) return poissonPlugin(playerRates);

  const m = pooledMean(playerRates);
  if (!(m > 0)) return poissonPlugin(playerRates);

  const ys = playerRates.map((p) => {
    const r = p.total / p.games;
    return (r - m) * (r - m);
  });
  const xs = playerRates.map((p) => 1 / p.games);
  const ws = playerRates.map((p) => p.games);

  const z = ys.map((y, i) => y - m * (xs[i] as number));
  let tauPois = 0;
  let wSum = 0;
  for (let i = 0; i < z.length; i++) {
    tauPois += (ws[i] as number) * (z[i] as number);
    wSum += ws[i] as number;
  }
  tauPois = Math.max(0, tauPois / wSum);
  const predPois = xs.map((x) => tauPois + m * x);
  const rssPois = weightedRss(ys, predPois, ws);

  const ql = weightedOls(xs, ys, ws);
  let rssQl = Number.POSITIVE_INFINITY;
  let tauQl = tauPois;
  let phi = 1;
  if (ql && ql.slope > 0) {
    tauQl = Math.max(0, ql.intercept);
    phi = clampPhi(ql.slope / m);
    const predQl = xs.map((x) => tauQl + phi * m * x);
    rssQl = weightedRss(ys, predQl, ws);
  }

  const xNb = xs.map((x) => (m * m) * x);
  const nb = weightedOls(xNb, z, ws);
  let rssNb = Number.POSITIVE_INFINITY;
  let tauNb = tauPois;
  let alpha = 0;
  if (nb && nb.slope > 0) {
    tauNb = Math.max(0, nb.intercept);
    alpha = nb.slope;
    const predNb = xs.map((x) => tauNb + (m + alpha * m * m) * x);
    rssNb = weightedRss(ys, predNb, ws);
  }

  const rss = { poisson: rssPois, ql: rssQl, nb2: rssNb };
  const n = playerRates.length;

  if (Number.isFinite(rssNb) && rssNb <= rssQl * (1 - REL_IMPROVE) && rssNb <= rssPois * (1 - REL_IMPROVE) && alpha > 0) {
    return { family: "nb2", pooledMean: m, talentVar: tauNb, phi: 1, alpha, rss, playerCount: n };
  }
  if (Number.isFinite(rssQl) && rssQl <= rssPois * (1 - REL_IMPROVE) && Math.abs(phi - 1) > 1e-6) {
    return { family: "ql", pooledMean: m, talentVar: tauQl, phi, alpha: 0, rss, playerCount: n };
  }
  return { family: "poisson", pooledMean: m, talentVar: tauPois, phi: 1, alpha: 0, rss, playerCount: n };
}

const MIN_GAMES_FOR_VAR = 3;

/**
 * glmGamPoi mean-variance trend from per-game logs. Player i contributes
 * φ̂_i = Var(game totals) / mean, which is 1 under Poisson, a constant under
 * QL, and 1 + α μ_i under per-game NB2. Aggregated (games, total) pairs
 * cannot separate those last two; cell-level variance can.
 */
export function fitMeanVarianceFromGameLogs(players: readonly PlayerGameLog[]): MeanVarianceFit | null {
  if (players.length === 0) return null;
  const rows: { mu: number; phi: number; w: number }[] = [];
  let pooledT = 0;
  let pooledG = 0;
  for (const p of players) {
    if (p.games.length < MIN_GAMES_FOR_VAR) continue;
    let sum = 0;
    for (const g of p.games) {
      assertGame(g, "fitMeanVarianceFromGameLogs");
      sum += g.total;
    }
    const n = p.games.length;
    const mu = sum / n;
    if (!(mu > 0)) continue;
    let ss = 0;
    for (const g of p.games) ss += (g.total - mu) * (g.total - mu);
    const v = ss / (n - 1);
    rows.push({ mu, phi: v / mu, w: n });
    pooledT += sum;
    pooledG += n;
  }
  if (rows.length < MIN_FAMILY_PLAYERS) {
    return pooledG > 0 ? poissonPlugin([{ games: pooledG, total: pooledT }]) : null;
  }

  const m = pooledT / pooledG;
  const poissonRss = rows.reduce((s, r) => s + r.w * (r.phi - 1) * (r.phi - 1), 0);
  let wPhi = 0;
  let wSum = 0;
  for (const r of rows) {
    wPhi += r.w * r.phi;
    wSum += r.w;
  }
  const phiBar = wPhi / wSum;
  const qlRss = rows.reduce((s, r) => {
    const d = r.phi - phiBar;
    return s + r.w * d * d;
  }, 0);

  let num = 0;
  let den = 0;
  for (const r of rows) {
    num += r.w * (r.phi - 1) * r.mu;
    den += r.w * r.mu * r.mu;
  }
  const alpha = den > 0 ? num / den : 0;
  const nbRss =
    alpha > 0
      ? rows.reduce((s, r) => {
          const d = r.phi - (1 + alpha * r.mu);
          return s + r.w * d * d;
        }, 0)
      : Number.POSITIVE_INFINITY;

  const rss = { poisson: poissonRss, ql: qlRss, nb2: nbRss };
  const n = rows.length;
  if (Number.isFinite(nbRss) && nbRss <= qlRss * (1 - REL_IMPROVE) && nbRss <= poissonRss * (1 - REL_IMPROVE) && alpha > 0) {
    return { family: "nb2", pooledMean: m, talentVar: 0, phi: 1, alpha, rss, playerCount: n };
  }
  if (qlRss <= poissonRss * (1 - REL_IMPROVE) && Math.abs(phiBar - 1) > 1e-6) {
    return {
      family: "ql",
      pooledMean: m,
      talentVar: 0,
      phi: clampPhi(phiBar),
      alpha: 0,
      rss,
      playerCount: n,
    };
  }
  return { family: "poisson", pooledMean: m, talentVar: 0, phi: 1, alpha: 0, rss, playerCount: n };
}

/** Quasi-likelihood φ at mean μ under the fitted family. */
export function phiForMean(fit: MeanVarianceFit, mu: number): number {
  if (!Number.isFinite(mu) || mu < 0) {
    throw new RangeError(`phiForMean: mu must be finite and >= 0 (got ${mu})`);
  }
  if (fit.family === "poisson") return 1;
  if (fit.family === "ql") return fit.phi;
  return clampPhi(1 + fit.alpha * mu);
}

/**
 * glmGamPoi / DESeq2 shrunken QL: (df · φ̂ + priorDf · priorφ) / (df + priorDf).
 * df = 0 returns the prior; large df returns φ̂.
 */
export function shrinkQuasiLikelihood(
  phiHat: number,
  df: number,
  priorPhi: number = 1,
  priorDf: number = DEFAULT_PRIOR_DF,
): number {
  const hat = clampPhi(phiHat);
  const prior = clampPhi(priorPhi);
  if (!Number.isFinite(df) || df < 0) {
    throw new RangeError(`shrinkQuasiLikelihood: df must be finite and >= 0 (got ${df})`);
  }
  if (!Number.isFinite(priorDf) || priorDf < 0) {
    throw new RangeError(`shrinkQuasiLikelihood: priorDf must be finite and >= 0 (got ${priorDf})`);
  }
  const den = df + priorDf;
  if (!(den > 0)) return prior;
  return clampPhi((df * hat + priorDf * prior) / den);
}

export function scaleObservation(
  total: number,
  games: number,
  phi: number,
): { readonly total: number; readonly games: number } {
  const p = clampPhi(phi);
  if (!Number.isFinite(total) || !Number.isFinite(games) || total < 0 || games < 0) {
    throw new RangeError(
      `scaleObservation: total/games must be finite and >= 0 (got total=${total}, games=${games})`,
    );
  }
  return { total: total / p, games: games / p };
}

export function posteriorRateObs(
  prior: GammaPrior,
  playerTotal: number,
  playerGames: number,
  phi: number = 1,
): GammaPosterior {
  const scaled = scaleObservation(playerTotal, playerGames, phi);
  return posteriorRate(prior, scaled.total, scaled.games);
}

/** Score a player with φ(μ) from the fitted family (μ = raw rate, or prior mean at 0 games). */
export function posteriorRateMeanVar(
  prior: GammaPrior,
  playerTotal: number,
  playerGames: number,
  fit: MeanVarianceFit,
): GammaPosterior {
  const mu = playerGames > 0 ? playerTotal / playerGames : prior.alpha / prior.beta;
  const phi = phiForMean(fit, mu);
  return posteriorRateObs(prior, playerTotal, playerGames, phi);
}

// ── fishHook idcap + tPG/pgds recency ─────────────────────────────────────

function assertGame(g: GameCount, label: string): void {
  if (!Number.isFinite(g.total) || g.total < 0) {
    throw new RangeError(`${label}: game total must be finite and >= 0 (got ${g.total})`);
  }
}

/** Cap each game's credited events (fishHook idcap). */
export function capGameLog(games: readonly GameCount[], cap: number): GameCount[] {
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new RangeError(`capGameLog: cap must be finite and > 0 (got ${cap})`);
  }
  return games.map((g) => {
    assertGame(g, "capGameLog");
    return { total: Math.min(g.total, cap) };
  });
}

/**
 * Exponential recency weights, oldest-first. Most recent game has weight 1;
 * a game k steps back has weight decay^k. decay = 1 is equal weighting.
 */
export function discountGameLog(gamesOldestFirst: readonly GameCount[], decay: number): RateSample {
  if (!(Number.isFinite(decay) && decay > 0 && decay <= 1)) {
    throw new RangeError(`discountGameLog: decay must be in (0, 1] (got ${decay})`);
  }
  if (gamesOldestFirst.length === 0) {
    throw new RangeError("discountGameLog: need at least one game");
  }
  const T = gamesOldestFirst.length;
  let total = 0;
  let exposure = 0;
  for (let t = 0; t < T; t++) {
    const g = gamesOldestFirst[t] as GameCount;
    assertGame(g, "discountGameLog");
    const w = Math.pow(decay, T - 1 - t);
    total += w * g.total;
    exposure += w;
  }
  return { games: exposure, total };
}

/** Cap then recency-weight a per-game log into a RateSample. */
export function aggregateGameLog(gamesOldestFirst: readonly GameCount[], options: GameLogOptions = {}): RateSample {
  const cap = options.cap;
  const decay = options.decay ?? 1;
  const capped = cap === undefined ? gamesOldestFirst : capGameLog(gamesOldestFirst, cap);
  return discountGameLog(capped, decay);
}

// ── radiation Poisson band: recent window vs career ───────────────────────

/**
 * Two-sided posterior-predictive tail of a recent (games, total) window
 * under a career Gamma posterior. `high` / `low` when the matching tail
 * is below `tail` (default 1%).
 */
export function regimeShift(
  career: GammaPosterior,
  recent: RateSample,
  tail: number = 0.01,
): RegimeShift {
  assertSample(recent, "regimeShift");
  if (!Number.isFinite(tail) || tail <= 0 || tail >= 0.5) {
    throw new RangeError(`regimeShift: tail must be in (0, 0.5) (got ${tail})`);
  }
  const t = recent.total;
  const g = recent.games;
  const pHigh = probOver(career, Math.max(0, t - 1), g);
  const pLow = 1 - probOver(career, t, g);
  let direction: RegimeDirection = "none";
  if (pHigh < tail && pHigh <= pLow) direction = "high";
  else if (pLow < tail) direction = "low";
  return { direction, pHigh, pLow, tail };
}

// ── expected surplus (count-space CVaR building block) ────────────────────

/**
 * Posterior-predictive E[(X − line)+] for a future window of `games`.
 * For integer-valued X, E[(X − m)+] = Σ_{j=m}^∞ P(X > j); a fractional
 * line subtracts frac · P(X > floor(line)).
 */
export function expectedExcess(posterior: GammaPosterior, line: number, games: number = 1): number {
  if (!Number.isFinite(line)) {
    throw new RangeError(`expectedExcess: line must be finite (got ${line})`);
  }
  const mean = posterior.mean * games;
  if (line < 0) return mean - line;

  const m = Math.floor(line);
  const frac = line - m;
  let excessInteger = 0;
  for (let j = m; j < m + MAX_EXCESS_TERMS; j++) {
    const s = probOver(posterior, j, games);
    if (s < EXCESS_SURVIVAL_EPS) break;
    excessInteger += s;
  }
  const overFloor = probOver(posterior, m, games);
  return Math.max(0, excessInteger - frac * overFloor);
}
