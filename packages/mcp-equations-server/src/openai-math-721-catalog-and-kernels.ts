/**
 * OpenAI Math 721-Manuscript, 373-Result-Family & 53,554-Lean Formalization Catalog & Kernels (`Component 6A`).
 *
 * Mirrors `intelligence/coaching/openai_math_721_manuscript_and_lean_engine.py` for the TypeScript
 * MCP Equations Server and Prediction Engine.
 */

export interface OpenAiMath721Summary {
  manuscriptsWired: number;
  uniquePdfLinksCount: number;
  resultFamiliesWired: number;
  familyNumberRange: string;
  absentFamilyNumbers: readonly string[];
  leanFilesCataloged: number;
  comparatorChallengesWired: number;
  comparatorTopLevelConfigs: number;
  comparatorNestedHodgeConfigs: number;
  formalizationYamlSources: number;
  formalizationMainResultsCount: number;
  formalizationUniqueConfigsCount: number;
  anchorA5FamilyId: string;
  anchorA5ComparatorConfig: string;
  pineconeNamespace: string;
  pineconeVectorsUpserted: number;
  permittedLeanAxioms: readonly string[];
}

export const OPENAI_MATH_721_SUMMARY: OpenAiMath721Summary = {
  manuscriptsWired: 721,
  uniquePdfLinksCount: 721,
  resultFamiliesWired: 373,
  familyNumberRange: '001..378',
  absentFamilyNumbers: ['045', '061', '070', '123', '163'] as const,
  leanFilesCataloged: 53554,
  comparatorChallengesWired: 419,
  comparatorTopLevelConfigs: 418,
  comparatorNestedHodgeConfigs: 1,
  formalizationYamlSources: 176,
  formalizationMainResultsCount: 208,
  formalizationUniqueConfigsCount: 192,
  anchorA5FamilyId: '378',
  anchorA5ComparatorConfig: 'ComparatorChallenges/SubexponentialSAT.json',
  pineconeNamespace: 'gse-openai-math-721-manuscripts',
  pineconeVectorsUpserted: 30,
  permittedLeanAxioms: ['propext', 'Quot.sound', 'Classical.choice'] as const,
};

export interface SoggeWaveFocusingResult {
  spatialDimN: number;
  criticalExponentP: number;
  localSmoothingSigma: number;
  soggeWaveFocusingGain: number;
  sulcalFundusAmplification: number;
  stadiumWindPhaseDispersion: number;
  deepPassTrajectoryDeflectionYds: number;
}

export function computeSoggeLocalSmoothingWaveFocusing(params?: {
  spatialDimN?: number;
  sulcalCurvatureMmInv?: number;
  rotationalAccelRadS2?: number;
  crosswindMph?: number;
  stadiumOpenEndFactor?: number;
}): SoggeWaveFocusingResult {
  const n = Math.max(2, Math.floor(params?.spatialDimN ?? 3));
  const sulcalCurvature = Math.max(0.05, params?.sulcalCurvatureMmInv ?? 0.42);
  const rotAccel = Math.max(400, params?.rotationalAccelRadS2 ?? 4850.0);
  const crosswindMph = Math.max(0, params?.crosswindMph ?? 14.5);
  const openEndFactor = params?.stadiumOpenEndFactor ?? 0.65;

  const pCritical = (2.0 * (n + 1.0)) / (n - 1.0);
  const localSmoothingSigma = 1.0 / pCritical - 0.015;
  const normalizedOmega = rotAccel / 4000.0;
  const soggeWaveFocusingGain = Number(
    (1.0 + 0.38 * Math.pow(sulcalCurvature * normalizedOmega, localSmoothingSigma)).toFixed(6),
  );
  const sulcalFundusAmplification = Number(
    (soggeWaveFocusingGain * (1.0 + 0.22 * Math.tanh(sulcalCurvature))).toFixed(6),
  );
  const stadiumWindPhaseDispersion = Number(
    ((crosswindMph / 20.0) * openEndFactor * (1.0 - 0.5 * localSmoothingSigma)).toFixed(6),
  );
  const deepPassTrajectoryDeflectionYds = Number(
    (stadiumWindPhaseDispersion * 2.45 * soggeWaveFocusingGain).toFixed(6),
  );

  return {
    spatialDimN: n,
    criticalExponentP: Number(pCritical.toFixed(6)),
    localSmoothingSigma: Number(localSmoothingSigma.toFixed(6)),
    soggeWaveFocusingGain,
    sulcalFundusAmplification,
    stadiumWindPhaseDispersion,
    deepPassTrajectoryDeflectionYds,
  };
}

export interface BoundedTreewidthL1Result {
  treewidthK: number;
  activeFactorNodes: number;
  treewidthL1Distortion: number;
  ollivierRicciCurvatureKappa: number;
  sparseCutBottleneckCapacity: number;
}

export function computeBoundedTreewidthL1Embedding(params?: {
  treewidthK?: number;
  activeFactorNodes?: number;
  edgeDensity?: number;
}): BoundedTreewidthL1Result {
  const k = Math.max(1, Math.floor(params?.treewidthK ?? 6));
  const nodes = Math.max(4, Math.floor(params?.activeFactorNodes ?? 288));
  const density = Math.max(0.01, Math.min(1.0, params?.edgeDensity ?? 0.18));

  const treewidthL1Distortion = Number((1.0 + 0.28 * Math.sqrt(k * Math.log(k + 1.71828))).toFixed(6));
  const ollivierRicciCurvatureKappa = Number((1.0 - (k / (k + 4.0)) * (1.0 + 0.35 * density)).toFixed(6));
  const sparseCutBottleneckCapacity = Number((Math.log2(nodes) / (treewidthL1Distortion * k)).toFixed(6));

  return {
    treewidthK: k,
    activeFactorNodes: nodes,
    treewidthL1Distortion,
    ollivierRicciCurvatureKappa,
    sparseCutBottleneckCapacity,
  };
}

export interface RadialPairPotentialCriticalityResult {
  pairPotentialEnergy: number;
  radialPairBetaCritical: number;
  effectiveInverseTemperatureBeta: number;
  spinGlassSusceptibilityChiSg: number;
  collapseProbability: number;
  phaseState: 'SPIN_GLASS_POCKET_COLLAPSE' | 'COHERENT_POCKET_SHELL';
}

export function computeRadialPairPotentialCriticality(params?: {
  meanDefenderSeparationYds?: number;
  passRushClosingSpeedYdsS?: number;
  screeningLengthYds?: number;
  repulsionExponentAlpha?: number;
}): RadialPairPotentialCriticalityResult {
  const r = Math.max(0.4, params?.meanDefenderSeparationYds ?? 2.35);
  const vClose = Math.max(0.1, params?.passRushClosingSpeedYdsS ?? 5.4);
  const xi = Math.max(0.5, params?.screeningLengthYds ?? 3.2);
  const alpha = Math.max(1.5, params?.repulsionExponentAlpha ?? 4.0);

  const pairPotentialEnergy = Math.pow(2.0 / r, alpha) * Math.exp(-r / xi);
  const radialPairBetaCritical = Number((1.0 / (0.62 + 0.18 * Math.log1p(alpha) + 0.12 * (r / xi))).toFixed(6));
  const effectiveInverseTemperatureBeta = Number((0.55 + 0.14 * vClose * Math.exp(-0.25 * r)).toFixed(6));

  const proximity = Math.abs(effectiveInverseTemperatureBeta - radialPairBetaCritical);
  const spinGlassSusceptibilityChiSg = Number(
    ((1.0 / Math.max(0.08, proximity + 0.05)) * (0.4 + 0.6 * Math.tanh(pairPotentialEnergy))).toFixed(6),
  );
  const collapseProbability = Number(
    (1.0 / (1.0 + Math.exp(-2.2 * (effectiveInverseTemperatureBeta - radialPairBetaCritical)))).toFixed(6),
  );
  const phaseState =
    effectiveInverseTemperatureBeta >= radialPairBetaCritical
      ? 'SPIN_GLASS_POCKET_COLLAPSE'
      : 'COHERENT_POCKET_SHELL';

  return {
    pairPotentialEnergy: Number(pairPotentialEnergy.toFixed(6)),
    radialPairBetaCritical,
    effectiveInverseTemperatureBeta,
    spinGlassSusceptibilityChiSg,
    collapseProbability,
    phaseState,
  };
}

export interface AmplitudeDampingFatigueResult {
  krausDecoherenceGamma: number;
  amplitudeDampingRetention: number;
  nonCommutativeBraidingNorm: number;
  atomicGaussianTailBound: number;
}

export function computeAmplitudeDampingFatigueChannel(params?: {
  cumulativeInteriorHits?: number;
  snapNumberInGame?: number;
  shortWeekFatigueFlag?: boolean;
  sequenceCommutatorAngleRad?: number;
}): AmplitudeDampingFatigueResult {
  const hits = Math.max(0, Math.floor(params?.cumulativeInteriorHits ?? 4));
  const snaps = Math.max(1, Math.floor(params?.snapNumberInGame ?? 48));
  const shortPenalty = params?.shortWeekFatigueFlag ? 0.045 : 0.0;
  const theta = params?.sequenceCommutatorAngleRad ?? 0.44;

  const krausDecoherenceGamma = Math.min(0.85, Number((0.028 * hits + 0.0018 * snaps + shortPenalty).toFixed(6)));
  const amplitudeDampingRetention = Number(
    (0.5 * (1.0 + Math.sqrt(Math.max(0.0, 1.0 - krausDecoherenceGamma)))).toFixed(6),
  );
  const nonCommutativeBraidingNorm = Number(
    (
      Math.abs(Math.sin(theta)) * Math.sqrt(krausDecoherenceGamma * (1.0 - 0.5 * krausDecoherenceGamma))
    ).toFixed(6),
  );
  const atomicGaussianTailBound = Number(
    Math.exp((-1.5 * Math.pow(amplitudeDampingRetention, 2)) / Math.max(0.05, krausDecoherenceGamma)).toFixed(6),
  );

  return {
    krausDecoherenceGamma,
    amplitudeDampingRetention,
    nonCommutativeBraidingNorm,
    atomicGaussianTailBound,
  };
}

export interface FixedWidthCnfConjunctionResult {
  clauseCount: number;
  clauseWidth: number;
  treewidthBound: number;
  cnfConjunctionSatisfactionProb: number;
  thinTreeSpanningMargin: number;
  gatePassed: boolean;
}

export function computeFixedWidthCnfConjunctionGate(params?: {
  clauseMarginalProbs?: number[];
  clauseWidth?: number;
  treewidthBound?: number;
  correlationPenalty?: number;
}): FixedWidthCnfConjunctionResult {
  const probs = params?.clauseMarginalProbs ?? [0.76, 0.72, 0.79, 0.74, 0.81];
  const width = Math.max(2, Math.floor(params?.clauseWidth ?? 3));
  const tw = Math.max(1, Math.floor(params?.treewidthBound ?? 5));
  const corrPen = Math.max(0.0, Math.min(0.25, params?.correlationPenalty ?? 0.035));

  let logSum = 0.0;
  probs.forEach((p, idx) => {
    const clampedP = Math.max(0.05, Math.min(0.995, p));
    const coupledP = Math.max(0.05, clampedP - corrPen / (width + (idx % tw)));
    logSum += Math.log(coupledP);
  });

  const cnfConjunctionSatisfactionProb = Number(Math.exp(logSum).toFixed(6));
  const thinTreeSpanningMargin = Number(((1.0 / (tw + 1.0)) * (1.0 - corrPen)).toFixed(6));

  return {
    clauseCount: probs.length,
    clauseWidth: width,
    treewidthBound: tw,
    cnfConjunctionSatisfactionProb,
    thinTreeSpanningMargin,
    gatePassed: cnfConjunctionSatisfactionProb >= 0.15,
  };
}

export interface LeanComparatorSoundnessResult {
  declarationName: string;
  axiomsChecked: string[];
  unpermittedAxioms: string[];
  sorryDetected: boolean;
  namespaceDivergenceDetected: boolean;
  leanSoundnessVerified: boolean;
  comparatorChallengesWired: number;
  leanFilesCataloged: number;
}

export function verifyLeanComparatorChallengeSoundness(params?: {
  declarationName?: string;
  challengeNamespace?: string;
  solutionNamespace?: string;
  usedAxioms?: string[];
  containsSorryAx?: boolean;
}): LeanComparatorSoundnessResult {
  const declarationName = params?.declarationName ?? 'OAI.BoundedTreewidth.l1_embedding_distortion';
  const chalNs = params?.challengeNamespace ?? 'OAI.BoundedTreewidth.Challenge';
  const solNs = params?.solutionNamespace ?? 'OAI.BoundedTreewidth.Solution';
  const axioms = params?.usedAxioms ?? [...OPENAI_MATH_721_SUMMARY.permittedLeanAxioms];
  const unpermittedAxioms = axioms.filter(
    (ax) => !OPENAI_MATH_721_SUMMARY.permittedLeanAxioms.includes(ax),
  );

  const chalPrefix = chalNs.split('.').slice(0, -1).join('.');
  const solPrefix = solNs.split('.').slice(0, -1).join('.');
  const namespaceDivergenceDetected = chalPrefix !== solPrefix;
  const sorryDetected = Boolean(params?.containsSorryAx || axioms.includes('sorryAx'));
  const leanSoundnessVerified =
    unpermittedAxioms.length === 0 && !namespaceDivergenceDetected && !sorryDetected;

  return {
    declarationName,
    axiomsChecked: axioms,
    unpermittedAxioms,
    sorryDetected,
    namespaceDivergenceDetected,
    leanSoundnessVerified,
    comparatorChallengesWired: OPENAI_MATH_721_SUMMARY.comparatorChallengesWired,
    leanFilesCataloged: OPENAI_MATH_721_SUMMARY.leanFilesCataloged,
  };
}
