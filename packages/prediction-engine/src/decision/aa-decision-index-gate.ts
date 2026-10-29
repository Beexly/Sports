/**
 * Stream 7: Artificial Analysis Decision Index 4-Pillar Gate (AA-Omniscience-Decision,
 * HLE-MultiChoice, When2Call, WildGuardTest) & Hidden-State Tool Parameter Probing
 * (ParamBench OpenAlex W7172513554 / arXiv:2608.03071 & LoopTool OpenAlex W4416236279).
 */

export interface DecisionIndexPillars {
  readonly omniscienceAccuracy: number;
  readonly omniscienceHallucinationRate: number;
  readonly hleCalibrationScore: number;
  readonly when2CallF1: number;
  readonly wildGuardCompliance: number;
}

export interface DecisionIndexVerdict {
  readonly compositeDecisionIndex: number;
  readonly abstentionRequired: boolean;
  readonly toolCallAuthorized: boolean;
  readonly verdict: "AUTHORIZE_EXECUTION" | "CALL_EXTERNAL_TOOL" | "ABSTAIN_HIGH_HALLUCINATION_RISK";
}

export function evaluateArtificialAnalysisDecisionIndex(
  pillars: DecisionIndexPillars,
  hallucinationPenaltyLambda = 1.6,
): DecisionIndexVerdict {
  const netOmniscience = Math.max(
    0,
    pillars.omniscienceAccuracy - hallucinationPenaltyLambda * pillars.omniscienceHallucinationRate,
  );
  const composite = Number(
    (
      0.35 * netOmniscience +
      0.25 * pillars.hleCalibrationScore +
      0.25 * pillars.when2CallF1 +
      0.15 * pillars.wildGuardCompliance
    ).toFixed(4),
  );
  const abstentionRequired =
    pillars.wildGuardCompliance < 0.85 || pillars.omniscienceHallucinationRate > 0.22 || composite < 0.45;
  const toolCallAuthorized = !abstentionRequired && pillars.when2CallF1 >= 0.65;
  const verdict = abstentionRequired
    ? "ABSTAIN_HIGH_HALLUCINATION_RISK"
    : toolCallAuthorized
      ? "AUTHORIZE_EXECUTION"
      : "CALL_EXTERNAL_TOOL";
  return {
    compositeDecisionIndex: composite,
    abstentionRequired,
    toolCallAuthorized,
    verdict,
  };
}

export interface ToolParameterCandidate {
  readonly candidateId: string;
  readonly greedyRankScore: number;
  readonly hiddenStateFeatures: readonly number[];
  readonly schemaValid: boolean;
}

/**
 * ParamBench (W7172513554) + LoopTool (W4416236279):
 * Linear probe over final-layer hidden states h_L to rerank tool parameter candidates.
 */
export function rerankToolCandidatesWithParamProbe(
  candidates: readonly ToolParameterCandidate[],
  probeWeights: readonly number[],
  probeBias = 0,
): {
  readonly selectedCandidateId: string | null;
  readonly probeGuidedScore: number;
  readonly rerankedChangedTop1: boolean;
} {
  const valid = candidates.filter((c) => c.schemaValid);
  if (valid.length === 0) {
    return { selectedCandidateId: null, probeGuidedScore: 0, rerankedChangedTop1: false };
  }
  const greedyBest = [...valid].sort((a, b) => b.greedyRankScore - a.greedyRankScore)[0]!;
  let bestId = valid[0]?.candidateId ?? "";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const c of valid) {
    let dot = probeBias;
    const len = Math.min(c.hiddenStateFeatures.length, probeWeights.length);
    for (let i = 0; i < len; i++) {
      dot += (c.hiddenStateFeatures[i] ?? 0) * (probeWeights[i] ?? 0);
    }
    const pCorrect = 1 / (1 + Math.exp(-dot));
    const combined = 0.65 * pCorrect + 0.35 * c.greedyRankScore;
    if (combined > bestScore) {
      bestScore = combined;
      bestId = c.candidateId;
    }
  }

  return {
    selectedCandidateId: bestId,
    probeGuidedScore: Number(bestScore.toFixed(4)),
    rerankedChangedTop1: bestId !== greedyBest.candidateId,
  };
}
