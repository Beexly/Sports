/**
 * Minimax-regret (MMR) engine selection over (training-era, prediction-era) states
 *
 * Research port: arXiv:2403.11016
 * Normalized lane: calibration | Doctrine: BASELINE
 *
 * Engine-honesty infrastructure: defines the state space S = (training-era, prediction-era) pairs plus stressed states (post-rule-change eras), builds the regret matrix R(engine, state) = best_score(state) - score(engine, state), and ranks engines by max regret. Pure selection math; never changes a floor.
 *
 * ACCEPTANCE GATE: Adopt MMR as a standing engine-selection criterion if the max-regret ranking disagrees with the average-backtest ranking on at least one real engine decision in the 2024 review set. Advisory until the gate clears.
 */

export interface EngineState {
  trainEra: string;
  predictEra: string;
  stressed: boolean;
}

export interface RegretMatrix {
  engines: string[];
  states: EngineState[];
  /** scores[e][s] = score of engine e in state s (higher = better) */
  scores: number[][];
}

/** Regret matrix: R[e][s] = max_e' score[e'][s] - score[e][s]. */
export function regretMatrix(m: RegretMatrix): number[][] {
  return m.scores.map((row, e) =>
    row.map((score, s) => {
      const best = Math.max(...m.scores.map((r) => r[s] ?? -Infinity));
      return best - score;
    }),
  );
}

/** Max regret per engine across states (lower = more robust). */
export function maxRegret(m: RegretMatrix): { engine: string; maxRegret: number }[] {
  const R = regretMatrix(m);
  return m.engines
    .map((engine, e) => ({ engine, maxRegret: Math.max(...(R[e] ?? [])) }))
    .sort((a, b) => a.maxRegret - b.maxRegret);
}

/** Average-backtest ranking (the incumbent criterion MMR is compared against). */
export function averageRank(m: RegretMatrix): { engine: string; avg: number }[] {
  return m.engines
    .map((engine, e) => {
      const s = m.scores[e] ?? [];
      return { engine, avg: s.reduce((a, b) => a + b, 0) / s.length };
    })
    .sort((a, b) => b.avg - a.avg);
}

/** Gate check: does the MMR ranking disagree with the average ranking anywhere? */
export function mmrDisagrees(m: RegretMatrix): boolean {
  const mmrOrder = maxRegret(m).map((r) => r.engine);
  const avgOrder = averageRank(m).map((r) => r.engine);
  return mmrOrder.some((e, i) => e !== avgOrder[i]);
}


/** Live-data gate: stays off until minimax-regret engine comparison validated on backtests. */
export const GSE_MINIMAX_REGRET_ENABLED = false;
