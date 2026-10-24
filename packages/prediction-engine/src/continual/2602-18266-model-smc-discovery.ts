/**
 * Stream 6: A Probabilistic Framework for LLM-Based Model Discovery (ModelSMC, arXiv:2602.18266).
 * Sequential Monte Carlo particle filtering over symbolic/mechanistic candidate structural equations.
 */

export interface MechanisticModelParticle {
  readonly modelId: string;
  readonly equationExpr: string;
  readonly numParametersK: number;
  readonly priorWeight: number;
  readonly logLikelihood: number;
}

export interface ModelSmcEvaluation {
  readonly posteriorWeights: readonly { modelId: string; weight: number; bicPenalizedLogScore: number }[];
  readonly effectiveSampleSize: number;
  readonly resamplingTriggered: boolean;
  readonly mapModelId: string;
}

export function evaluateModelSmcCandidatePool(
  particles: readonly MechanisticModelParticle[],
  sampleSizeT: number,
  bicPenaltyLambda = 0.5,
): ModelSmcEvaluation {
  if (particles.length === 0 || !(sampleSizeT >= 1)) {
    return { posteriorWeights: [], effectiveSampleSize: 0, resamplingTriggered: false, mapModelId: "" };
  }
  const logScores = particles.map((p) => {
    const prior = Math.max(p.priorWeight, 1e-12);
    const bicPenalty = bicPenaltyLambda * p.numParametersK * Math.log(Math.max(sampleSizeT, 2));
    return Math.log(prior) + p.logLikelihood - bicPenalty;
  });
  const maxLog = Math.max(...logScores);
  const unnorm = logScores.map((ls) => Math.exp(ls - maxLog));
  const z = unnorm.reduce((a, b) => a + b, 0) || 1;
  const weights = unnorm.map((u) => u / z);
  const ess = 1 / (weights.reduce((acc, w) => acc + w * w, 0) || 1);

  let mapIdx = 0;
  for (let i = 1; i < weights.length; i++) {
    if (weights[i] > weights[mapIdx]) mapIdx = i;
  }

  return {
    posteriorWeights: particles.map((p, i) => ({
      modelId: p.modelId,
      weight: Number(weights[i].toFixed(6)),
      bicPenalizedLogScore: Number(logScores[i].toFixed(4)),
    })),
    effectiveSampleSize: Number(ess.toFixed(4)),
    resamplingTriggered: ess < particles.length * 0.5,
    mapModelId: particles[mapIdx].modelId,
  };
}
