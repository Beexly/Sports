/**
 * Fractional e-process capital for the R-9 engine.
 *
 * Primary: FIXED λ = 0.3. Comparison arm: predictable adaptive
 * λ_t = min(0.3, 1/sqrt(t+1)). Neither arm reads residual information
 * (that gate was rejected in the audit).
 *
 * Factor: 1 − λ + λ · e_t, e_t = likelihood ratio of the (shrunk) forecast
 * against the market. Shrinkage toward the market is the same mitigation
 * forecast-skill-eprocess.ts documents: validity is free, power is not.
 *
 * Open-loop baseline always forecasts the market, so its capital is identically 1.
 */

import { FIXED_LAMBDA, NbRbpf, type NbRbpfOptions } from "./nb-rbpf.js";
import { generateSyntheticGames, type SyntheticDesign, DEFAULT_DESIGN } from "./synthetic-nb.js";

const EPS = 0.05;
const FLOOR = 1e-6;

export interface CapitalPath {
  readonly terminal: number;
  readonly maxCapital: number;
  readonly n: number;
  readonly exceeded20: boolean;
}

function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1 - FLOOR, Math.max(FLOOR, p));
}

function shrinkToMarket(p: number, m: number): number {
  return (1 - EPS) * p + EPS * m;
}

function eValue(pHat: number, m: number, yOver: 0 | 1): number {
  const p = clamp01(shrinkToMarket(pHat, m));
  const mk = clamp01(m);
  const e = yOver === 1 ? p / mk : (1 - p) / (1 - mk);
  return Number.isFinite(e) && e > 0 ? e : 1;
}

function lambdaAt(t: number, adaptive: boolean): number {
  if (!adaptive) return FIXED_LAMBDA;
  return Math.min(FIXED_LAMBDA, 1 / Math.sqrt(t + 1));
}

export function stepCapital(capital: number, e: number, lambda: number): number {
  const factor = 1 - lambda + lambda * e;
  const next = capital * factor;
  return Number.isFinite(next) && next > 0 ? next : capital;
}

export interface RunOptions {
  readonly seed: number;
  readonly planted: boolean;
  readonly adaptiveLambda?: boolean;
  readonly openLoop?: boolean;
  readonly design?: Partial<SyntheticDesign>;
  readonly filter?: Partial<Omit<NbRbpfOptions, "seed" | "nTeams" | "nPitchers" | "nParks" | "nUmpires">>;
}

export function runCapital(options: RunOptions): CapitalPath {
  const design: SyntheticDesign = { ...DEFAULT_DESIGN, ...options.design, planted: options.planted };
  const games = generateSyntheticGames(options.seed, design);
  const filter = new NbRbpf({
    seed: options.seed,
    nTeams: design.nTeams,
    nPitchers: design.nPitchers,
    nParks: design.nParks,
    nUmpires: design.nUmpires,
    nParticles: options.filter?.nParticles ?? 24,
    essThreshold: options.filter?.essThreshold,
    resampling: options.filter?.resampling,
    liuWestDelta: options.filter?.liuWestDelta,
  });
  let capital = 1;
  let maxCapital = 1;
  let n = 0;
  for (const game of games) {
    const pHat = options.openLoop ? 0.5 : filter.predictOver(game);
    const yOver: 0 | 1 | null = game.y > game.line ? 1 : game.y < game.line ? 0 : null;
    if (yOver !== null) {
      const e = eValue(pHat, 0.5, yOver);
      capital = stepCapital(capital, e, lambdaAt(n, options.adaptiveLambda === true));
      if (capital > maxCapital) maxCapital = capital;
      n += 1;
    }
    if (!options.openLoop) filter.update(game);
  }
  return {
    terminal: capital,
    maxCapital,
    n,
    exceeded20: maxCapital > 20,
  };
}

export interface NullReport {
  readonly seeds: number;
  readonly exceeded20: number;
  readonly rate: number;
  readonly alpha: number;
  readonly pass: boolean;
}

export function runNullSuite(seeds: number, startSeed = 1): NullReport {
  let exceeded = 0;
  for (let i = 0; i < seeds; i++) {
    const path = runCapital({ seed: startSeed + i, planted: false });
    if (path.exceeded20) exceeded += 1;
  }
  const rate = exceeded / seeds;
  return { seeds, exceeded20: exceeded, rate, alpha: 0.05, pass: rate <= 0.05 };
}

export interface PlantedReport {
  readonly engineMedianMax: number;
  readonly openLoopMedianMax: number;
  readonly beatsOpenLoop: boolean;
}

export function runPlantedComparison(seeds: number, startSeed = 10_000): PlantedReport {
  const eng: number[] = [];
  const open: number[] = [];
  for (let i = 0; i < seeds; i++) {
    eng.push(runCapital({ seed: startSeed + i, planted: true }).maxCapital);
    open.push(runCapital({ seed: startSeed + i, planted: true, openLoop: true }).maxCapital);
  }
  eng.sort((a, b) => a - b);
  open.sort((a, b) => a - b);
  const mid = Math.floor(seeds / 2);
  const engineMedianMax = eng[mid] ?? 1;
  const openLoopMedianMax = open[mid] ?? 1;
  return {
    engineMedianMax,
    openLoopMedianMax,
    beatsOpenLoop: engineMedianMax > openLoopMedianMax,
  };
}
