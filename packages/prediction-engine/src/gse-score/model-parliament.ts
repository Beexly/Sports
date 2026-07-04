export type ModelParliamentStatus = "OK" | "WARN" | "BLOCK";

export interface ModelVote {
  readonly modelId: string;
  readonly probability: number;
  readonly confidence: number;
  readonly evidenceWeight?: number;
  readonly stale?: boolean;
}

export interface ModelParliamentInput {
  readonly votes: readonly ModelVote[];
  readonly maxDisagreement?: number;
}

export interface ModelParliamentDriver {
  readonly name: string;
  readonly impact: number;
  readonly explanation: string;
}

export interface ModelParliamentResult {
  readonly status: ModelParliamentStatus;
  readonly modeledProbability: number | null;
  readonly confidenceScore: number;
  readonly disagreement: number;
  readonly votesUsed: number;
  readonly warnings: readonly string[];
  readonly drivers: readonly ModelParliamentDriver[];
}

export function aggregateModelParliament(input: ModelParliamentInput): ModelParliamentResult {
  const validVotes = input.votes.filter(
    (vote) =>
      Number.isFinite(vote.probability) &&
      vote.probability >= 0 &&
      vote.probability <= 1 &&
      Number.isFinite(vote.confidence) &&
      vote.confidence > 0,
  );

  if (validVotes.length === 0) {
    return {
      confidenceScore: 0,
      disagreement: 1,
      drivers: [
        {
          explanation: "No valid model vote is available.",
          impact: -100,
          name: "no_valid_votes",
        },
      ],
      modeledProbability: null,
      status: "BLOCK",
      votesUsed: 0,
      warnings: ["No valid model vote is available."],
    };
  }

  const weightedVotes = validVotes.map((vote) => {
    const confidence = clamp01(vote.confidence);
    const evidenceWeight = Math.max(0, vote.evidenceWeight ?? 1);
    const freshnessFactor = vote.stale ? 0.45 : 1;
    const effectiveWeight = confidence * evidenceWeight * freshnessFactor;
    return { ...vote, effectiveWeight };
  });

  const totalWeight = weightedVotes.reduce((sum, vote) => sum + vote.effectiveWeight, 0);
  if (totalWeight <= 0) {
    return {
      confidenceScore: 0,
      disagreement: 1,
      drivers: [{ explanation: "Model votes have no effective weight.", impact: -100, name: "zero_vote_weight" }],
      modeledProbability: null,
      status: "BLOCK",
      votesUsed: 0,
      warnings: ["Model votes have no effective weight."],
    };
  }

  const modeledProbability = weightedVotes.reduce(
    (sum, vote) => sum + vote.probability * vote.effectiveWeight,
    0,
  ) / totalWeight;
  const disagreement =
    weightedVotes.reduce(
      (sum, vote) => sum + Math.abs(vote.probability - modeledProbability) * vote.effectiveWeight,
      0,
    ) / totalWeight;
  const averageConfidence =
    weightedVotes.reduce((sum, vote) => sum + clamp01(vote.confidence) * vote.effectiveWeight, 0) / totalWeight;
  const maxDisagreement = input.maxDisagreement ?? 0.12;
  const disagreementPenalty = Math.min(1, disagreement / maxDisagreement);
  const confidenceScore = clampScore(averageConfidence * 100 - disagreementPenalty * 35);
  const staleCount = validVotes.filter((vote) => vote.stale).length;
  const warnings: string[] = [];

  if (staleCount > 0) warnings.push(`${staleCount} model vote(s) were marked stale.`);
  if (disagreement > maxDisagreement) warnings.push(`Model disagreement ${round4(disagreement)} exceeds ${maxDisagreement}.`);

  const status: ModelParliamentStatus =
    disagreement > maxDisagreement ? "WARN" : confidenceScore < 35 ? "WARN" : "OK";

  return {
    confidenceScore: round2(confidenceScore),
    disagreement: round4(disagreement),
    drivers: [
      {
        explanation: `${validVotes.length} valid model vote(s) produced the modeled probability.`,
        impact: round2(averageConfidence * 100),
        name: "model_vote_quality",
      },
      {
        explanation: `Model disagreement is ${round4(disagreement)}.`,
        impact: -round2(disagreementPenalty * 35),
        name: "model_disagreement",
      },
    ],
    modeledProbability: round4(modeledProbability),
    status,
    votesUsed: validVotes.length,
    warnings,
  };
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
