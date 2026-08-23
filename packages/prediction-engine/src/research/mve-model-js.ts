/**
 * H-F5 / F-10 MVE — hierarchical outcome model with James-Stein shrinkage.
 *
 * Pre-registered (Amendment v2.1 to docs/ops/edge/2026-08-20-mve-prereg-v2.md,
 * section 3): the hierarchical James-Stein shrunk outcome model that produces
 * q_t. This module REPLACES NbRbpf as the q_t source in the MVE runner — the
 * e-process itself (mve-eprocess.ts) is frozen and untouched.
 *
 * Spec (binding, from the prospective pre-registration):
 *   1. Outcome target: total runs scored in the game (NB2 likelihood).
 *   2. Model form: hierarchical Poisson-log NB2 on total runs.
 *      log(mu_i) = intercept + sum of shrunk group effects.
 *   3. Group features (all pre-game, observable at entry time):
 *      team offense, team defense, starting pitcher, park, weather, umpire,
 *      rest (home), rest (away). Each is a per-unit group parameter.
 *   4. Shrinkage: positive-part James-Stein (Efron-Morris 1975, section 3),
 *      unequal-sample-size variant. Transformations:
 *        - count-rate metrics: Anscombe sqrt, y = sqrt(x + 3/8), Var ~ 1/(4n)
 *        - proportion metrics: arc-sine, y = arcsin(sqrt(p)), Var ~ 1/(4n)
 *      Shrinkage applies only when p >= 3. B_i = D_i/(A_hat + D_i),
 *      D_i = 1/(4 n_i), A_hat = max(0, tau2_hat).
 *   5. Walk-forward: predictOver() reads only unit indices + line, never y.
 *   6. Determinism: identical inputs → identical q_t (no Math.random, no Date).
 *
 * PURE: no fs, no network, no env, no database. No I/O at all.
 */

import type { SyntheticGame } from "./synthetic-nb.js";

/** Frozen NB2 over-dispersion (matches synthetic-nb.ts DEFAULT_DESIGN.phi). */
export const JS_PHI = 12;

/** p >= 3 required for James-Stein shrinkage per prereg section 3.4. */
export const JS_MIN_GROUPS = 3;

/** Hard cap on NB support for the CDF sum. */
export const JS_MAX_Y = 40;

/** Default intercept: log(8.5) — the league-average total in log space. */
const DEFAULT_INTERCEPT = Math.log(8.5);

/**
 * Extended game shape for the James-Stein model. All fields beyond
 * SyntheticGame are optional with sensible defaults so the same object the
 * runner already builds for the synthetic engine works here too.
 */
export interface ModelGame extends SyntheticGame {
  /** Weather category index 0-4 (cold-cool-mild-warm-hot). Default: 2 (mild). */
  readonly weather?: number;
  /** Home team rest days, clamped to 0-6. Default: 3. */
  readonly restHome?: number;
  /** Away team rest days, clamped to 0-6. Default: 3. */
  readonly restAway?: number;
}

/**
 * Sampling variance model for the James-Stein family.
 * For Anscombe-transformed count-rate data: Var(y_i) ~ 1/(4 n_i), so the
 * sampling variance of the mean is D_i = 1/(4 n_i).
 */
function samplingVariance(n: number): number {
  return 1 / (4 * Math.max(n, 1));
}

/**
 * Anscombe square-root transform for count-rate data: y = sqrt(x + 3/8).
 * Stabilizes the variance so Var(y) ~ 1/4 regardless of the rate.
 */
function anscombe(x: number): number {
  return Math.sqrt(x + 3 / 8);
}

/**
 * Inverse Anscombe: x = y^2 - 3/8, floored at 0.
 */
function invAnscombe(y: number): number {
  return Math.max(0, y * y - 3 / 8);
}

/**
 * Arc-sine transform for proportion data: y = arcsin(sqrt(p)).
 * Stabilizes the binomial variance.
 */
function arcsine(p: number): number {
  const pc = Math.max(0, Math.min(1, p));
  return Math.asin(Math.sqrt(pc));
}

/**
 * Inverse arc-sine: p = sin(y)^2.
 */
function invArcsin(y: number): number {
  const s = Math.sin(y);
  return Math.max(0, Math.min(1, s * s));
}

/**
 * Positive-part James-Stein shrinkage of a slate of group-level estimates
 * toward a common (precision-weighted) grand mean. Efron-Morris (1975, sec 3),
 * unequal-sample-size variant.
 *
 * For each group i with estimate theta_i and sampling variance sigma_i^2 = 1/(4 n_i):
 *   D_i = sigma_i^2 = 1/(4 * n_i)
 *   A_hat = max(0, tau2_hat)         — estimated prior variance of the family
 *   B_i = D_i / (A_hat + D_i)        — shrinkage weight
 *   theta_shrunk_i = theta_bar + (1 - B_i) * (theta_i - theta_bar)
 *
 * Families with fewer than 3 groups are left unshrunk (identity), since
 * James-Stein dominance does not hold below p=3.
 *
 * @param means     Unshrunk per-group estimates (on the NATURAL scale).
 * @param counts    Per-group observation counts n_i.
 * @param kind      "sqrt" for count-rate (Anscombe), "arcsine" for proportion.
 * @returns         Shrunk estimates (same length, natural scale).
 */
export function jamesSteinShrink(
  means: readonly number[],
  counts: readonly number[],
  kind: "sqrt" | "arcsine",
): number[] {
  const p = means.length;
  if (p !== counts.length) {
    throw new RangeError(
      `jamesSteinShrink: means and counts must be equal length (got ${p} vs ${counts.length})`,
    );
  }
  if (p < JS_MIN_GROUPS) {
    return [...means]; // identity — JS does not dominate below p=3
  }

  // Transform to approximately normal scale with Var ~ 1/(4n).
  const transformed: number[] = new Array(p);
  for (let i = 0; i < p; i++) {
    const m = means[i]!;
    transformed[i] = kind === "sqrt" ? anscombe(m) : arcsine(m);
  }

  // Precision weights: w_i = 1 / sigma_i^2 = 4 * n_i.
  let sumW = 0;
  let sumWTheta = 0;
  for (let i = 0; i < p; i++) {
    const w = 4 * counts[i]!;
    sumW += w;
    sumWTheta += w * transformed[i]!;
  }
  if (sumW === 0) return [...means]; // degenerate — no data
  const thetaBar = sumWTheta / sumW;

  // Between-group variance (method-of-moments, positive part):
  //   tau2_hat = max(0, (sum(w_i * (theta_i - theta_b)^2) - (p-1)) / sum(w_i))
  let sumWSqDev = 0;
  for (let i = 0; i < p; i++) {
    const w = 4 * counts[i]!;
    const dev = transformed[i]! - thetaBar;
    sumWSqDev += w * dev * dev;
  }
  let tau2 = (sumWSqDev - (p - 1)) / sumW;
  if (tau2 < 0 || !Number.isFinite(tau2)) tau2 = 0;
  const aHat = tau2; // A_hat = max(0, tau2_hat)

  // Shrink each estimate. B_i = D_i / (A_hat + D_i), D_i = 1/(4 n_i).
  const shrunk: number[] = new Array(p);
  for (let i = 0; i < p; i++) {
    const nI = counts[i]!;
    const dI = samplingVariance(nI); // D_i = 1/(4 n_i)
    const bI = aHat > 0 ? dI / (aHat + dI) : 1; // if A_hat=0, full shrink to mean
    const shrunkT = thetaBar + (1 - bI) * (transformed[i]! - thetaBar);

    shrunk[i] = kind === "sqrt" ? invAnscombe(shrunkT) : invArcsin(shrunkT);
  }
  return shrunk;
}

/**
 * Per-unit accumulator: running mean, sum, sum-of-squares, count.
 * Tracks a count-rate metric (e.g. log-run-rate per game for each team).
 */
class GroupAccumulator {
  private sum = 0;
  private sumSq = 0;
  private n = 0;

  get count(): number {
    return this.n;
  }
  get mean(): number {
    return this.n > 0 ? this.sum / this.n : 0;
  }
  get variance(): number {
    return this.n > 0 ? samplingVariance(this.n) : 1;
  }

  push(value: number): void {
    this.sum += value;
    this.sumSq += value * value;
    this.n += 1;
  }
}

/**
 * The hierarchical James-Stein shrunk totals model.
 *
 * Produces q_t = P(Y > line | history) via an NB2 posterior predictive,
 * where the group-level effects are shrunk via positive-part James-Stein.
 *
 * The model maintains per-unit accumulators for each feature family.
 * predictOver() computes a linear predictor log(mu) = intercept + shrunk effects
 * and returns P(Y > line) under NB2(mu, phi).
 *
 * Walk-forward contract:
 *   - predictOver(game) must be called BEFORE update(game) for the same game.
 *   - predictOver reads only unit indices + line, never game.y.
 */
export class MveModelJs {
  readonly seed: number;

  private readonly teamOffense: GroupAccumulator[] = [];
  private readonly teamDefense: GroupAccumulator[] = [];
  private readonly pitcherOffense: GroupAccumulator[] = [];
  private readonly pitcherDefense: GroupAccumulator[] = [];
  private readonly parkEffect: GroupAccumulator[] = [];
  private readonly umpireEffect: GroupAccumulator[] = [];
  private readonly weatherEffect: GroupAccumulator[] = [];
  private readonly restHomeEffect: GroupAccumulator[] = [];
  private readonly restAwayEffect: GroupAccumulator[] = [];
  private readonly interceptAccum = new GroupAccumulator();

  private nTeams = 0;
  private nPitchers = 0;
  private nParks = 0;
  private nUmpires = 0;
  private readonly nWeather = 5;  // 0-4: cold-cool-mild-warm-hot
  private readonly nRest = 7;     // 0-6: days rest

  private obsCount = 0;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    // Pre-grow fixed-size families (weather, rest) so update() can index them.
    this.grow(this.weatherEffect, this.nWeather);
    this.grow(this.restHomeEffect, this.nRest);
    this.grow(this.restAwayEffect, this.nRest);
  }

  /**
   * Predict P(total runs > line) using ONLY accumulated history.
   * Does NOT read game.y.
   *
   * log(mu) = intercept
   *   + shrunk(team_offense[home])
   *   - shrunk(team_defense[away])
   *   + shrunk(pitcher_offense[home])
   *   - shrunk(pitcher_defense[away])
   *   + shrunk(park[park])
   *   + shrunk(umpire[umpire])
   *   + shrunk(weather[weather])
   *   + shrunk(rest_home[restHome])
   *   + shrunk(rest_away[restAway])
   *
   * then q_over = P(Y > line) under NB2(mu, phi).
   */
  predictOver(game: ModelGame): number {
    this.ensureCapacity(
      game.home, game.away, game.pitcherHome, game.pitcherAway, game.park, game.umpire,
    );

    // No history yet: use default intercept only.
    if (this.obsCount < 1) {
      const mu = Math.exp(DEFAULT_INTERCEPT);
      return nbOverProb(mu, JS_PHI, game.line);
    }

    // Shrink each group family.
    const shrunkTeamOff = this.shrinkGroup(this.teamOffense, this.nTeams);
    const shrunkTeamDef = this.shrinkGroup(this.teamDefense, this.nTeams);
    const shrunkPitchOff = this.shrinkGroup(this.pitcherOffense, this.nPitchers);
    const shrunkPitchDef = this.shrinkGroup(this.pitcherDefense, this.nPitchers);
    const shrunkPark = this.shrinkGroup(this.parkEffect, this.nParks);
    const shrunkUmp = this.shrinkGroup(this.umpireEffect, this.nUmpires);
    const shrunkWeather = this.shrinkGroup(this.weatherEffect, this.nWeather);
    const shrunkRestHome = this.shrinkGroup(this.restHomeEffect, this.nRest);
    const shrunkRestAway = this.shrinkGroup(this.restAwayEffect, this.nRest);

    const weather = Math.max(0, Math.min(this.nWeather - 1, game.weather ?? 2));
    const restHome = Math.max(0, Math.min(this.nRest - 1, game.restHome ?? 3));
    const restAway = Math.max(0, Math.min(this.nRest - 1, game.restAway ?? 3));

    const intercept = this.interceptAccum.mean || DEFAULT_INTERCEPT;
    const homeOff = shrunkTeamOff[game.home] ?? 0;
    const awayDef = shrunkTeamDef[game.away] ?? 0;
    const pitchHome = shrunkPitchOff[game.pitcherHome] ?? 0;
    const pitchAway = shrunkPitchDef[game.pitcherAway] ?? 0;
    const park = shrunkPark[game.park] ?? 0;
    const ump = shrunkUmp[game.umpire] ?? 0;
    const wth = shrunkWeather[weather] ?? 0;
    const rh = shrunkRestHome[restHome] ?? 0;
    const ra = shrunkRestAway[restAway] ?? 0;

    const eta =
      intercept
      + homeOff - awayDef
      + pitchHome - pitchAway
      + park + ump + wth + rh + ra;

    const mu = Math.exp(eta);
    return nbOverProb(mu, JS_PHI, game.line);
  }

  /**
   * Shrink a single group family via James-Stein.
   * Returns shrunk means (natural scale), one per unit slot.
   * Units with no observations keep mean 0 (no contribution).
   */
  private shrinkGroup(accumulators: GroupAccumulator[], count: number): number[] {
    const means = new Array(count).fill(0);
    const nobs = new Array(count).fill(0);
    for (let i = 0; i < count; i++) {
      const a = accumulators[i];
      if (a && a.count > 0) {
        means[i] = a.mean;
        nobs[i] = a.count;
      }
    }
    if (means.filter((m) => m > 0).length < JS_MIN_GROUPS) {
      return means; // not enough populated groups — identity
    }
    return jamesSteinShrink(means, nobs, "sqrt");
  }

  /** Ensure accumulator arrays are large enough for the given unit indices. */
  private ensureCapacity(
    home: number, away: number, picH: number, picA: number, park: number, ump: number,
  ): void {
    const teams = Math.max(home, away) + 1;
    const pitchers = Math.max(picH, picA) + 1;
    this.grow(this.teamOffense, teams);
    this.grow(this.teamDefense, teams);
    this.grow(this.pitcherOffense, pitchers);
    this.grow(this.pitcherDefense, pitchers);
    this.grow(this.parkEffect, park + 1);
    this.grow(this.umpireEffect, ump + 1);
    this.nTeams = Math.max(this.nTeams, teams);
    this.nPitchers = Math.max(this.nPitchers, pitchers);
    this.nParks = Math.max(this.nParks, park + 1);
    this.nUmpires = Math.max(this.nUmpires, ump + 1);
  }

  private grow(arr: GroupAccumulator[], target: number): void {
    while (arr.length < target) arr.push(new GroupAccumulator());
  }

  /**
   * Update the model with the observed game. Called AFTER predictOver and
   * AFTER the observation is pushed to the e-process path.
   */
  update(game: ModelGame): void {
    this.ensureCapacity(
      game.home, game.away, game.pitcherHome, game.pitcherAway, game.park, game.umpire,
    );
    if (!Number.isInteger(game.y) || game.y < 0) {
      throw new RangeError(`MveModelJs.update: y must be a non-negative integer, received ${game.y}`);
    }

    const logTotal = Math.log(game.y + 1);
    this.interceptAccum.push(logTotal);
    this.teamOffense[game.home]!.push(logTotal);
    this.teamDefense[game.away]!.push(logTotal);
    this.pitcherOffense[game.pitcherHome]!.push(logTotal);
    this.pitcherDefense[game.pitcherAway]!.push(logTotal);
    this.parkEffect[game.park]!.push(logTotal);

    const weather = Math.max(0, Math.min(this.nWeather - 1, game.weather ?? 2));
    const restHome = Math.max(0, Math.min(this.nRest - 1, game.restHome ?? 3));
    const restAway = Math.max(0, Math.min(this.nRest - 1, game.restAway ?? 3));
    this.umpireEffect[game.umpire]!.push(logTotal);
    this.weatherEffect[weather]!.push(logTotal);
    this.restHomeEffect[restHome]!.push(logTotal);
    this.restAwayEffect[restAway]!.push(logTotal);

    this.obsCount += 1;
  }

  /** Number of games observed (via update). */
  get observations(): number {
    return this.obsCount;
  }

  /**
   * Freeze the model's deterministic state into a snapshot.
   * Two models with identical snapshots produce identical q_t.
   */
  snapshot(): MveModelJsSnapshot {
    const ser = (arr: GroupAccumulator[], count: number): FrozenGroup[] =>
      arr.slice(0, count).map((a) => ({ sum: a["sum" as keyof GroupAccumulator] as number, sumSq: a["sumSq" as keyof GroupAccumulator] as number, n: a.count }));
    return {
      seed: this.seed,
      observations: this.obsCount,
      nTeams: this.nTeams,
      nPitchers: this.nPitchers,
      nParks: this.nParks,
      nUmpires: this.nUmpires,
      intercept: { sum: this.interceptAccum["sum" as keyof GroupAccumulator] as number, sumSq: this.interceptAccum["sumSq" as keyof GroupAccumulator] as number, n: this.interceptAccum.count },
      teamOffense: ser(this.teamOffense, this.nTeams),
      teamDefense: ser(this.teamDefense, this.nTeams),
      pitcherOffense: ser(this.pitcherOffense, this.nPitchers),
      pitcherDefense: ser(this.pitcherDefense, this.nPitchers),
      parkEffect: ser(this.parkEffect, this.nParks),
      umpireEffect: ser(this.umpireEffect, this.nUmpires),
      weatherEffect: ser(this.weatherEffect, this.nWeather),
      restHomeEffect: ser(this.restHomeEffect, this.nRest),
      restAwayEffect: ser(this.restAwayEffect, this.nRest),
    };
  }
}

interface FrozenGroup {
  readonly sum: number;
  readonly sumSq: number;
  readonly n: number;
}

export interface MveModelJsSnapshot {
  readonly seed: number;
  readonly observations: number;
  readonly nTeams: number;
  readonly nPitchers: number;
  readonly nParks: number;
  readonly nUmpires: number;
  readonly intercept: FrozenGroup;
  readonly teamOffense: readonly FrozenGroup[];
  readonly teamDefense: readonly FrozenGroup[];
  readonly pitcherOffense: readonly FrozenGroup[];
  readonly pitcherDefense: readonly FrozenGroup[];
  readonly parkEffect: readonly FrozenGroup[];
  readonly umpireEffect: readonly FrozenGroup[];
  readonly weatherEffect: readonly FrozenGroup[];
  readonly restHomeEffect: readonly FrozenGroup[];
  readonly restAwayEffect: readonly FrozenGroup[];
}

/**
 * P(Y > line) under NB2(mu, phi), computed by summing the PMF from 0 to floor(line).
 * Clamps to [1e-6, 1-1e-6] to keep the e-process increment well-formed.
 */
function nbOverProb(mu: number, phi: number, line: number): number {
  let cdf = 0;
  for (let y = 0; y <= Math.floor(line); y++) {
    cdf += nbPmf(y, mu, phi);
  }
  if (!Number.isFinite(cdf)) return 0.5;
  return Math.min(1 - 1e-6, Math.max(1e-6, 1 - cdf));
}

/**
 * NB2 PMF: P(Y=y) = C(phi+y-1, y) * (phi/(phi+mu))^phi * (mu/(phi+mu))^y.
 * Same formula as logNbPmf in nb-rbpf.ts, evaluated in linear space.
 */
function nbPmf(y: number, mu: number, phi: number): number {
  if (y < 0 || mu <= 0 || phi <= 0) return 0;
  const logP =
    logGamma(phi + y) - logGamma(phi) - logGamma(y + 1)
    + phi * Math.log(phi / (phi + mu))
    + y * Math.log(mu / (phi + mu));
  return Math.exp(logP);
}

/** Lanczos approximation of log Gamma. */
function logGamma(x: number): number {
  if (x <= 0) return Number.NaN;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056329253867975e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0]!;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
