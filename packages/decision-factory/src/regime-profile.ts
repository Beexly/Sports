/**
 * DECISION FACTORY — Product Regime Profile (dynamic homeostasis).
 *
 * The organism behaves differently under stress. A Regime Brain maps the engine's 10 market regimes
 * (`classifyRegime`) to a product regime and reconfigures the cockpit: cadence, how many cards a
 * surface shows, and — the key safety correction — it OBSERVES MORE but RECOMMENDS LESS under shock
 * (watch threshold drops, action threshold and proof requirement rise). It never re-tunes by vibe;
 * it reuses the engine's `suppressAction` flag. Pure + deterministic.
 */

import { type RegimeInputs, type Regime, classifyRegime } from "@sports/engine";

export type ProductRegime = "CALM" | "DEVELOPING" | "SHOCK" | "PRE_LOCK" | "SETTLEMENT" | "OFFSEASON";
export type PublicLanguageMode = "calm" | "careful" | "urgent" | "settlement";

export interface RegimeProfile {
  readonly productRegime: ProductRegime;
  readonly marketRegime: Regime;
  readonly observationCadenceMultiplier: number; // >1 = observe more often
  readonly cardSurfaceLimit: number;             // max cards a surface shows
  readonly watchThresholdDelta: number;          // <0 ⇒ surface MORE watch cards
  readonly actionThresholdDelta: number;         // >0 ⇒ require MORE to act
  readonly proofRequirementDelta: number;        // >0 ⇒ require MORE proof to act
  readonly publicLanguageMode: PublicLanguageMode;
  readonly regimeSafety: number;                 // 0 if the regime suppresses action, else 1
  readonly suppressAction: boolean;
  readonly note: string;
}

function mapRegime(market: Regime): ProductRegime {
  switch (market) {
    case "CalmConsensus":
      return "CALM";
    case "PreCloseCompression":
      return "PRE_LOCK";
    case "ThinSalientShock":
    case "FalseRumorFog":
    case "LiquidityTrap":
    case "BookCopycatCascade":
      return "SHOCK";
    case "PublicOverreaction":
    case "SharpEarlyAbsorption":
    case "DerivativeStaleness":
    case "AltTailFracture":
      return "DEVELOPING";
  }
}

const PROFILES: Readonly<Record<ProductRegime, Omit<RegimeProfile, "marketRegime" | "regimeSafety" | "suppressAction" | "note">>> = {
  CALM: { productRegime: "CALM", observationCadenceMultiplier: 1, cardSurfaceLimit: 5, watchThresholdDelta: 0, actionThresholdDelta: 0, proofRequirementDelta: 0, publicLanguageMode: "calm" },
  DEVELOPING: { productRegime: "DEVELOPING", observationCadenceMultiplier: 1.5, cardSurfaceLimit: 8, watchThresholdDelta: -0.05, actionThresholdDelta: 0.05, proofRequirementDelta: 0.05, publicLanguageMode: "careful" },
  // Shock: observe MORE (cadence up, surface up, watch threshold down) but ACT LESS (action + proof up).
  SHOCK: { productRegime: "SHOCK", observationCadenceMultiplier: 3, cardSurfaceLimit: 12, watchThresholdDelta: -0.1, actionThresholdDelta: 0.15, proofRequirementDelta: 0.15, publicLanguageMode: "urgent" },
  PRE_LOCK: { productRegime: "PRE_LOCK", observationCadenceMultiplier: 4, cardSurfaceLimit: 8, watchThresholdDelta: -0.05, actionThresholdDelta: 0.1, proofRequirementDelta: 0.1, publicLanguageMode: "careful" },
  SETTLEMENT: { productRegime: "SETTLEMENT", observationCadenceMultiplier: 0.5, cardSurfaceLimit: 3, watchThresholdDelta: 0, actionThresholdDelta: 0, proofRequirementDelta: 0, publicLanguageMode: "settlement" },
  OFFSEASON: { productRegime: "OFFSEASON", observationCadenceMultiplier: 0.2, cardSurfaceLimit: 2, watchThresholdDelta: 0, actionThresholdDelta: 0, proofRequirementDelta: 0, publicLanguageMode: "calm" },
};

/** Derive the product regime profile from the market state. */
export function deriveRegimeProfile(x: RegimeInputs): RegimeProfile {
  const verdict = classifyRegime(x);
  const productRegime = mapRegime(verdict.regime);
  const base = PROFILES[productRegime];
  return {
    ...base,
    marketRegime: verdict.regime,
    regimeSafety: verdict.suppressAction ? 0 : 1,
    suppressAction: verdict.suppressAction,
    note: `${verdict.regime} → ${productRegime}: ${verdict.suppressAction ? "observe, do not act (suppress)" : "act within proof"}; ${base.publicLanguageMode} tone.`,
  };
}
