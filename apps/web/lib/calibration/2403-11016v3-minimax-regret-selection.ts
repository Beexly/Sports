/**
 * arXiv 2403.11016v3: Comprehensive OOS Evaluation of Predictive Algorithms with Statistical Decision Theory.
 *
 * ACCEPTANCE GATE: Adopt MMR as a standing engine-selection criterion if the max-regret ranking disagrees with the average-backtest ranking on at least one real engine decision in 2024-2025 (it changes a choice we would otherwise make) - that demonstrates the doctrine adds information; if max-regret and average-backtest always agree, keep reporting MMR as a diagnostic but do not let it override averages.
 */

export const ENABLED = false;

export type CalibrationSport = "NFL" | "MLB";

export interface EvaluationStateLoss {
  readonly stateId: string;
  readonly sport: CalibrationSport;
  readonly losses: readonly number[];
}

export interface EngineScore {
  readonly candidateId: string;
  readonly meanLoss: number;
  readonly meanRegret: number;
  readonly maxRegret: number;
  readonly worstStateId: string;
}

export interface EngineSelectionReport {
  readonly mmrCandidateId: string;
  readonly averageCandidateId: string;
  readonly rankingsDisagree: boolean;
  readonly scores: readonly EngineScore[];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function rank(
  scores: readonly EngineScore[],
  metric: (score: EngineScore) => number,
): readonly EngineScore[] {
  return [...scores].sort(
    (left, right) =>
      metric(left) - metric(right) ||
      left.meanLoss - right.meanLoss ||
      left.candidateId.localeCompare(right.candidateId),
  );
}

export function evaluateEngineSelection(
  candidateIds: readonly string[],
  states: readonly EvaluationStateLoss[],
): EngineSelectionReport {
  if (candidateIds.length === 0 || states.length === 0) {
    throw new Error("candidateIds and states must be non-empty");
  }

  const uniqueCandidates = new Set(candidateIds);
  if (uniqueCandidates.size !== candidateIds.length) {
    throw new Error("candidateIds must be unique");
  }

  const scores = candidateIds.map((candidateId, candidateIndex) => {
    let lossTotal = 0;
    let regretTotal = 0;
    let maxRegret = -Infinity;
    let worstStateId = "";

    for (const state of states) {
      if (state.losses.length !== candidateIds.length) {
        throw new Error(`state ${state.stateId} must contain one loss per candidate`);
      }
      const loss = state.losses[candidateIndex];
      assertFinite(loss, `loss for ${candidateId} in ${state.stateId}`);
      const bestStateLoss = Math.min(...state.losses);
      const regret = loss - bestStateLoss;
      lossTotal += loss;
      regretTotal += regret;
      if (regret > maxRegret) {
        maxRegret = regret;
        worstStateId = state.stateId;
      }
    }

    return {
      candidateId,
      meanLoss: lossTotal / states.length,
      meanRegret: regretTotal / states.length,
      maxRegret,
      worstStateId,
    };
  });

  const mmrRanking = rank(scores, (score) => score.maxRegret);
  const averageRanking = rank(scores, (score) => score.meanLoss);
  const mmrCandidateId = mmrRanking[0].candidateId;
  const averageCandidateId = averageRanking[0].candidateId;

  return {
    mmrCandidateId,
    averageCandidateId,
    rankingsDisagree: mmrCandidateId !== averageCandidateId,
    scores,
  };
}
