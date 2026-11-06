/**
 * Residual-information comparison arm on top of R-9 NbRbpf.
 *
 * PROXY, not mutual information. Predictable: I_res uses p_hat and m from
 * F_{t-1} only. Temperature is wired by mixing q toward the market using
 * the previous I_res (also F_{t-1}).
 *
 * E-process miss term is H-F5: (1 - q_bet), via sideAdaptiveIncrement.
 * Adaptive λ is comparison-only. Frozen constants below — do not retune
 * after seeing acceptance numbers.
 *
 * PURE: no fs, no env, no odds archive.
 */
import { NbRbpf } from "./nb-rbpf.js";
import {
  generateSyntheticGames,
  DEFAULT_DESIGN,
  type SyntheticDesign,
} from "./synthetic-nb.js";
import {
  selectBetSide,
  betSideProbs,
  sideAdaptiveIncrement,
} from "./mve-eprocess.js";

export const LAMBDA_BASE = 0.15;
export const INFO_SCALE = 1.0;
export const MIN_LAMBDA = 0.02;
export const MAX_LAMBDA = 0.3;
export const DD_COEF = 2.0;
export const ALPHA_LO = 0.2;
export const ALPHA_HI = 0.85;
export const N_PARTICLES = 24;
export const NULL_SEEDS_MLB = 200;
export const NULL_SEEDS_NFL = 80;
export const PLANTED_SEEDS = 40;
export const ALPHA = 0.05;

const FLOOR = 1e-6;

export const NFL_LIKE_DESIGN: SyntheticDesign = {
  nTeams: 8,
  nPitchers: 8,
  nParks: 4,
  nUmpires: 4,
  nGames: 80,
  intercept: Math.log(21),
  phi: 18,
  planted: false,
};

function clip01(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1 - FLOOR, Math.max(FLOOR, p));
}

function logit(p: number): number {
  const q = clip01(p);
  return Math.log(q / (1 - q));
}

/** Residual-info proxy. Not MI. Range [0, 5]. */
export function residualInfo(pModel: number, mMarket: number, pHier: number): number {
  const p = clip01(pModel);
  const m = clip01(mMarket);
  const h = clip01(pHier);
  const residualLogit = logit(p) - 0.5 * (logit(m) + logit(h));
  const I = Math.abs(residualLogit) * (1 - Math.exp(-Math.abs(logit(p) - logit(h))));
  if (!Number.isFinite(I) || I < 0) return 0;
  return Math.min(5, I);
}

export function adaptiveLambda(iRes: number, drawdown: number): number {
  let lam = LAMBDA_BASE * (1 + INFO_SCALE * iRes);
  const dd = Number.isFinite(drawdown) && drawdown > 0 ? drawdown : 0;
  lam *= Math.exp(-DD_COEF * dd);
  if (!Number.isFinite(lam)) return MIN_LAMBDA;
  return Math.min(MAX_LAMBDA, Math.max(MIN_LAMBDA, lam));
}

/** Temperature wire: mix model toward market. High I_res → trust model more. */
export function mixTowardMarket(pHat: number, m: number, iResPrev: number): number {
  const alpha = Math.min(0.85, Math.max(0.2, 0.35 + 0.4 * iResPrev));
  return alpha * clip01(pHat) + (1 - alpha) * clip01(m);
}

export interface ResidualPath {
  readonly terminal: number;
  readonly maxCapital: number;
  readonly maxDrawdown: number;
  readonly n: number;
  readonly meanIRes: number;
  readonly exceeded20: boolean;
}

export interface ResidualRunOptions {
  readonly seed: number;
  readonly planted: boolean;
  readonly design?: SyntheticDesign;
  readonly openLoop?: boolean;
}

export function runResidualCapital(options: ResidualRunOptions): ResidualPath {
  const base = options.design ?? DEFAULT_DESIGN;
  const design: SyntheticDesign = { ...base, planted: options.planted };
  const games = generateSyntheticGames(options.seed, design);
  const m = 0.5;
  const hier = 0.5;
  const filter = options.openLoop
    ? null
    : new NbRbpf({
        seed: options.seed,
        nTeams: design.nTeams,
        nPitchers: design.nPitchers,
        nParks: design.nParks,
        nUmpires: design.nUmpires,
        nParticles: N_PARTICLES,
        intercept: design.intercept,
      });
  let capital = 1;
  let peak = 1;
  let maxDd = 0;
  let n = 0;
  let iSum = 0;
  let iPrev = 0;
  for (const game of games) {
    const pHat = filter === null ? m : filter.predictOver(game);
    const iRes = residualInfo(pHat, m, hier);
    const dd = 1 - capital / peak;
    if (dd > maxDd) maxDd = dd;
    const lam = options.openLoop ? 0 : adaptiveLambda(iRes, dd);
    const q = options.openLoop ? m : mixTowardMarket(pHat, m, iPrev);
    const yOver: 0 | 1 | null = game.y > game.line ? 1 : game.y < game.line ? 0 : null;
    if (yOver !== null) {
      const side = selectBetSide(q, m);
      const { qBet, mBet } = betSideProbs(q, m, side);
      const hit = (side === "OVER" && yOver === 1) || (side === "UNDER" && yOver === 0);
      const inc = sideAdaptiveIncrement({ qBet, mBet, hit, lambda: lam });
      capital *= inc;
      if (!Number.isFinite(capital) || capital <= 0) capital = 1e-6;
      if (capital > peak) peak = capital;
      iSum += iRes;
      n += 1;
    }
    iPrev = iRes;
    if (filter !== null) filter.update(game);
  }
  return {
    terminal: capital,
    maxCapital: peak,
    maxDrawdown: maxDd,
    n,
    meanIRes: n > 0 ? iSum / n : 0,
    exceeded20: peak > 20,
  };
}

export interface NullReport {
  readonly seeds: number;
  readonly exceeded20: number;
  readonly rate: number;
  readonly alpha: number;
  readonly pass: boolean;
}

export function runResidualNull(
  seeds: number,
  startSeed: number,
  design: SyntheticDesign,
): NullReport {
  let exceeded = 0;
  for (let i = 0; i < seeds; i++) {
    const path = runResidualCapital({ seed: startSeed + i, planted: false, design });
    if (path.exceeded20) exceeded += 1;
  }
  const rate = exceeded / seeds;
  return { seeds, exceeded20: exceeded, rate, alpha: ALPHA, pass: rate <= ALPHA };
}

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)] ?? 1;
}

export interface PlantedReport {
  readonly engineMedianMax: number;
  readonly openLoopMedianMax: number;
  readonly beatsOpenLoop: boolean;
}

export function runResidualPlanted(
  seeds: number,
  startSeed: number,
  design: SyntheticDesign,
): PlantedReport {
  const eng: number[] = [];
  const open: number[] = [];
  for (let i = 0; i < seeds; i++) {
    eng.push(runResidualCapital({ seed: startSeed + i, planted: true, design }).maxCapital);
    open.push(
      runResidualCapital({ seed: startSeed + i, planted: true, design, openLoop: true }).maxCapital,
    );
  }
  const engineMedianMax = median(eng);
  const openLoopMedianMax = median(open);
  return {
    engineMedianMax,
    openLoopMedianMax,
    beatsOpenLoop: engineMedianMax > openLoopMedianMax,
  };
}
