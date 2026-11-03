/**
 * arXiv:2309.00756v3 — Inverse-optimization MDP for NFL 4th-down risk preference.
 * Sandholtz, Wu, Puterman, Chan (AOAS 2024).
 *
 * Recovers a coach's implicit risk-preference quantile tau in (0,1).
 * The recovered tau is sealed into the Tuesday 04:00 CT baseline and must
 * remain bit-identical after any mid-week injury delta.
 *
 * ENABLED = false until wired into locked-projection.ts.
 */
export const ENABLED = false;

export const ACCEPTANCE_GATE = {
  status: "UNEVALUATED_SHADOW_SEAL_GATE",
  paperId: "arXiv:2309.00756v3",
  title: "Inverse-optimization MDP for NFL 4th-down risk preference",
  requiresRiskQuantileCalibration: true,
  sealBoundary: "PRE_SEAL_TUESDAY_0400_CT_ONLY",
} as const;

export type FourthDownState = {
  yardLine: number;
  yardsToGo: number;
  scoreDiff: number;
  timeRemainingSec: number;
  isHome: boolean;
};

export type Action = "go" | "kick";

export type NextScoreSample = {
  points: number;
  probability: number;
};

export type StateActionValue = {
  state: FourthDownState;
  action: Action;
  samples: NextScoreSample[];
};

export function quantileValue(samples: NextScoreSample[], tau: number): number {
  if (tau <= 0 || tau >= 1) throw new Error("tau must be in (0,1)");
  const sorted = [...samples].sort((a, b) => a.points - b.points);
  let cum = 0;
  for (const s of sorted) {
    cum += s.probability;
    if (cum >= tau) return s.points;
  }
  const last = sorted[sorted.length - 1];
  if (last === undefined) throw new Error("quantileValue requires at least one sample");
  return last.points;
}

export function decisionResidual(
  values: StateActionValue[],
  observedAction: Action,
  tau: number
): number {
  const byAction = new Map<Action, NextScoreSample[]>();
  for (const v of values) byAction.set(v.action, v.samples);
  let best = -Infinity;
  for (const samples of byAction.values()) {
    best = Math.max(best, quantileValue(samples, tau));
  }
  const observed = byAction.get(observedAction);
  if (!observed) return best;
  return best - quantileValue(observed, tau);
}

export function recoverTau(
  decisions: { values: StateActionValue[]; observedAction: Action }[],
  gridSize = 99
): { tau: number; totalResidual: number } {
  let bestTau = 0.5;
  let bestResidual = Infinity;
  for (let i = 1; i <= gridSize; i++) {
    const tau = i / (gridSize + 1);
    let total = 0;
    for (const d of decisions) {
      total += decisionResidual(d.values, d.observedAction, tau);
    }
    if (total < bestResidual) {
      bestResidual = total;
      bestTau = tau;
    }
  }
  return { tau: bestTau, totalResidual: bestResidual };
}

export function assertTauSealed(before: number, after: number, epsilon = 1e-9): boolean {
  return Math.abs(before - after) < epsilon;
}

/**
 * Build a discrete next-score distribution from observed outcomes.
 * In production this comes from the play-by-play MDP transition model.
 */
export function makeNextScoreSamples(
  outcomes: { points: number; count: number }[]
): NextScoreSample[] {
  const total = outcomes.reduce((s, o) => s + o.count, 0);
  if (total === 0) return [];
  return outcomes.map((o) => ({ points: o.points, probability: o.count / total }));
}

/**
 * Example recovery on a small synthetic set of 4th-down decisions.
 * Demonstrates that a conservative coach (low tau) is recovered correctly.
 */
export function exampleRecovery(): { tau: number; totalResidual: number } {
  const conservativeOutcomes = [
    { points: -8, count: 5 },
    { points: 0, count: 40 },
    { points: 3, count: 15 },
    { points: 7, count: 30 },
    { points: 8, count: 10 },
  ];
  const samples = makeNextScoreSamples(conservativeOutcomes);
  const decisions = [
    {
      values: [
        { state: { yardLine: 50, yardsToGo: 1, scoreDiff: 0, timeRemainingSec: 900, isHome: true }, action: "go" as Action, samples },
        { state: { yardLine: 50, yardsToGo: 1, scoreDiff: 0, timeRemainingSec: 900, isHome: true }, action: "kick" as Action, samples: makeNextScoreSamples([{ points: 3, count: 1 }]) },
      ],
      observedAction: "kick" as Action,
    },
  ];
  return recoverTau(decisions);
}
