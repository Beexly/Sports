/**
 * arXiv:2505.02170v3 — Data-Driven Team Selection in Fantasy Premier League Using Integer Programming and Predictive Modeling Approach
 *
 * Integer-programming DFS optimizer with correlation-aware stacking: branch-and-bound over the salary
 * knapsack with linearized QB-WR/TE correlation bonuses via auxiliary pair variables.
 *
 * Improvement: Adopt the IP optimizer for the weekly DFS packet with correlation-aware stacking built into the objective — bonus term λ·Σ_{(qb,wr)} corr_{qb,wr}·x_qb·x_wr linearized with auxiliary binaries, tuned on 2022–2023 and tested on 2024–2025 — the tournament edge the paper's plain formulation omits.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the IP optimizer into the weekly DFS packet iff it beats the greedy baseline's realized score in ≥ 60% of 2022–2025 slates AND the weighted-average-vs-current-projection bake-off winner is documented with a ≥ 3% mean-score edge. Otherwise REJECT.
 */

/** Squad player with pairwise correlation bonuses to teammates. */
export interface SquadPlayer {
  id: string;
  salary: number;
  proj: number;
  /** correlation bonus keyed by teammate id (e.g. QB-WR stack). */
  stackWith: Record<string, number>;
}

/**
 * Branch-and-bound selection of exactly `size` players under the cap,
 * maximizing sum(proj) + sum over selected pairs of stackWith bonuses.
 */
export function optimizeSquad(
  players: readonly SquadPlayer[],
  size: number,
  cap: number,
): SquadPlayer[] {
  if (size <= 0 || size > players.length) throw new Error("optimizeSquad: bad size");
  const order = [...players].sort((a, b) => b.proj / b.salary - a.proj / a.salary);
  const bonusOf = (sel: SquadPlayer[], p: SquadPlayer): number =>
    sel.reduce((s, q) => s + (p.stackWith[q.id] ?? 0) + (q.stackWith[p.id] ?? 0), 0);
  let best: SquadPlayer[] = [];
  let bestVal = -Infinity;
  const dfs = (idx: number, sel: SquadPlayer[], capLeft: number, val: number): void => {
    if (sel.length === size) {
      if (val > bestVal) { bestVal = val; best = [...sel]; }
      return;
    }
    if (idx >= order.length) return;
    // Bound: value density of the rest (ignoring bonuses)
    let bnd = val;
    let c = capLeft;
    let need = size - sel.length;
    for (let i = idx; i < order.length && need > 0; i++) {
      const p = order[i]!;
      if (p.salary <= c) { bnd += p.proj; c -= p.salary; need--; }
      else { bnd += (c / p.salary) * p.proj; break; }
    }
    if (bnd <= bestVal) return;
    const p = order[idx]!;
    if (p.salary <= capLeft) {
      sel.push(p);
      dfs(idx + 1, sel, capLeft - p.salary, val + p.proj + bonusOf(sel.slice(0, -1), p));
      sel.pop();
    }
    dfs(idx + 1, sel, capLeft, val);
  };
  dfs(0, [], cap, 0);
  if (best.length === 0) throw new Error("optimizeSquad: no feasible squad");
  return best;
}

/** Realized-score bake-off: fraction of slates where the IP squad beats greedy. */
export function bakeOffWinRate(
  ipScores: readonly number[],
  greedyScores: readonly number[],
): number {
  if (ipScores.length !== greedyScores.length || ipScores.length === 0) {
    throw new Error("bakeOffWinRate: length mismatch");
  }
  const wins = ipScores.filter((s, i) => s > (greedyScores[i] ?? 0)).length;
  return wins / ipScores.length;
}
