/**
 * Optional full-posterior samplers. PRE-SEAL ONLY.
 *
 * Both samplers operate on the same model as ppm-estimator.ts:
 *   R_i ~ N(mu, tau^2)
 *   y_ij ~ N(R_i - R_j + HFA, sigma^2)
 *
 * NEITHER may be invoked by a mid-week operator. The sealed center holds the
 * tau recovered at the Tuesday 04:00 CT lock; re-estimating it mid-week is the
 * exact failure the assertTauSealed invariant protects against.
 */

import type { GameObservation, PoolingParams } from "./types.js";

/* ------------------------------------------------------------------ */
/* Gibbs sampler                                                       */
/* ------------------------------------------------------------------ */

/** Draw from N(m, s2) via Box-Muller. */
function gauss(m: number, s2: number): number {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  return m + Math.sqrt(Math.max(0, s2)) * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Draw from Inverse-Gamma(shape, scale) using the Gamma(shape, 1/scale) identity. */
function invGamma(shape: number, scale: number): number {
  // Marsaglia-Tsang for Gamma(shape, 1), then invert.
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  let x: number;
  let v: number;
  let u: number;
  do {
    x = gauss(0, 1);
    v = Math.pow(1 + c * x, 3);
    u = Math.random();
  } while (v <= 0 || Math.log(u) >= 0.5 * x * x + d - d * v + d * Math.log(v));
  return scale / (d * v);
}

export interface GibbsOptions {
  iterations: number;
  burnIn: number;
  sigma: number;
  seedRatings?: Record<string, number>;
}

export interface GibbsResult {
  ratings: Record<string, number>;
  mu: number;
  tau2: number;
  sigma: number;
  /** Accepted draws per iteration (for diagnostics). */
  draws: number;
}

/**
 * Full-conditional Gibbs sampler.
 *
 * Conditionals
 *   R_i | rest ~ N( (sum_j (y_ij - HFA + R_j) + mu * sigma^2 / tau^2) /
 *                    (n_i + sigma^2 / tau^2),
 *                  sigma^2 / (n_i + sigma^2 / tau^2) )
 *   mu | rest  ~ N( mean(R), tau^2 / n_teams )
 *   tau^2 | rest ~ Inv-Gamma( n_teams/2 + 1, sum((R - mu)^2)/2 + prior_scale )
 *
 * sigma is held at the empirical estimate from the raw fit; fitting sigma as
 * well would require the full likelihood and is out of scope for this stub.
 */
export function runGibbsSampler(
  observations: GameObservation[],
  params: PoolingParams,
  opts: GibbsOptions = { iterations: 500, burnIn: 200, sigma: params.sigma },
): GibbsResult {
  const teams = Array.from(new Set(observations.flatMap((o) => [o.home, o.away]))).sort();
  const nTeams = teams.length;
  const sigma = Math.max(1e-6, opts.sigma);
  const sigma2 = sigma * sigma;

  const ratings: Record<string, number> = {};
  for (const t of teams) ratings[t] = opts.seedRatings?.[t] ?? params.mu;

  // Observation index by team
  const obsByTeam = new Map<string, GameObservation[]>();
  for (const t of teams) obsByTeam.set(t, []);
  for (const o of observations) {
    obsByTeam.get(o.home)!.push(o);
    obsByTeam.get(o.away)!.push(o);
  }

  let mu = params.mu;
  let tau2 = params.tau * params.tau;
  let accepted = 0;

  for (let it = 0; it < opts.iterations + opts.burnIn; it += 1) {
    // --- R_i | rest ---
    for (const team of teams) {
      const obs = obsByTeam.get(team)!;
      if (obs.length === 0) continue;
      let sumTarget = 0;
      for (const o of obs) {
        const opponent = o.home === team ? o.away : o.home;
        const sign = o.home === team ? 1 : -1;
        // y = R_home - R_away + HFA => R_team = sign * (y - HFA) + R_opponent
        sumTarget += sign * (o.margin - params.hfa) + ratings[opponent]!;
      }
      const precisionData = obs.length / sigma2;
      const precisionPrior = 1 / tau2;
      const mean = (sumTarget / sigma2 + mu * precisionPrior) / (precisionData + precisionPrior);
      const varPost = 1 / (precisionData + precisionPrior);
      ratings[team] = gauss(mean, varPost);
    }

    // --- mu | rest ---
    const meanRating = teams.reduce((a, t) => a + ratings[t]!, 0) / Math.max(1, nTeams);
    mu = gauss(meanRating, tau2 / Math.max(1, nTeams));

    // --- tau^2 | rest ---
    const ss = teams.reduce((a, t) => a + (ratings[t]! - mu) ** 2, 0);
    tau2 = invGamma(nTeams / 2 + 1, ss / 2 + 0.5);

    if (it >= opts.burnIn) accepted += 1;
  }

  // Posterior mean over the retained draws is approximated by the last state;
  // a full running mean is unnecessary for this pre-seal stub.
  return {
    ratings,
    mu: Number(mu.toFixed(4)),
    tau2: Number(tau2.toFixed(4)),
    sigma,
    draws: accepted,
  };
}

/* ------------------------------------------------------------------ */
/* NUTS / HMC stub                                                     */
/* ------------------------------------------------------------------ */

export interface NutsOptions {
  maxLeapfrog: number;
  targetAccept: number;
  stepSize: number;
  iterations: number;
  warmup: number;
}

export interface NutsDiagnostics {
  stepSize: number;
  acceptRate: number;
  leapfrogCount: number;
  uturn: boolean;
  diverged: boolean;
}

/**
 * Leapfrog integrator for a 1-D parameter.
 *
 * θ, p -> θ + ε * p, p + ε * grad(θ)
 * The gradient is supplied by the caller; this stub does not assume a
 * particular potential energy function.
 */
export function leapfrogStep(
  theta: number,
  momentum: number,
  grad: number,
  eps: number,
): { theta: number; momentum: number } {
  const pHalf = momentum + (eps / 2) * grad;
  const thetaNext = theta + eps * pHalf;
  return { theta: thetaNext, momentum: pHalf };
}

/**
 * U-turn check from the NUTS paper:
 *   (θ⁺ - θ⁻) · p⁻ < 0  or  (θ⁺ - θ⁻) · p⁺ < 0
 * In 1-D the dot product is just multiplication.
 */
export function isUTurn(
  thetaPlus: number,
  thetaMinus: number,
  pMinus: number,
  pPlus: number,
): boolean {
  const delta = thetaPlus - thetaMinus;
  return delta * pMinus < 0 || delta * pPlus < 0;
}

/**
 * NUTS/HMC stub with dual-averaging step-size adaptation.
 *
 * WARNING: pre-seal only. This must NEVER be invoked by a mid-week operator.
 * Running this after the Tuesday lock would re-estimate tau and break the
 * assertTauSealed invariant.
 */
export function runNutsStub(
  theta0: number,
  gradFn: (theta: number) => number,
  opts: Partial<NutsOptions> = {},
): NutsDiagnostics {
  const cfg: NutsOptions = {
    maxLeapfrog: 16,
    targetAccept: 0.8,
    stepSize: 0.1,
    iterations: 200,
    warmup: 100,
    ...opts,
  };

  let theta = theta0;
  let eps = cfg.stepSize;
  let acceptRate = 0;
  let leapfrogCount = 0;
  let uturn = false;
  let diverged = false;
  let mu = Math.log(10 * eps);
  let hbar = 0;
  let count = 0;

  for (let it = 0; it < cfg.iterations + cfg.warmup; it += 1) {
    // Sample momentum ~ N(0, 1)
    let p = gauss(0, 1);
    const thetaMinus = theta;
    const pMinus = p;
    let thetaPlus = theta;
    let pPlus = p;

    // Build a trajectory until U-turn or max depth.
    for (let l = 0; l < cfg.maxLeapfrog; l += 1) {
      const grad = gradFn(thetaPlus);
      const step = leapfrogStep(thetaPlus, pPlus, grad, eps);
      thetaPlus = step.theta;
      pPlus = step.momentum;
      leapfrogCount += 1;

      if (isUTurn(thetaPlus, thetaMinus, pMinus, pPlus)) {
        uturn = true;
        break;
      }
      if (!Number.isFinite(thetaPlus) || Math.abs(thetaPlus) > 1e6) {
        diverged = true;
        break;
      }
    }

    // Metropolis accept/reject on the endpoint.
    const current = -0.5 * theta * theta + 0.5 * p * p;
    const proposed = -0.5 * thetaPlus * thetaPlus + 0.5 * pPlus * pPlus;
    const acceptProb = Math.min(1, Math.exp(current - proposed));
    if (Math.random() < acceptProb) {
      theta = thetaPlus;
      acceptRate += 1;
    }

    // Dual averaging during warmup only; freeze eps afterward.
    if (it < cfg.warmup) {
      const target = cfg.targetAccept;
      const accept = Math.random() < acceptProb ? 1 : 0;
      hbar = (1 - 1 / (it + 1)) * hbar + (target - accept) / (it + 1);
      const eta = 1 / Math.sqrt(it + 1);
      const logEps = mu - eta * hbar;
      eps = Math.exp(logEps);
      mu = Math.log(10 * eps);
      count += 1;
    }
  }

  return {
    stepSize: Number(eps.toFixed(6)),
    acceptRate: count > 0 ? Number((acceptRate / count).toFixed(4)) : 0,
    leapfrogCount,
    uturn,
    diverged,
  };
}
