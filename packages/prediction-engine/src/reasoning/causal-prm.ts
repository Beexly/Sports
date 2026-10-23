export type ReasoningLayerId = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export interface LayerStepTrace {
  readonly layer: ReasoningLayerId;
  readonly inputPriorProb: number;
  readonly outputPosteriorProb: number;
  readonly logOddsDelta: number;
  readonly citedPremiseIds: readonly string[];
  readonly z3EntailmentUnsat: boolean;
  readonly epistemicEntropyBits: number;
}

export interface CausalPrmStepScore {
  readonly layer: ReasoningLayerId;
  readonly qValueLogOdds: number;
  readonly stepAdvantage: number;
  readonly formalVerificationPassed: boolean;
  readonly triggerReflectionRevision: boolean;
}

export interface CausalPrmTrajectoryReceipt {
  readonly stepScores: readonly CausalPrmStepScore[];
  readonly trajectoryMinScore: number;
  readonly listWiseRankScore: number;
  readonly escalationHaltedAtLayer: ReasoningLayerId;
  readonly authorizedForCouncil: boolean;
}

export function evaluateCausalPrmTrajectory(
  steps: readonly LayerStepTrace[],
  marginZeta = 0.35,
): CausalPrmTrajectoryReceipt {
  const stepScores: CausalPrmStepScore[] = [];
  let prevQ = 0.0;
  let minScore = Infinity;
  for (const step of steps) {
    if (!step.z3EntailmentUnsat) {
      const failedQ = -4.0 - marginZeta;
      stepScores.push({
        layer: step.layer,
        qValueLogOdds: failedQ,
        stepAdvantage: failedQ - prevQ,
        formalVerificationPassed: false,
        triggerReflectionRevision: true,
      });
      minScore = Math.min(minScore, failedQ);
      prevQ = failedQ;
      continue;
    }
    const citationSupport = Math.min(1.5, Math.log1p(step.citedPremiseIds.length) * 0.45);
    const entropyReductionBonus = Math.max(-0.5, (1.0 - step.epistemicEntropyBits) * 0.6);
    const stepBoundedPenalty = Math.abs(step.logOddsDelta) > 0.65 ? -0.8 : 0.25;
    const currentQ = prevQ + citationSupport + entropyReductionBonus + stepBoundedPenalty;
    const stepAdvantage = currentQ - prevQ;
    stepScores.push({
      layer: step.layer,
      qValueLogOdds: Math.round(currentQ * 1000) / 1000,
      stepAdvantage: Math.round(stepAdvantage * 1000) / 1000,
      formalVerificationPassed: true,
      triggerReflectionRevision: stepAdvantage < -0.15,
    });
    minScore = Math.min(minScore, currentQ);
    prevQ = currentQ;
  }
  const allVerified = stepScores.every((s) => s.formalVerificationPassed);
  const listWiseRankScore = allVerified ? prevQ + 0.5 * minScore : -999;
  return {
    stepScores,
    trajectoryMinScore: minScore === Infinity ? 0 : minScore,
    listWiseRankScore: Math.round(listWiseRankScore * 1000) / 1000,
    escalationHaltedAtLayer: steps[steps.length - 1]?.layer ?? "L0",
    authorizedForCouncil: allVerified && minScore > -0.5,
  };
}
