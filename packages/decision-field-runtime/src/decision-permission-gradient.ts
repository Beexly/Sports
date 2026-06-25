/**
 * DECISION FIELD RUNTIME — Decision Permission Gradient.
 *
 * How strong a card may be is COMPUTED, not vibed. The gradient is a fail-closed conjunction of
 * necessary gates, each in [0,1]: any zero collapses the card to INFO_ONLY. It reuses the engine's
 * existing ladders rather than inventing parallel ones — `TradabilityStatus` for actionability,
 * `GhostAssessment.maxPenalty` for ghost safety, `RegimeVerdict.suppressAction` for regime safety.
 * Pure + deterministic.
 */

import type { TradabilityStatus } from "@sports/engine";
import {
  type MaxPermittedStrength,
  bucketStrength,
} from "./decision-state-stat-contract.js";

export interface PermissionInputs {
  readonly proofQuality: number;          // 0..1
  readonly rightsClearance: number;       // 0..1 (1 = fully rights-cleared)
  readonly lightConeCreditable: number;   // 0 or 1 (knowableAt creditable?)
  readonly requiredStatCompleteness: number; // 0..1 (from the stat audit)
  readonly ghostSafety: number;           // 0..1 = 1 − ghost maxPenalty
  readonly actionability: number;         // 0..1 (from tradability)
  readonly regimeSafety: number;          // 0 or 1 (suppressAction ? 0 : 1)
}

export interface PermissionGradient {
  readonly gradient: number;
  readonly bucket: MaxPermittedStrength;
  readonly factors: Readonly<Record<keyof PermissionInputs, number>>;
  readonly bindingFactor: keyof PermissionInputs;
  readonly note: string;
}

/** Map the engine's tradability ladder to an actionability factor in [0,1]. */
export function tradabilityActionability(status: TradabilityStatus): number {
  switch (status) {
    case "EXECUTABLE_SHADOW":
      return 1;
    case "WATCHLIST":
      return 0.6;
    case "THEORETICAL_ONLY":
      return 0.3;
    case "RESEARCH_ONLY":
      return 0.2;
    case "FRICTION_KILLED":
    case "DATA_QUALITY_FAIL":
      return 0;
  }
}

/**
 * The strongest a card may be from its tradability tier alone. EXECUTABLE_SHADOW is shadow-executable —
 * it can support an ACTION, but never an unrestricted PUBLIC_ACTION on its own (that needs a proven,
 * live-executed tier that does not exist yet). This is meet-ed into the card's final strength so a
 * shadow tradability of "1 actionability" can never drive a card to PUBLIC_ACTION.
 */
export function tradabilityStrengthCeiling(status: TradabilityStatus): MaxPermittedStrength {
  switch (status) {
    case "EXECUTABLE_SHADOW":
      return "ACTION";
    case "WATCHLIST":
      return "WATCH";
    case "THEORETICAL_ONLY":
      return "WAIT";
    case "RESEARCH_ONLY":
    case "FRICTION_KILLED":
    case "DATA_QUALITY_FAIL":
      return "INFO_ONLY";
  }
}

/** Multiplicative conjunction of necessary gates → a strength bucket. Any zero ⇒ INFO_ONLY. */
export function computePermissionGradient(i: PermissionInputs): PermissionGradient {
  const factors: Record<keyof PermissionInputs, number> = {
    proofQuality: clamp01(i.proofQuality),
    rightsClearance: clamp01(i.rightsClearance),
    lightConeCreditable: clamp01(i.lightConeCreditable),
    requiredStatCompleteness: clamp01(i.requiredStatCompleteness),
    ghostSafety: clamp01(i.ghostSafety),
    actionability: clamp01(i.actionability),
    regimeSafety: clamp01(i.regimeSafety),
  };
  const gradient = Number(
    (
      factors.proofQuality *
      factors.rightsClearance *
      factors.lightConeCreditable *
      factors.requiredStatCompleteness *
      factors.ghostSafety *
      factors.actionability *
      factors.regimeSafety
    ).toFixed(4),
  );
  const bindingFactor = (Object.keys(factors) as Array<keyof PermissionInputs>).reduce((min, k) =>
    factors[k] < factors[min] ? k : min,
  );
  return {
    gradient,
    bucket: bucketStrength(gradient),
    factors,
    bindingFactor,
    note:
      gradient <= 0
        ? `Fail-closed: ${bindingFactor} is zero — INFO_ONLY.`
        : `Permission ${gradient} (weakest gate: ${bindingFactor}) → ${bucketStrength(gradient)}.`,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}
