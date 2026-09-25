/**
 * Decision adapters — real computation from decision/sizing modules.
 *
 * Kelly log-growth, robust Kelly, bet cadence, drawdown risk, dominance
 * screen. Each adapter invokes the real exported function. Fail-closed
 * on missing input. No fake data.
 */

import type { AdapterResult } from "./universal-adapter.js";
import {
  expectedLogGrowth,
  type ReturnAtom,
} from "../decision/1710-01787-kelly-saturation-hardening.js";
import {
  boxUncertaintySet,
  nominalKellyFraction,
  robustKellyFraction,
  DEFAULT_ROBUST_CONFIG,
  type RobustSizerConfig,
} from "../decision/1812-10371-robust-kelly-uncertainty-set.js";
import {
  chooseCadence,
  type CadenceInputs,
} from "../decision/1801-06737-bet-cadence-policy.js";
import {
  currentDrawdownRisk,
  perCategoryKellyCaps,
  BET_CATEGORIES,
  type BetCategory,
} from "../decision/1710-04818-drawdown-risk-frontier.js";
import {
  capAtFractionalCeiling,
  dominanceScreen,
  type DominanceScreenInput,
} from "../decision/1807-05265-dominance-screen.js";

const NOW_ISO = (): string => new Date().toISOString();

// ── Kelly log-growth ───────────────────────────────────────────────────────

export interface KellyGrowthInput {
  readonly f: number;
  readonly dist: readonly ReturnAtom[];
}

/**
 * Exact expected log-growth at fraction f. This is the ONLY permitted
 * Kelly objective (paper ban on Taylor / mu/sigma^2 shortcuts).
 */
export function kellyLogGrowthAdapter(
  input: KellyGrowthInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.f) ||
    input.f < 0 ||
    !Array.isArray(input.dist) ||
    input.dist.length === 0
  ) {
    return {
      failClosed: true,
      reason: "missing f or empty return distribution",
      source: "decision:kelly-log-growth",
    };
  }
  for (const a of input.dist) {
    if (!Number.isFinite(a.x) || !Number.isFinite(a.p) || a.p < 0) {
      return {
        failClosed: true,
        reason: "invalid return atom (x/p non-finite or p < 0)",
        source: "decision:kelly-log-growth",
      };
    }
  }
  const g = expectedLogGrowth(input.f, [...input.dist]);
  return {
    source: "decision:kelly-log-growth",
    asOf: NOW_ISO(),
    value: g === -Infinity ? "RUIN" : Number(g.toFixed(6)),
    confidence: 1,
    provenance:
      "packages/prediction-engine/src/decision/1710-01787-kelly-saturation-hardening.ts#expectedLogGrowth",
    family: "MARKET",
    raw: { f: input.f, logGrowth: g === -Infinity ? null : Number(g.toFixed(6)), atoms: input.dist.length },
  };
}

// ── Robust Kelly ───────────────────────────────────────────────────────────

export interface RobustKellyInput {
  readonly pHat: number;
  readonly odds: number;
  readonly config?: RobustSizerConfig;
}

export function robustKellyAdapter(
  input: RobustKellyInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.pHat) ||
    input.pHat <= 0 ||
    input.pHat >= 1 ||
    !Number.isFinite(input.odds) ||
    input.odds <= 1
  ) {
    return {
      failClosed: true,
      reason: "pHat must be in (0,1) and odds > 1",
      source: "decision:robust-kelly",
    };
  }
  const config = input.config ?? DEFAULT_ROBUST_CONFIG;
  try {
    const r = robustKellyFraction(input.pHat, input.odds, config);
    return {
      source: "decision:robust-kelly",
      asOf: NOW_ISO(),
      value: Number(r.robust.toFixed(6)),
      confidence: 0.8,
      provenance:
        "packages/prediction-engine/src/decision/1812-10371-robust-kelly-uncertainty-set.ts#robustKellyFraction",
      family: "MARKET",
      raw: {
        pHat: input.pHat,
        odds: input.odds,
        robust: Number(r.robust.toFixed(6)),
        nominal: Number(r.nominal.toFixed(6)),
        pLo: r.pLo,
        pHi: r.pHi,
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "robustKellyFraction threw",
      source: "decision:robust-kelly",
    };
  }
}

export function nominalKellyAdapter(
  input: RobustKellyInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.pHat) ||
    input.pHat <= 0 ||
    !Number.isFinite(input.odds) ||
    input.odds <= 1
  ) {
    return {
      failClosed: true,
      reason: "pHat must be > 0 and odds > 1",
      source: "decision:nominal-kelly",
    };
  }
  const cap = input.config?.fractionalCap ?? DEFAULT_ROBUST_CONFIG.fractionalCap;
  const f = nominalKellyFraction(input.pHat, input.odds, cap);
  return {
    source: "decision:nominal-kelly",
    asOf: NOW_ISO(),
    value: Number(f.toFixed(6)),
    confidence: 0.7,
    provenance:
      "packages/prediction-engine/src/decision/1812-10371-robust-kelly-uncertainty-set.ts#nominalKellyFraction",
    family: "MARKET",
    raw: { pHat: input.pHat, odds: input.odds, cap, fraction: Number(f.toFixed(6)) },
  };
}

export function uncertaintyBoxAdapter(
  input: { readonly pHat: number; readonly radius: number } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.pHat) ||
    input.pHat <= 0 ||
    input.pHat >= 1 ||
    !Number.isFinite(input.radius) ||
    input.radius < 0
  ) {
    return {
      failClosed: true,
      reason: "pHat in (0,1) and radius >= 0 required",
      source: "decision:uncertainty-box",
    };
  }
  const box = boxUncertaintySet(input.pHat, input.radius);
  return {
    source: "decision:uncertainty-box",
    asOf: NOW_ISO(),
    value: box.pLo,
    confidence: 1,
    provenance:
      "packages/prediction-engine/src/decision/1812-10371-robust-kelly-uncertainty-set.ts#boxUncertaintySet",
    family: "MARKET",
    raw: { pHat: input.pHat, radius: input.radius, pLo: box.pLo, pHi: box.pHi },
  };
}

// ── Bet cadence ────────────────────────────────────────────────────────────

export function cadenceAdapter(
  input: CadenceInputs | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.edgeMean) ||
    !Number.isFinite(input.edgeVar) ||
    input.edgeVar < 0 ||
    !Number.isFinite(input.costPerRestake) ||
    input.costPerRestake < 0 ||
    !Number.isFinite(input.maxCadence) ||
    input.maxCadence < 1
  ) {
    return {
      failClosed: true,
      reason: "invalid cadence inputs",
      source: "decision:bet-cadence",
    };
  }
  const d = chooseCadence(input);
  return {
    source: "decision:bet-cadence",
    asOf: NOW_ISO(),
    value: d.state === "BET" ? d.cadence : 0,
    confidence: 0.75,
    provenance:
      "packages/prediction-engine/src/decision/1801-06737-bet-cadence-policy.ts#chooseCadence",
    family: "MARKET",
    raw: {
      state: d.state,
      cadence: d.cadence,
      netGrowth: Number(d.netGrowth.toFixed(6)),
      staleEdgeScreen: d.staleEdgeScreen,
    },
  };
}

// ── Drawdown risk ──────────────────────────────────────────────────────────

export function drawdownRiskAdapter(
  input: {
    readonly phi: readonly number[];
    readonly tradeReturns: readonly (readonly number[])[];
    readonly nPaths: number;
    readonly seed?: number;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.phi) ||
    input.phi.length === 0 ||
    !Array.isArray(input.tradeReturns) ||
    input.tradeReturns.length === 0 ||
    !Number.isFinite(input.nPaths) ||
    input.nPaths <= 0
  ) {
    return {
      failClosed: true,
      reason: "phi (non-empty), tradeReturns (non-empty), and nPaths > 0 required",
      source: "decision:drawdown-risk",
    };
  }
  try {
    const risk = currentDrawdownRisk(
      [...input.phi],
      input.tradeReturns.map((r) => [...r]) as number[][],
      input.nPaths,
      input.seed,
    );
    return {
      source: "decision:drawdown-risk",
      asOf: NOW_ISO(),
      value: Number(risk.toFixed(6)),
      confidence: 0.85,
      provenance:
        "packages/prediction-engine/src/decision/1710-04818-drawdown-risk-frontier.ts#currentDrawdownRisk",
      family: "MARKET",
      raw: {
        risk: Number(risk.toFixed(6)),
        nPaths: input.nPaths,
        phiLength: input.phi.length,
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "currentDrawdownRisk threw",
      source: "decision:drawdown-risk",
    };
  }
}

export function kellyCapsAdapter(
  input: {
    readonly phi: readonly number[];
    readonly fullKellyCap: number;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.phi) ||
    input.phi.length !== BET_CATEGORIES.length ||
    !Number.isFinite(input.fullKellyCap)
  ) {
    return {
      failClosed: true,
      reason: `phi must have ${BET_CATEGORIES.length} values and finite fullKellyCap`,
      source: "decision:kelly-caps",
    };
  }
  try {
    const caps = perCategoryKellyCaps([...input.phi], input.fullKellyCap);
    return {
      source: "decision:kelly-caps",
      asOf: NOW_ISO(),
      value: caps.spreads ?? 0,
      confidence: 0.8,
      provenance:
        "packages/prediction-engine/src/decision/1710-04818-drawdown-risk-frontier.ts#perCategoryKellyCaps",
      family: "MARKET",
      raw: { ...caps, fullKellyCap: input.fullKellyCap },
    };
  } catch {
    return {
      failClosed: true,
      reason: "perCategoryKellyCaps threw",
      source: "decision:kelly-caps",
    };
  }
}

// ── Dominance screen ───────────────────────────────────────────────────────

export function dominanceScreenAdapter(
  input: DominanceScreenInput | null | undefined,
): AdapterResult {
  if (!input) {
    return {
      failClosed: true,
      reason: "missing dominance screen input",
      source: "decision:dominance-screen",
    };
  }
  try {
    const r = dominanceScreen(input);
    return {
      source: "decision:dominance-screen",
      asOf: NOW_ISO(),
      value: r.suppressed.length,
      confidence: 0.7,
      provenance:
        "packages/prediction-engine/src/decision/1807-05265-dominance-screen.ts#dominanceScreen",
      family: "MARKET",
      raw: {
        posted: r.posted.length,
        suppressed: r.suppressed.length,
        triggers: r.triggers.length,
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "dominanceScreen threw",
      source: "decision:dominance-screen",
    };
  }
}

export function fractionalCeilingAdapter(
  input: { readonly stake: number; readonly ceiling: number } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.stake) ||
    !Number.isFinite(input.ceiling) ||
    input.ceiling <= 0
  ) {
    return {
      failClosed: true,
      reason: "finite stake and positive ceiling required",
      source: "decision:fractional-ceiling",
    };
  }
  const capped = capAtFractionalCeiling(input.stake, input.ceiling);
  return {
    source: "decision:fractional-ceiling",
    asOf: NOW_ISO(),
    value: Number(capped.toFixed(6)),
    confidence: 1,
    provenance:
      "packages/prediction-engine/src/decision/1807-05265-dominance-screen.ts#capAtFractionalCeiling",
    family: "MARKET",
    raw: { stake: input.stake, ceiling: input.ceiling, capped: Number(capped.toFixed(6)) },
  };
}

// ── Registry ───────────────────────────────────────────────────────────────

export const DECISION_ADAPTERS = {
  kellyLogGrowth: kellyLogGrowthAdapter,
  robustKelly: robustKellyAdapter,
  nominalKelly: nominalKellyAdapter,
  uncertaintyBox: uncertaintyBoxAdapter,
  cadence: cadenceAdapter,
  drawdownRisk: drawdownRiskAdapter,
  kellyCaps: kellyCapsAdapter,
  dominanceScreen: dominanceScreenAdapter,
  fractionalCeiling: fractionalCeilingAdapter,
} as const;

export type DecisionAdapterName = keyof typeof DECISION_ADAPTERS;

export type { BetCategory, ReturnAtom, CadenceInputs, RobustSizerConfig, DominanceScreenInput };
