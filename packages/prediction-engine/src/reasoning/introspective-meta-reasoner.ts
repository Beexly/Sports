/**
 * Stream 5: Theory of Epistemic Abductive Geometry (TEAG, OpenAlex W7223010684),
 * Navier–Stokes STOPPED-FORCE Multi-Scale Refinement Gate, Grujić Cross-Diffusion (arXiv:2609.05720),
 * Toomre Torsion Stability (OpenAlex W7222928081), & Physics-Informed Sobol Sensitivity (arXiv:2608.17248).
 */

export const TOOMRE_TL = 0.136899099984016;

export function teagContraction(phiMinus: number, psi: number): number {
  if (!Number.isFinite(phiMinus) || !Number.isFinite(psi)) {
    throw new Error("teagContraction: non-finite input");
  }
  return Math.max(phiMinus, psi);
}

export function falsifiabilityFloorHolds(nK: number, iK: number): boolean {
  if (!Number.isFinite(nK) || !Number.isFinite(iK)) return false;
  return nK >= 1 - iK;
}

export function gaussianCollapseWeight(w: number, w0: number): number {
  if (!(w0 > 0) || !Number.isFinite(w) || w < 0) return Number.NaN;
  return Math.exp(-w / w0);
}

export function toomreTorsion(b: number, p: number): { tau: number; aboveTl: boolean } | null {
  if (!Number.isFinite(b) || !Number.isFinite(p) || p === 0) return null;
  const tau = b / p;
  return { tau, aboveTl: tau > TOOMRE_TL };
}

export interface GridResidual {
  readonly label: string;
  readonly residual: number;
}

/** STOPPED-FORCE gate: refinement must not increase the residual. */
export function multiScaleRefinementHolds(grids: readonly GridResidual[]): boolean {
  if (grids.length < 2) return false;
  for (const g of grids) {
    if (!Number.isFinite(g.residual) || g.residual < 0) return false;
  }
  for (let i = 1; i < grids.length; i++) {
    if (grids[i].residual > grids[i - 1].residual) return false;
  }
  return true;
}

export interface TeagHypothesisPoint {
  readonly id: string;
  readonly phiMinus: number;
  readonly psiAnomaly: number;
  readonly falsifiabilityNk: number;
  readonly identifiabilityIk: number;
}

export interface TeagEvaluationResult {
  readonly admissibleIds: readonly string[];
  readonly activeDeformationIds: readonly string[];
  readonly falsifiedIds: readonly string[];
  readonly collapseWeight: number;
  readonly pcrbAdmissibleFraction: number;
}

export function evaluateTeagEpistemicContraction(
  hypotheses: readonly TeagHypothesisPoint[],
  admissibilityCapEta = 1.0,
  basinVolumeW = 0.25,
  referenceVolumeW0 = 1.0,
): TeagEvaluationResult {
  const admissibleIds: string[] = [];
  const activeDeformationIds: string[] = [];
  const falsifiedIds: string[] = [];

  for (const h of hypotheses) {
    const phiPlus = teagContraction(h.phiMinus, h.psiAnomaly);
    const floorOk = falsifiabilityFloorHolds(h.falsifiabilityNk, h.identifiabilityIk);
    if (h.psiAnomaly > h.phiMinus) {
      activeDeformationIds.push(h.id);
    }
    if (phiPlus <= admissibilityCapEta && floorOk) {
      admissibleIds.push(h.id);
    } else {
      falsifiedIds.push(h.id);
    }
  }

  const collapseWeight = gaussianCollapseWeight(basinVolumeW, referenceVolumeW0);
  const pcrbAdmissibleFraction =
    hypotheses.length > 0 ? Number((admissibleIds.length / hypotheses.length).toFixed(4)) : 0;

  return {
    admissibleIds,
    activeDeformationIds,
    falsifiedIds,
    collapseWeight: Number.isFinite(collapseWeight) ? Number(collapseWeight.toFixed(6)) : 0,
    pcrbAdmissibleFraction,
  };
}

export function evaluateMultiScaleRefinementResidual(grids: readonly GridResidual[]): {
  readonly classification: "CONVERGENT_REFINEMENT" | "STOPPED_FORCE" | "INVALID_GRIDS";
  readonly holds: boolean;
  readonly fineToCoarseRatio: number | null;
} {
  if (grids.length < 2) {
    return { classification: "INVALID_GRIDS", holds: false, fineToCoarseRatio: null };
  }
  const holds = multiScaleRefinementHolds(grids);
  const coarse = grids[0].residual;
  const fine = grids[grids.length - 1].residual;
  const fineToCoarseRatio = coarse > 0 ? Number((fine / coarse).toFixed(4)) : null;
  const classification =
    holds && fineToCoarseRatio !== null && fineToCoarseRatio < 0.85
      ? "CONVERGENT_REFINEMENT"
      : "STOPPED_FORCE";
  return { classification, holds, fineToCoarseRatio };
}

export function evaluateDriftAdvectionPhaseTransition(input: {
  readonly viscosityNu: number;
  readonly coreRadiusR: number;
  readonly inwardAdvectionSpeed: number;
  readonly holderHalfModulus: number;
  readonly torsionB?: number;
  readonly generalizedForceP?: number;
}): {
  readonly outwardCrossDiffusionDrift: number;
  readonly driftAdvectionRatioLambda: number;
  readonly geometricDepletionEnforced: boolean;
  readonly toomreTau: number | null;
  readonly toomreStable: boolean;
} {
  const r = Math.max(input.coreRadiusR, 1e-6);
  const outwardCrossDiffusionDrift = (4 * Math.max(0, input.viscosityNu)) / r;
  const adv = Math.max(Math.abs(input.inwardAdvectionSpeed), 1e-6);
  const driftAdvectionRatioLambda = Number((outwardCrossDiffusionDrift / adv).toFixed(4));
  const geometricDepletionEnforced = driftAdvectionRatioLambda >= 1.0 && input.holderHalfModulus <= 2.5;
  const tRes =
    input.torsionB !== undefined && input.generalizedForceP !== undefined
      ? toomreTorsion(input.torsionB, input.generalizedForceP)
      : null;
  return {
    outwardCrossDiffusionDrift: Number(outwardCrossDiffusionDrift.toFixed(6)),
    driftAdvectionRatioLambda,
    geometricDepletionEnforced,
    toomreTau: tRes ? Number(tRes.tau.toFixed(6)) : null,
    toomreStable: tRes ? !tRes.aboveTl : true,
  };
}

export function computePhysicsInformedSobolSensitivity(
  firstOrderVariances: readonly number[],
  totalEffectVariances: readonly number[],
  totalOutputVariance: number,
): {
  readonly firstOrderIndices: readonly number[];
  readonly totalEffectIndices: readonly number[];
  readonly interactionMass: number;
  readonly dominantFactorIndex: number;
} {
  if (!(totalOutputVariance > 0) || firstOrderVariances.length === 0) {
    return { firstOrderIndices: [], totalEffectIndices: [], interactionMass: 0, dominantFactorIndex: -1 };
  }
  const s1 = firstOrderVariances.map((v) => Number(Math.max(0, v / totalOutputVariance).toFixed(4)));
  const st = totalEffectVariances.map((v, i) =>
    Number(Math.max(s1[i] ?? 0, v / totalOutputVariance).toFixed(4)),
  );
  const interactionMass = Number(
    Math.max(0, st.reduce((a, b) => a + b, 0) - s1.reduce((a, b) => a + b, 0)).toFixed(4),
  );
  let dominantFactorIndex = 0;
  for (let i = 1; i < st.length; i++) {
    if (st[i] > st[dominantFactorIndex]) dominantFactorIndex = i;
  }
  return {
    firstOrderIndices: s1,
    totalEffectIndices: st,
    interactionMass,
    dominantFactorIndex,
  };
}

export function runCounterfactualSelfInterrogation(input: {
  readonly modelProb: number;
  readonly marketFairProb: number;
  readonly gridResiduals: readonly GridResidual[];
  readonly hypotheses: readonly TeagHypothesisPoint[];
}): {
  readonly rawEdge: number;
  readonly epistemicConfidenceMultiplier: number;
  readonly adjustedProb: number;
  readonly decision: "PUBLISH" | "ABSTAIN_STOPPED_FORCE" | "ABSTAIN_FALSIFIED";
} {
  const rawEdge = input.modelProb - input.marketFairProb;
  const ns = evaluateMultiScaleRefinementResidual(input.gridResiduals);
  const teag = evaluateTeagEpistemicContraction(input.hypotheses);
  if (!ns.holds) {
    return {
      rawEdge: Number(rawEdge.toFixed(4)),
      epistemicConfidenceMultiplier: 0,
      adjustedProb: input.marketFairProb,
      decision: "ABSTAIN_STOPPED_FORCE",
    };
  }
  if (teag.pcrbAdmissibleFraction <= 0) {
    return {
      rawEdge: Number(rawEdge.toFixed(4)),
      epistemicConfidenceMultiplier: 0,
      adjustedProb: input.marketFairProb,
      decision: "ABSTAIN_FALSIFIED",
    };
  }
  const mult = Number((teag.pcrbAdmissibleFraction * teag.collapseWeight).toFixed(4));
  const adjustedProb = Number((input.marketFairProb + rawEdge * mult).toFixed(4));
  return {
    rawEdge: Number(rawEdge.toFixed(4)),
    epistemicConfidenceMultiplier: mult,
    adjustedProb,
    decision: Math.abs(adjustedProb - input.marketFairProb) >= 0.015 ? "PUBLISH" : "ABSTAIN_FALSIFIED",
  };
}
