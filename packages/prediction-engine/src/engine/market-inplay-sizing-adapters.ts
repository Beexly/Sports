/**
 * Market / inplay / sizing adapters — real computation from market,
 * inplay, sizing, odds, and devig modules.
 *
 * Each adapter invokes the real exported function. Fail-closed on
 * missing input. No fake data.
 */

import type { AdapterResult } from "./universal-adapter.js";
import {
  spreadToWinProb,
  probOverWinTotal,
  isLargeLineMove,
} from "../market/spread-winprob-map.js";
import {
  devig,
  type DevigMethod,
} from "../devig/oracle.js";
import { multiplicativeNormalize } from "../odds/oo-epc.js";
import {
  safeLeadProb,
  type SafeLeadParams,
} from "../inplay/safe-lead.js";
import {
  kellyFraction,
} from "../sizing/slate-mpc-staker.js";
import {
  scaleStake,
  stakeMultiplier,
  type VolRegime,
  type ScalerConfig,
} from "../sizing/volatility-regime-scaler.js";
import {
  shrinkEdges,
} from "../sizing/shrinkage-kelly.js";
import {
  bucketRoi,
  flbSlope,
  type OddsBucket,
} from "../odds/favorite-longshot-audit.js";

const NOW_ISO = (): string => new Date().toISOString();

// ── Market: spread → win probability ───────────────────────────────────────

export function spreadToWinProbAdapter(
  input: { readonly spread: number; readonly sd?: number } | null | undefined,
): AdapterResult {
  if (!input || !Number.isFinite(input.spread)) {
    return {
      failClosed: true,
      reason: "missing or non-finite spread",
      source: "market:spread-to-winprob",
    };
  }
  const p = spreadToWinProb(input.spread, input.sd);
  return {
    source: "market:spread-to-winprob",
    asOf: NOW_ISO(),
    value: Number(p.toFixed(4)),
    confidence: 0.85,
    provenance: "packages/prediction-engine/src/market/spread-winprob-map.ts#spreadToWinProb",
    family: "MARKET",
    raw: { spread: input.spread, sd: input.sd ?? 13.5, winProb: Number(p.toFixed(4)) },
  };
}

export function overWinTotalAdapter(
  input: {
    readonly gameWinProbs: readonly number[];
    readonly line: number;
    readonly sims?: number;
    readonly seed?: number;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.gameWinProbs) ||
    input.gameWinProbs.length === 0 ||
    input.gameWinProbs.some((p) => !Number.isFinite(p) || p < 0 || p > 1) ||
    !Number.isFinite(input.line)
  ) {
    return {
      failClosed: true,
      reason: "gameWinProbs in [0,1] (non-empty) and finite line required",
      source: "market:over-win-total",
    };
  }
  try {
    // Deterministic RNG when seed supplied
    let rng: () => number = Math.random;
    if (input.seed !== undefined) {
      let s = input.seed | 0;
      rng = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const p = probOverWinTotal(
      [...input.gameWinProbs],
      input.line,
      input.sims ?? 5000,
      rng,
    );
    return {
      source: "market:over-win-total",
      asOf: NOW_ISO(),
      value: Number(p.toFixed(4)),
      confidence: 0.8,
      provenance: "packages/prediction-engine/src/market/spread-winprob-map.ts#probOverWinTotal",
      family: "MARKET",
      raw: {
        line: input.line,
        games: input.gameWinProbs.length,
        pOver: Number(p.toFixed(4)),
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "probOverWinTotal threw",
      source: "market:over-win-total",
    };
  }
}

export function largeLineMoveAdapter(
  input: { readonly movePoints: number } | null | undefined,
): AdapterResult {
  if (!input || !Number.isFinite(input.movePoints)) {
    return {
      failClosed: true,
      reason: "missing movePoints",
      source: "market:large-line-move",
    };
  }
  const large = isLargeLineMove(input.movePoints);
  return {
    source: "market:large-line-move",
    asOf: NOW_ISO(),
    value: large,
    confidence: 0.75,
    provenance: "packages/prediction-engine/src/market/spread-winprob-map.ts#isLargeLineMove",
    family: "MARKET",
    raw: { movePoints: input.movePoints, large },
  };
}

// ── Devig ──────────────────────────────────────────────────────────────────

export function devigAdapter(
  input: {
    readonly decimalOdds: readonly number[];
    readonly method: DevigMethod;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.decimalOdds) ||
    input.decimalOdds.length < 2 ||
    input.decimalOdds.some((o) => !Number.isFinite(o) || o <= 1)
  ) {
    return {
      failClosed: true,
      reason: "need >=2 decimal odds > 1 and a valid method",
      source: "market:devig",
    };
  }
  try {
    const r = devig([...input.decimalOdds], input.method);
    return {
      source: "market:devig",
      asOf: NOW_ISO(),
      value: r.probabilities[0] ?? null,
      confidence: 0.9,
      provenance: "packages/prediction-engine/src/devig/oracle.ts#devig",
      family: "MARKET",
      raw: {
        method: r.method,
        probabilities: r.probabilities,
        margin: r.margin,
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "devig threw",
      source: "market:devig",
    };
  }
}

// ── Odds normalization ─────────────────────────────────────────────────────

export function multiplicativeNormalizeAdapter(
  input: { readonly odds: readonly number[] } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.odds) ||
    input.odds.length === 0 ||
    input.odds.some((o) => !Number.isFinite(o) || o <= 1)
  ) {
    return {
      failClosed: true,
      reason: "non-empty odds array with every entry > 1 required",
      source: "odds:multiplicative-normalize",
    };
  }
  const n = multiplicativeNormalize([...input.odds]);
  return {
    source: "odds:multiplicative-normalize",
    asOf: NOW_ISO(),
    value: n[0] ?? null,
    confidence: 1,
    provenance: "packages/prediction-engine/src/odds/oo-epc.ts#multiplicativeNormalize",
    family: "MARKET",
    raw: { input: input.odds, normalized: n },
  };
}

// ── Inplay: safe lead ──────────────────────────────────────────────────────

export function safeLeadAdapter(
  input: Partial<SafeLeadParams> | null | undefined,
): AdapterResult {
  if (
    !input ||
    input.lead === undefined ||
    !Number.isFinite(input.lead) ||
    input.timeRemainingMin === undefined ||
    !Number.isFinite(input.timeRemainingMin) ||
    input.timeRemainingMin < 0 ||
    input.driftPerMin === undefined ||
    !Number.isFinite(input.driftPerMin) ||
    input.diffusivity === undefined ||
    !Number.isFinite(input.diffusivity) ||
    input.diffusivity <= 0
  ) {
    return {
      failClosed: true,
      reason:
        "lead, timeRemainingMin >= 0, driftPerMin finite, and diffusivity > 0 required",
      source: "inplay:safe-lead",
    };
  }
  try {
    const p = safeLeadProb(input as SafeLeadParams);
    return {
      source: "inplay:safe-lead",
      asOf: NOW_ISO(),
      value: Number(p.toFixed(4)),
      confidence: 0.7,
      provenance: "packages/prediction-engine/src/inplay/safe-lead.ts#safeLeadProb",
      family: "MARKET",
      raw: { ...input, safeLeadProb: Number(p.toFixed(4)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "safeLeadProb threw",
      source: "inplay:safe-lead",
    };
  }
}

// ── Sizing ─────────────────────────────────────────────────────────────────

export function kellyFractionAdapter(
  input: { readonly p: number; readonly odds: number } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.p) ||
    input.p <= 0 ||
    input.p >= 1 ||
    !Number.isFinite(input.odds) ||
    input.odds <= 1
  ) {
    return {
      failClosed: true,
      reason: "p in (0,1) and odds > 1 required",
      source: "sizing:kelly-fraction",
    };
  }
  const f = kellyFraction(input.p, input.odds);
  return {
    source: "sizing:kelly-fraction",
    asOf: NOW_ISO(),
    value: Number(f.toFixed(6)),
    confidence: 0.8,
    provenance: "packages/prediction-engine/src/sizing/slate-mpc-staker.ts#kellyFraction",
    family: "MARKET",
    raw: { p: input.p, odds: input.odds, fraction: Number(f.toFixed(6)) },
  };
}

export function volatilityStakeAdapter(
  input: {
    readonly baseStake: number;
    readonly regime: VolRegime;
    readonly drawdown: number;
    readonly bankroll: number;
    readonly config?: ScalerConfig;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.baseStake) ||
    input.baseStake < 0 ||
    !Number.isFinite(input.drawdown) ||
    !Number.isFinite(input.bankroll) ||
    input.bankroll <= 0
  ) {
    return {
      failClosed: true,
      reason: "baseStake >= 0, finite drawdown, bankroll > 0 required",
      source: "sizing:volatility-stake",
    };
  }
  try {
    const mult = stakeMultiplier(input.regime, input.drawdown, input.config);
    const scaled = scaleStake(input.baseStake, mult, input.bankroll);
    return {
      source: "sizing:volatility-stake",
      asOf: NOW_ISO(),
      value: Number(scaled.toFixed(6)),
      confidence: 0.75,
      provenance: "packages/prediction-engine/src/sizing/volatility-regime-scaler.ts#scaleStake",
      family: "MARKET",
      raw: {
        baseStake: input.baseStake,
        regime: input.regime,
        drawdown: input.drawdown,
        bankroll: input.bankroll,
        multiplier: mult,
        scaled: Number(scaled.toFixed(6)),
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "scaleStake threw",
      source: "sizing:volatility-stake",
    };
  }
}

export function shrinkEdgesAdapter(
  input: {
    readonly edges: readonly number[];
    readonly ses: readonly number[];
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.edges) ||
    !Array.isArray(input.ses) ||
    input.edges.length < 4 ||
    input.edges.length !== input.ses.length ||
    input.edges.some((e) => !Number.isFinite(e)) ||
    input.ses.some((s) => !Number.isFinite(s) || s < 0)
  ) {
    return {
      failClosed: true,
      reason: "edges and non-negative ses must align, be finite, length >= 4",
      source: "sizing:shrink-edges",
    };
  }
  try {
    const shrunk = shrinkEdges([...input.edges], [...input.ses]);
    return {
      source: "sizing:shrink-edges",
      asOf: NOW_ISO(),
      value: shrunk[0] ?? null,
      confidence: 0.8,
      provenance: "packages/prediction-engine/src/sizing/shrinkage-kelly.ts#shrinkEdges",
      family: "MARKET",
      raw: { edges: input.edges, ses: input.ses, shrunk },
    };
  } catch {
    return {
      failClosed: true,
      reason: "shrinkEdges threw",
      source: "sizing:shrink-edges",
    };
  }
}

// ── Odds: favorite-longshot bias ───────────────────────────────────────────

export function flbSlopeAdapter(
  input: { readonly buckets: readonly OddsBucket[] } | null | undefined,
): AdapterResult {
  if (!input || !Array.isArray(input.buckets) || input.buckets.length < 2) {
    return {
      failClosed: true,
      reason: "need >=2 odds buckets",
      source: "odds:flb-slope",
    };
  }
  try {
    const stats = bucketRoi([...input.buckets]);
    const slope = flbSlope(stats);
    return {
      source: "odds:flb-slope",
      asOf: NOW_ISO(),
      value: Number(slope.toFixed(6)),
      confidence: 0.7,
      provenance: "packages/prediction-engine/src/odds/favorite-longshot-audit.ts#flbSlope",
      family: "MARKET",
      raw: { buckets: stats.length, slope: Number(slope.toFixed(6)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "flbSlope threw",
      source: "odds:flb-slope",
    };
  }
}

// ── Registry ───────────────────────────────────────────────────────────────

export const MARKET_INPLAY_SIZING_ADAPTERS = {
  spreadToWinProb: spreadToWinProbAdapter,
  overWinTotal: overWinTotalAdapter,
  largeLineMove: largeLineMoveAdapter,
  devig: devigAdapter,
  multiplicativeNormalize: multiplicativeNormalizeAdapter,
  safeLead: safeLeadAdapter,
  kellyFraction: kellyFractionAdapter,
  volatilityStake: volatilityStakeAdapter,
  shrinkEdges: shrinkEdgesAdapter,
  flbSlope: flbSlopeAdapter,
} as const;

export type MarketInplaySizingAdapterName =
  keyof typeof MARKET_INPLAY_SIZING_ADAPTERS;

export type { DevigMethod, VolRegime, ScalerConfig, SafeLeadParams, OddsBucket };
