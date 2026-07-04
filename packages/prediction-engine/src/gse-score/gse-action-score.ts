import {
  assessCalibrationContract,
  type CalibrationContractInput,
  type CalibrationContractResult,
} from "./calibration-contract.js";
import {
  evaluateFeatureContract,
  type FeatureContractInput,
  type FeatureContractResult,
} from "./feature-contract.js";
import {
  aggregateModelParliament,
  type ModelParliamentInput,
  type ModelParliamentResult,
} from "./model-parliament.js";
import {
  computeNoBetStrength,
  type NoBetRiskInput,
  type NoBetStrengthResult,
} from "./no-bet-strength.js";

export type GseActionDecision = "PLAY" | "LEAN" | "WATCH" | "PASS" | "HARD_PASS";

export interface GseActionScoreInput {
  readonly marketProbability: number;
  readonly modelParliament: ModelParliamentInput;
  readonly featureContract: FeatureContractInput;
  readonly calibration: CalibrationContractInput;
  readonly additionalNoBetRisks?: readonly NoBetRiskInput[];
}

export interface GseActionDriver {
  readonly name: string;
  readonly direction: "UP" | "DOWN" | "NEUTRAL";
  readonly impact: number;
  readonly explanation: string;
}

export interface GseActionScoreResult {
  readonly score: number;
  readonly decision: GseActionDecision;
  readonly modeledProbability: number | null;
  readonly marketProbability: number;
  readonly probabilityEdge: number;
  readonly confidenceScore: number;
  readonly noBetStrength: number;
  readonly featureContract: FeatureContractResult;
  readonly calibration: CalibrationContractResult;
  readonly parliament: ModelParliamentResult;
  readonly noBet: NoBetStrengthResult;
  readonly drivers: readonly GseActionDriver[];
}

export function computeGseActionScore(input: GseActionScoreInput): GseActionScoreResult {
  const marketProbability = clamp01(input.marketProbability);
  const featureContract = evaluateFeatureContract(input.featureContract);
  const calibration = assessCalibrationContract(input.calibration);
  const parliament = aggregateModelParliament(input.modelParliament);
  const probabilityEdge =
    parliament.modeledProbability === null ? 0 : parliament.modeledProbability - marketProbability;

  const noBet = computeNoBetStrength({
    evidenceHealth: featureContract.featureHealth,
    risks: [
      ...derivedRisks(featureContract, calibration, parliament),
      ...(input.additionalNoBetRisks ?? []),
    ],
  });

  const positiveEdgeScore = clampScore((Math.max(0, probabilityEdge) / 0.08) * 40);
  const confidenceContribution = parliament.confidenceScore * 0.22;
  const featureContribution = featureContract.featureHealth * 0.18;
  const calibrationContribution = calibration.scoreModifier;
  const noBetPenalty = noBet.score * 0.72;
  const rawScore =
    18 + positiveEdgeScore + confidenceContribution + featureContribution + calibrationContribution - noBetPenalty;
  const forcedHardPass =
    noBet.decision === "HARD_PASS" || featureContract.status === "BLOCK" || parliament.status === "BLOCK";
  const score = forcedHardPass ? Math.min(24, clampScore(rawScore)) : clampScore(rawScore);

  return {
    calibration,
    confidenceScore: parliament.confidenceScore,
    decision: decide(score, noBet.decision, forcedHardPass),
    drivers: buildDrivers({
      calibrationContribution,
      confidenceContribution,
      featureContribution,
      noBetPenalty,
      positiveEdgeScore,
      probabilityEdge,
    }),
    featureContract,
    marketProbability: round4(marketProbability),
    modeledProbability: parliament.modeledProbability,
    noBet,
    noBetStrength: noBet.score,
    parliament,
    probabilityEdge: round4(probabilityEdge),
    score: round2(score),
  };
}

function derivedRisks(
  featureContract: FeatureContractResult,
  calibration: CalibrationContractResult,
  parliament: ModelParliamentResult,
): readonly NoBetRiskInput[] {
  const risks: NoBetRiskInput[] = [];

  if (featureContract.missingRequired.length > 0) {
    risks.push({
      factor: "MISSING_REQUIRED_DATA",
      hardBlock: true,
      reason: `Missing required data: ${featureContract.missingRequired.join(", ")}.`,
      severity: 1,
    });
  }
  if (featureContract.blockedSources.length > 0) {
    risks.push({
      factor: "SOURCE_RIGHTS_BLOCKED",
      hardBlock: true,
      reason: `Source rights block modeling: ${featureContract.blockedSources.join(", ")}.`,
      severity: 1,
    });
  }
  if (featureContract.staleFeatures.length > 0) {
    risks.push({
      factor: "STALE_DATA",
      hardBlock: featureContract.staleRequired.length > 0,
      reason: `Stale features: ${featureContract.staleFeatures.join(", ")}.`,
      severity: Math.min(1, featureContract.staleFeatures.length / 3),
    });
  }
  if (!calibration.probabilityClaimsAllowed) {
    risks.push({
      factor: "CALIBRATION_NOT_VALIDATED",
      reason: `Calibration status is ${calibration.status}.`,
      severity: calibration.status === "BLOCKED" || calibration.status === "DRIFTING" ? 1 : 0.65,
    });
  }
  if (parliament.disagreement > 0.08) {
    risks.push({
      factor: "MODEL_DISAGREEMENT",
      reason: `Model disagreement is ${parliament.disagreement}.`,
      severity: Math.min(1, parliament.disagreement / 0.16),
    });
  }

  return risks;
}

function decide(score: number, noBetDecision: NoBetStrengthResult["decision"], forcedHardPass: boolean): GseActionDecision {
  if (forcedHardPass) return "HARD_PASS";
  if (noBetDecision === "SOFT_PASS" || score < 35) return "PASS";
  if (score >= 72) return "PLAY";
  if (score >= 55) return "LEAN";
  return "WATCH";
}

function buildDrivers(input: {
  readonly positiveEdgeScore: number;
  readonly confidenceContribution: number;
  readonly featureContribution: number;
  readonly calibrationContribution: number;
  readonly noBetPenalty: number;
  readonly probabilityEdge: number;
}): readonly GseActionDriver[] {
  const drivers: GseActionDriver[] = [
    {
      direction: input.positiveEdgeScore > 0 ? "UP" : "NEUTRAL",
      explanation: `Positive model-vs-market edge is ${round4(input.probabilityEdge)}.`,
      impact: round2(input.positiveEdgeScore),
      name: "probability_edge",
    },
    {
      direction: "UP",
      explanation: "Model parliament confidence contributes to decision quality, not win probability.",
      impact: round2(input.confidenceContribution),
      name: "parliament_confidence",
    },
    {
      direction: "UP",
      explanation: "Feature contract health contributes only when source and freshness checks survive.",
      impact: round2(input.featureContribution),
      name: "feature_contract",
    },
    {
      direction: input.calibrationContribution >= 0 ? "UP" : "DOWN",
      explanation: "Calibration contract controls whether probability claims are earned.",
      impact: round2(input.calibrationContribution),
      name: "calibration_contract",
    },
    {
      direction: input.noBetPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "No-bet pressure suppresses action even when expected value looks attractive.",
      impact: -round2(input.noBetPenalty),
      name: "no_bet_governor",
    },
  ];

  return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
