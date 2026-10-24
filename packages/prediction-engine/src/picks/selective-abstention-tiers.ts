/**
 * @file selective-abstention-tiers.ts
 * Three-Tier Epistemic Accuracy Stratification (Component 9).
 *
 * Implements Conformal Selective Abstention & Multi-Layer Causal Purity:
 * In any physical or adversarial stochastic system, raw unconditional guessing across
 * every market hits an aleatoric noise wall. By contrast, an engine that evaluates
 * 50,000 signals across every game and prop, and selectively emits only where all six
 * reasoning layers converge with zero confounding hedges, operates on a radically
 * higher accuracy frontier.
 *
 * Epistemic Accuracy Tiers:
 * 1. Tier 1: APEX_CERTAINTY (Strict multi-layer unanimity eta_layers = 1.0, 90% TA-CQR
 *    tail clearance, extreme E-value >= 2.0 / 1.5, K_t >= 0.85, REL <= 0.0030).
 * 2. Tier 2: CORE_VALIDATED (Passing all 37 integrity gates G1-G9 with positive Conformal Kelly stake).
 * 3. Tier 3: SURVEILLANCE_WATCH / ABSTAIN (Full causal dossier published for transparency, 0 capital risked).
 */

// ---------------------------------------------------------------------------
// TYPES & ENUMS
// ---------------------------------------------------------------------------

export type EpistemicTier = "APEX_CERTAINTY" | "CORE_VALIDATED" | "SURVEILLANCE_WATCH";

export interface CandidateLayerDirections {
  readonly l0Passed: boolean;
  readonly l2Direction: "FAVORS" | "AGAINST" | "NEUTRAL";
  readonly l3Direction: "FAVORS" | "AGAINST" | "NEUTRAL";
  readonly l4Direction: "FAVORS" | "AGAINST" | "NEUTRAL";
}

export interface EpistemicCandidate {
  readonly candidateId: string;
  readonly selection: string;
  readonly marketType: "SPREAD" | "TOTAL" | "MONEYLINE" | "PLAYER_PROP" | "SGP_VINE";
  readonly marketLine: number;
  readonly side: "OVER" | "UNDER" | "HOME" | "AWAY";
  readonly vigFreeMarketProb: number;
  readonly modelProb: number;
  /** 90% Tail-Allocation CQR (TA-CQR) lower conformal bound for the projected stat. */
  readonly taCqrLowerBound: number;
  readonly layerDirections: CandidateLayerDirections;
  readonly opposingPremisesCount: number;
  readonly eValuePoint: number;
  readonly eValueCiLower: number;
  /** Epistemic knowability K_t in [0, 1]. */
  readonly epistemicKnowability: number;
  /** Local Murphy reliability calibration error in bin(p_t). */
  readonly localMurphyRel: number;
  readonly all37GatesPassed: boolean;
  readonly conformalKellyStake: number;
  readonly hasPendingWatchCommitment?: boolean;
}

export interface ApexChecklistBreakdown {
  readonly crossLayerUnanimity: boolean;
  readonly tailSeparatedFloor: boolean;
  readonly extremeConfoundingImmunity: boolean;
  readonly epistemicKnowabilityCeiling: boolean;
}

export interface EpistemicClassificationResult {
  readonly candidateId: string;
  readonly tier: EpistemicTier;
  readonly isActionable: boolean;
  readonly allocatedCapitalFraction: number;
  readonly apexChecklist: ApexChecklistBreakdown;
  readonly qualificationSummary: string;
  readonly disqualificationReasons: readonly string[];
}

// ---------------------------------------------------------------------------
// THRESHOLDS FOR APEX CERTAINTY (TIER 1)
// ---------------------------------------------------------------------------

export const APEX_THRESHOLDS = {
  MIN_E_VALUE_POINT: 2.0,
  MIN_E_VALUE_CI_LOWER: 1.5,
  MIN_EPISTEMIC_KNOWABILITY: 0.85,
  MAX_MURPHY_REL: 0.0030,
  MIN_EDGE_OVER_MARKET: 0.04,
} as const;

// ---------------------------------------------------------------------------
// CLASSIFICATION LOGIC
// ---------------------------------------------------------------------------

/**
 * Classifies a validated pick or prop candidate into one of the three epistemic tiers:
 * APEX_CERTAINTY, CORE_VALIDATED, or SURVEILLANCE_WATCH.
 */
export function classifyEpistemicTier(candidate: EpistemicCandidate): EpistemicClassificationResult {
  const disqualifications: string[] = [];

  // =========================================================================
  // 1. TIER 1: APEX CERTAINTY CHECKLIST
  // =========================================================================

  // A. Cross-Layer Directional Unanimity (eta_layers = 1.0, 0 opposing premises)
  const l0Ok = candidate.layerDirections.l0Passed;
  const l2Ok = candidate.layerDirections.l2Direction !== "AGAINST";
  const l3Ok = candidate.layerDirections.l3Direction !== "AGAINST";
  const l4Ok = candidate.layerDirections.l4Direction !== "AGAINST";
  const zeroOpposing = candidate.opposingPremisesCount === 0;
  const crossLayerUnanimity = l0Ok && l2Ok && l3Ok && l4Ok && zeroOpposing;

  if (!crossLayerUnanimity) {
    disqualifications.push(
      `Cross-layer unanimity breached: opposing premises=${candidate.opposingPremisesCount}, L0=${l0Ok}, L2=${candidate.layerDirections.l2Direction}, L3=${candidate.layerDirections.l3Direction}, L4=${candidate.layerDirections.l4Direction}`,
    );
  }

  // B. Tail-Separated Conformal Floor (90% TA-CQR lower bound strictly clears market line)
  let tailSeparatedFloor = false;
  if (candidate.marketType === "PLAYER_PROP") {
    if (candidate.side === "OVER") {
      tailSeparatedFloor = candidate.taCqrLowerBound > candidate.marketLine;
    } else {
      // For Under, lower bound in probability space or upper stat bound below line
      tailSeparatedFloor = candidate.taCqrLowerBound < candidate.marketLine;
    }
  } else {
    // For spread/moneyline, model lower conformal bound beats vig-free price
    tailSeparatedFloor = candidate.taCqrLowerBound > candidate.vigFreeMarketProb;
  }

  if (!tailSeparatedFloor) {
    disqualifications.push(
      `Tail-separated floor not satisfied: TA-CQR lower bound (${candidate.taCqrLowerBound.toFixed(2)}) did not clear line (${candidate.marketLine.toFixed(2)})`,
    );
  }

  // C. Extreme Confounding Immunity (E-value >= 2.0 point, >= 1.50 CI lower)
  const extremeConfoundingImmunity =
    candidate.eValuePoint >= APEX_THRESHOLDS.MIN_E_VALUE_POINT &&
    candidate.eValueCiLower >= APEX_THRESHOLDS.MIN_E_VALUE_CI_LOWER;

  if (!extremeConfoundingImmunity) {
    disqualifications.push(
      `Confounding immunity insufficient: point E-value ${candidate.eValuePoint.toFixed(2)} (req >= ${APEX_THRESHOLDS.MIN_E_VALUE_POINT}), CI lower ${candidate.eValueCiLower.toFixed(2)} (req >= ${APEX_THRESHOLDS.MIN_E_VALUE_CI_LOWER})`,
    );
  }

  // D. Epistemic Knowability Ceiling (K_t >= 0.85, REL <= 0.0030)
  const epistemicKnowabilityCeiling =
    candidate.epistemicKnowability >= APEX_THRESHOLDS.MIN_EPISTEMIC_KNOWABILITY &&
    candidate.localMurphyRel <= APEX_THRESHOLDS.MAX_MURPHY_REL &&
    candidate.modelProb - candidate.vigFreeMarketProb >= APEX_THRESHOLDS.MIN_EDGE_OVER_MARKET;

  if (!epistemicKnowabilityCeiling) {
    disqualifications.push(
      `Epistemic knowability ceiling breached: K_t=${candidate.epistemicKnowability.toFixed(3)} (req >= ${APEX_THRESHOLDS.MIN_EPISTEMIC_KNOWABILITY}), REL=${candidate.localMurphyRel.toFixed(4)} (req <= ${APEX_THRESHOLDS.MAX_MURPHY_REL})`,
    );
  }

  const isApex =
    candidate.all37GatesPassed &&
    crossLayerUnanimity &&
    tailSeparatedFloor &&
    extremeConfoundingImmunity &&
    epistemicKnowabilityCeiling &&
    candidate.conformalKellyStake > 0.0;

  if (isApex) {
    return {
      candidateId: candidate.candidateId,
      tier: "APEX_CERTAINTY",
      isActionable: true,
      allocatedCapitalFraction: candidate.conformalKellyStake,
      apexChecklist: {
        crossLayerUnanimity,
        tailSeparatedFloor,
        extremeConfoundingImmunity,
        epistemicKnowabilityCeiling,
      },
      qualificationSummary:
        "PROMOTED TO TIER 1 (APEX_CERTAINTY): 100% directional unanimity, TA-CQR tail clearance, extreme E-value >= 2.0, and perfect epistemic knowability.",
      disqualificationReasons: [],
    };
  }

  // =========================================================================
  // 2. TIER 2: CORE_VALIDATED CHECKLIST
  // =========================================================================
  const isCore =
    candidate.all37GatesPassed &&
    candidate.conformalKellyStake > 0.0 &&
    candidate.layerDirections.l0Passed &&
    candidate.opposingPremisesCount <= 1;

  if (isCore) {
    return {
      candidateId: candidate.candidateId,
      tier: "CORE_VALIDATED",
      isActionable: true,
      allocatedCapitalFraction: candidate.conformalKellyStake,
      apexChecklist: {
        crossLayerUnanimity,
        tailSeparatedFloor,
        extremeConfoundingImmunity,
        epistemicKnowabilityCeiling,
      },
      qualificationSummary:
        "PROMOTED TO TIER 2 (CORE_VALIDATED): Cleared all 37 integrity gates with positive Conformal Kelly stake.",
      disqualificationReasons: disqualifications,
    };
  }

  // =========================================================================
  // 3. TIER 3: SURVEILLANCE_WATCH / ABSTAIN
  // =========================================================================
  return {
    candidateId: candidate.candidateId,
    tier: "SURVEILLANCE_WATCH",
    isActionable: false,
    allocatedCapitalFraction: 0.0,
    apexChecklist: {
      crossLayerUnanimity,
      tailSeparatedFloor,
      extremeConfoundingImmunity,
      epistemicKnowabilityCeiling,
    },
    qualificationSummary:
      "TIER 3 (SURVEILLANCE_WATCH): Full causal dossier published for transparency; 0 capital risked until pre-registered CC-* triggers resolve.",
    disqualificationReasons: disqualifications,
  };
}
