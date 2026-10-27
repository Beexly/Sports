/**
 * arXiv:2309.00756v3 — Inverse-optimization MDP for NFL 4th-down risk preference.
 * Sandholtz, Wu, Puterman, Chan (AOAS 2024).
 *
 * Recovers a coach's implicit risk-preference quantile tau in (0,1) from
 * observed go/kick decisions. The recovered tau is sealed into the Tuesday
 * 04:00 CT baseline and must remain bit-identical after any mid-week
 * injury delta.
 *
 * This is the discrete case only: one risk quantile per coach over the
 * next-score distribution. It is not full multi-feature inverse RL.
 *
 * Live in production: locked-projection.ts imports and calls recoverTau()
 * to build the pre-seal Tuesday v1.0 tau, then seals it. There is no
 * enable flag — a false one here would make a live sealed-tau path look
 * dormant (see the invariant test "does not advertise itself as disabled").
 */

export type FourthDownState = {
  yardLine: number; // 1-99
  yardsToGo: number;
  scoreDiff: number; // own score - opp score
  timeRemainingSec: number;
  isHome: boolean;
};

export type Action = "go" | "kick";

export type NextScoreSample = {
  points: number; // possible next-score values (e.g. 0, 3, 6, 7, 8, -3, -6, -7, -8)
  probability: number;
};

export type StateActionValue = {
  state: FourthDownState;
  action: Action;
  samples: NextScoreSample[];
};

export type FourthDownDecisionSample = {
  values: StateActionValue[];
  observedAction: Action;
};

/**
 * Empirical quantile of a discrete distribution.
 * V_tau(F) = F^{-1}(tau)
 */
export function quantileValue(samples: NextScoreSample[], tau: number): number {
  if (tau <= 0 || tau >= 1) {
    throw new Error("tau must be in (0,1)");
  }
  const sorted = [...samples].sort((a, b) => a.points - b.points);
  let cum = 0;
  for (const s of sorted) {
    cum += s.probability;
    if (cum >= tau) return s.points;
  }
  const last = sorted[sorted.length - 1];
  if (!last) throw new Error("samples must be non-empty");
  return last.points;
}

/**
 * Residual of a single decision: how much better the best action is
 * than the observed action under quantile tau.
 * residual = max_a V_tau(F(s,a)) - V_tau(F(s,a*))
 */
export function decisionResidual(
  values: StateActionValue[],
  observedAction: Action,
  tau: number,
): number {
  const byAction = new Map<Action, NextScoreSample[]>();
  for (const v of values) {
    byAction.set(v.action, v.samples);
  }
  let best = -Infinity;
  for (const samples of byAction.values()) {
    best = Math.max(best, quantileValue(samples, tau));
  }
  const observed = byAction.get(observedAction);
  if (!observed) return best;
  return best - quantileValue(observed, tau);
}

/**
 * Recover the tau that minimizes total residual across a coach's
 * 4th-down sample. Grid search over (0,1).
 */
export function recoverTau(
  decisions: FourthDownDecisionSample[],
  gridSize = 99,
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

/**
 * Seal check: recovered tau must be identical before and after any
 * mid-week injury delta is applied to execution weights. The quantile
 * itself must not move; only execution weights may.
 */
export function assertTauSealed(before: number, after: number, epsilon = 1e-9): boolean {
  return Math.abs(before - after) < epsilon;
}

/** Build a discrete next-score distribution from [points, probability] pairs. */
export function makeNextScoreSamples(
  outcomes: ReadonlyArray<readonly [number, number]>,
): NextScoreSample[] {
  return outcomes.map(([points, probability]) => ({ points, probability }));
}

/**
 * Worked example from the paper's discrete case. Go: 7 pts at 0.4, else 0.
 * Kick: 3 pts at 0.7, else 0. Observed: go. The recovered tau is the one
 * that makes going least suboptimal.
 */
export function exampleRecovery(): { tau: number; totalResidual: number } {
  const state: FourthDownState = {
    yardLine: 35,
    yardsToGo: 4,
    scoreDiff: -3,
    timeRemainingSec: 120,
    isHome: true,
  };
  return recoverTau([
    {
      values: [
        {
          state,
          action: "go",
          samples: makeNextScoreSamples([
            [7, 0.4],
            [0, 0.6],
          ]),
        },
        {
          state,
          action: "kick",
          samples: makeNextScoreSamples([
            [3, 0.7],
            [0, 0.3],
          ]),
        },
      ],
      observedAction: "go",
    },
  ]);
}
