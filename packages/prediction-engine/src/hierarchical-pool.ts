/**
 * hierarchical-pool.ts — Hierarchical Bayesian Pooling across 8 Signal Families.
 *
 * Solves the 400-of-500 null abstention problem at scale:
 *  - Abstaining signals remain strictly silent (zero precision, zero weight).
 *  - Active signals are pooled within their natural family using inverse-variance precision weighting.
 *  - Families are pooled into an ensemble with evidence-dependent shrinkage (S_evidence).
 *  - Low signal cardinality shrinks toward the market prior rather than fabricating false conviction.
 */

import { SignalFamily } from "@sports/types";

export interface IndividualSignalInput {
  readonly signalId: string;
  readonly family: SignalFamily;
  readonly estimatedEdge: number; // Log-odds or probability delta vs market
  readonly variance?: number; // Estimated variance (default: derived from sample size / confidence)
  readonly sampleSize?: number;
  readonly isEligible: boolean;
}

export interface FamilyAggregation {
  readonly family: SignalFamily;
  readonly activeCount: number;
  readonly pooledEdge: number;
  readonly totalPrecision: number;
  readonly familyWeight: number;
}

export interface HierarchicalPoolResult {
  readonly blendedEdge: number;
  readonly rawEnsembleEdge: number;
  readonly shrinkageFactor: number;
  readonly activeFamilyCount: number;
  readonly totalActiveSignals: number;
  readonly families: Record<string, FamilyAggregation>;
  readonly calibratedWinProbability: number;
  readonly agreementLevel: "SOLO" | "WEAK" | "CONSENSUS" | "STRONG_CONVERGENCE";
}

const DEFAULT_FAMILY_PRIOR_WEIGHTS: Record<SignalFamily, number> = {
  MARKET: 0.28,
  EFFICIENCY: 0.22,
  TRENCHES: 0.14,
  SITUATIONAL: 0.12,
  MICROCLIMATE: 0.08,
  MARKET_MICROSTRUCTURE: 0.06,
  LUCK: 0.05,
  NARRATIVE: 0.05,
};

const DEFAULT_SHRINKAGE_LAMBDA = 2.5;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function logit(p: number): number {
  const clamped = Math.max(1e-5, Math.min(1 - 1e-5, p));
  return Math.log(clamped / (1 - clamped));
}

/**
 * Pools active signals across families using hierarchical Bayesian shrinkage.
 */
export function poolSignalsHierarchically(
  signals: readonly (IndividualSignalInput | null | undefined)[],
  marketFairProb: number = 0.50,
  options?: {
    readonly shrinkageLambda?: number;
    readonly familyWeights?: Partial<Record<SignalFamily, number>>;
  }
): HierarchicalPoolResult {
  const lambda = options?.shrinkageLambda ?? DEFAULT_SHRINKAGE_LAMBDA;
  const familyWeights = { ...DEFAULT_FAMILY_PRIOR_WEIGHTS, ...(options?.familyWeights ?? {}) };

  // Group active signals by family
  const familyMap = new Map<SignalFamily, IndividualSignalInput[]>();

  for (const s of signals) {
    if (!s || !s.isEligible || !Number.isFinite(s.estimatedEdge)) {
      continue; // Abstention: zero vote, zero precision
    }
    const list = familyMap.get(s.family) ?? [];
    list.push(s);
    familyMap.set(s.family, list);
  }

  const familyAggs: Record<string, FamilyAggregation> = {};
  let totalEvidenceWeight = 0.0;
  let weightedEdgeSum = 0.0;
  let normalizedWeightSum = 0.0;
  let totalActive = 0;

  for (const [family, familySignals] of familyMap.entries()) {
    if (familySignals.length === 0) continue;

    let sumPrecision = 0.0;
    let sumPrecisionWeightedEdge = 0.0;

    for (const sig of familySignals) {
      // Default variance: 0.04 (SE = 0.20) if unspecified, or inversely proportional to sample size
      const sampleN = sig.sampleSize ?? 100;
      const v = sig.variance && sig.variance > 0 ? sig.variance : Math.max(0.005, 4.0 / sampleN);
      const prec = 1.0 / v;

      sumPrecision += prec;
      sumPrecisionWeightedEdge += prec * sig.estimatedEdge;
      totalActive += 1;
    }

    const pooledFamilyEdge = sumPrecision > 0 ? sumPrecisionWeightedEdge / sumPrecision : 0.0;
    const baseWeight = familyWeights[family] ?? 0.10;
    // Saturation factor: having 4 signals in a family gives full family base weight, 1 signal gives 50%
    const saturation = Math.min(1.0, Math.sqrt(familySignals.length) / 2.0);
    const effectiveFamilyWeight = baseWeight * saturation;

    familyAggs[family] = {
      family,
      activeCount: familySignals.length,
      pooledEdge: Number(pooledFamilyEdge.toFixed(4)),
      totalPrecision: Number(sumPrecision.toFixed(2)),
      familyWeight: Number(effectiveFamilyWeight.toFixed(4)),
    };

    totalEvidenceWeight += effectiveFamilyWeight;
    weightedEdgeSum += effectiveFamilyWeight * pooledFamilyEdge;
    normalizedWeightSum += effectiveFamilyWeight;
  }

  const activeFamilyCount = Object.keys(familyAggs).length;
  const rawEnsemble = normalizedWeightSum > 0 ? weightedEdgeSum / normalizedWeightSum : 0.0;

  // Shrinkage towards market prior:
  // When evidence is low (e.g. only 1 family active with small weight), S_evidence shrinks edge towards 0
  const shrinkage = totalEvidenceWeight / (totalEvidenceWeight + lambda);
  const blendedEdge = rawEnsemble * shrinkage;

  // Derive calibrated win probability from market logit + shrunk edge
  const marketLogit = logit(marketFairProb);
  const calibratedP = sigmoid(marketLogit + blendedEdge);

  let agreement: HierarchicalPoolResult["agreementLevel"] = "SOLO";
  if (activeFamilyCount >= 4) agreement = "STRONG_CONVERGENCE";
  else if (activeFamilyCount >= 2) agreement = "CONSENSUS";
  else if (totalActive >= 2) agreement = "WEAK";

  return {
    blendedEdge: Number(blendedEdge.toFixed(4)),
    rawEnsembleEdge: Number(rawEnsemble.toFixed(4)),
    shrinkageFactor: Number(shrinkage.toFixed(4)),
    activeFamilyCount,
    totalActiveSignals: totalActive,
    families: familyAggs,
    calibratedWinProbability: Number(calibratedP.toFixed(4)),
    agreementLevel: agreement,
  };
}
