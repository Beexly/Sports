/**
 * TimeGrad: Autoregressive Denoising Diffusion for Multivariate Probabilistic Time Series
 *
 * arXiv:2101.12072v1 · lane:synthetic_data · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the first sequential-synthesis prototype: nflverse weekly team stats 2015-2024 -> panel of
 * 32 teams x 18 weeks x K metrics (EPA/play margin, success rate, pace, pressure rate); context =
 * weeks 1-12, prediction = weeks 13-18; covariates (opponent embedding, home/away, rest days,
 * dome/outdoor, week index, bye flag) via learned embeddings; 2-layer LSTM (h=40) model; use
 * synthetic trajectories to augment late-season training data.
 *
 * ACCEPTANCE GATE: ADOPT TimeGrad-trajectory augmentation if: (a) CRPS_sum on 2023-2024 weeks 13-18 beats the
 * copula baseline by >=5% relative, AND (b) real+synthetic spread log-loss beats real-only by
 * >=0.003 on held-out late-season weeks, AND (c) the 90% empirical intervals achieve 85-95%
 * coverage (calibration sanity). REJECT if autoregressive rollout error compounds (CRPS_sum
 * degrades).
 *
 * Ingest role: feature builder (TimeGrad diffusion sampler: schedule + reverse-step + multivariate forecast sampler).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2101.12072v1" as const;
export const LANE = "synthetic_data" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT TimeGrad-trajectory augmentation if: (a) CRPS_sum on 2023-2024 weeks 13-18 beats the
 * copula baseline by >=5% relative, AND (b) real+synthetic spread log-loss beats real-only by
 * >=0.003 on held-out late-season weeks, AND (c) the 90% empirical intervals achieve 85-95%
 * coverage (calibration sanity). REJECT if autoregressive rollout error compounds (CRPS_sum
 * degrades).`;

export const CONFIG = {
  enabled: false,
  diffusionSteps: 100,
  betaStart: 1e-4,
  betaEnd: 0.02,
  hiddenDim: 40,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear beta schedule. */
export function betaSchedule(nSteps: number, betaStart = 1e-4, betaEnd = 0.02): number[] | null {
  if (!Number.isInteger(nSteps) || nSteps < 1) return null;
  if (![betaStart, betaEnd].every(isFiniteNumber) || betaStart <= 0 || betaEnd <= 0 || betaStart > betaEnd) return null;
  const out: number[] = [];
  for (let i = 0; i < nSteps; i++) out.push(betaStart + ((betaEnd - betaStart) * i) / Math.max(1, nSteps - 1));
  return out;
}

/** Cumulative alpha-bar products. */
export function alphaBar(betas: readonly number[]): number[] | null {
  if (betas.length === 0 || !betas.every((b) => isFiniteNumber(b) && b > 0 && b < 1)) return null;
  const out: number[] = [];
  let prod = 1;
  for (const b of betas) {
    prod *= 1 - b;
    out.push(prod);
  }
  return out;
}

/** Forward diffusion: sample x_t from x_0 (reparameterization). */
export function forwardDiffuse(x0: readonly number[], t: number, alphaBars: readonly number[], rng: () => number): number[] | null {
  if (!Number.isInteger(t) || t < 0 || t >= alphaBars.length) return null;
  if (!x0.every(isFiniteNumber)) return null;
  const abar = alphaBars[t] ?? 0;
  if (abar <= 0) return null;
  const out = x0.map((x) => {
    const eps = (rng() + rng() + rng() - 1.5) * 2;
    return Math.sqrt(abar) * x + Math.sqrt(1 - abar) * eps;
  });
  return out;
}

/**
 * One reverse step with a plug-in denoiser (epsilon-prediction).
 * denoiser(x_t, t) -> predicted noise; null-safe.
 */
export function reverseStep(
  xt: readonly number[],
  t: number,
  betas: readonly number[],
  alphaBars: readonly number[],
  denoiser: (x: readonly number[], t: number) => readonly number[] | null,
  rng: () => number,
): number[] | null {
  if (t < 0 || t >= betas.length || !xt.every(isFiniteNumber)) return null;
  const beta = betas[t] ?? 0;
  const abar = alphaBars[t] ?? 0;
  const abarPrev = t === 0 ? 1 : alphaBars[t - 1] ?? 1;
  if (beta <= 0 || abar <= 0) return null;
  const eps = denoiser(xt, t);
  if (!eps || eps.length !== xt.length || !eps.every(isFiniteNumber)) return null;
  const coef = 1 / Math.sqrt(1 - beta);
  const out = xt.map((x, i) => {
    const mean = coef * (x - (beta / Math.sqrt(1 - abar)) * (eps[i] ?? 0));
    if (t === 0) return mean;
    const varT = ((1 - abarPrev) / (1 - abar)) * beta;
    const z = (rng() + rng() + rng() - 1.5) * 2;
    return mean + Math.sqrt(Math.max(0, varT)) * z;
  });
  return out;
}

/** Full ancestral sample from pure noise. */
export function ancestralSample(
  dim: number,
  betas: readonly number[],
  alphaBars: readonly number[],
  denoiser: (x: readonly number[], t: number) => readonly number[] | null,
  seed = 7,
): number[] | null {
  if (!Number.isInteger(dim) || dim <= 0 || betas.length === 0) return null;
  const rng = mulberry32(seed);
  let x = Array.from({ length: dim }, () => (rng() + rng() + rng() - 1.5) * 2);
  for (let t = betas.length - 1; t >= 0; t--) {
    const nx = reverseStep(x, t, betas, alphaBars, denoiser, rng);
    if (!nx) return null;
    x = nx;
  }
  return x;
}
