/**
 * arXiv:2411.11012v1 — Optimizing Daily Fantasy Baseball Lineups: A Linear Programming Approach for Enhanced Accuracy
 *
 * DFS lineup optimizer via branch-and-bound integer programming: upper-tail projections with
 * correlation-aware stacking bonuses, salary-cap knapsack search, and a duplicate-free exposure portfolio.
 *
 * Improvement: Replace plain projection-maximization in the NFL DFS optimizer with an upper-tail-projection + stacking variant, A/B tested on historical NFL slates with archived contest payouts to quantify how much of the paper's 107.3-point tournament gap it closes at low/mid/high stakes.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: On a held-out MLB slate sample: the optimizer's top lineup must outscore the mean of 100 random feasible lineups by ≥ 30 points, and the 25%-exposure portfolio must contain no duplicate lineups.
 */

/** One DFS slate player. */
export interface DfsPlayer {
  id: string;
  position: string;
  salary: number;
  /** Upper-tail projection (e.g. 75th percentile outcome). */
  tailProj: number;
  team: string;
}

/** Lineup slot requirements: position -> count. */
export type SlotSpec = Record<string, number>;

/**
 * Branch-and-bound 0/1 lineup search maximizing sum(tailProj) + stackBonus
 * subject to salary cap and slot counts. stackBonus per same-team pair.
 */
export function optimizeLineup(
  players: readonly DfsPlayer[],
  slots: SlotSpec,
  salaryCap: number,
  stackBonus: number,
): DfsPlayer[] {
  if (players.length === 0) throw new Error("optimizeLineup: no players");
  const order = [...players].sort((a, b) => b.tailProj / b.salary - a.tailProj / a.salary);
  const need: Record<string, number> = { ...slots };
  const totalSlots = Object.values(slots).reduce((a, b) => a + b, 0);
  let best: DfsPlayer[] = [];
  let bestVal = -Infinity;
  // Upper bound: fractional knapsack on remaining value density.
  const bound = (idx: number, cap: number): number => {
    let v = 0;
    let c = cap;
    for (let i = idx; i < order.length && c > 0; i++) {
      const p = order[i]!;
      const take = Math.min(1, c / p.salary);
      v += take * p.tailProj;
      c -= take * p.salary;
    }
    return v;
  };
  const stackOf = (sel: DfsPlayer[]): number => {
    let s = 0;
    for (let i = 0; i < sel.length; i++)
      for (let j = i + 1; j < sel.length; j++)
        if (sel[i]!.team === sel[j]!.team) s += stackBonus;
    return s;
  };
  const dfs = (idx: number, sel: DfsPlayer[], cap: number, val: number, needLeft: Record<string, number>): void => {
    const slotsLeft = Object.values(needLeft).reduce((a, b) => a + b, 0);
    if (slotsLeft === 0) {
      const total = val + stackOf(sel);
      if (total > bestVal) { bestVal = total; best = [...sel]; }
      return;
    }
    if (idx >= order.length) return;
    if (val + bound(idx, cap) + stackBonus * slotsLeft * totalSlots <= bestVal) return; // prune
    const p = order[idx]!;
    const posNeed = needLeft[p.position] ?? 0;
    if (posNeed > 0 && p.salary <= cap) {
      needLeft[p.position] = posNeed - 1;
      sel.push(p);
      dfs(idx + 1, sel, cap - p.salary, val + p.tailProj, needLeft);
      sel.pop();
      needLeft[p.position] = posNeed;
    }
    dfs(idx + 1, sel, cap, val, needLeft);
  };
  dfs(0, [], salaryCap, 0, { ...need });
  if (best.length === 0) throw new Error("optimizeLineup: no feasible lineup");
  return best;
}

/** Portfolio duplicate check: no two lineups share the identical player set. */
export function hasDuplicateLineups(portfolio: readonly (readonly string[])[]): boolean {
  const seen = new Set<string>();
  for (const lu of portfolio) {
    const key = [...lu].sort().join("|");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/** Mean score of a lineup under mean projections (for the bake-off). */
export function lineupMeanScore(lineup: readonly DfsPlayer[], meanProj: Map<string, number>): number {
  return lineup.reduce((s, p) => s + (meanProj.get(p.id) ?? 0), 0);
}
