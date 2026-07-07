/**
 * Exact DFS lineup optimizer — provably optimal via branch-and-bound.
 *
 * LineStar's *patented* optimizer (US10,478,721 / US11,660,533) is a
 * randomized-greedy walk of a pre-sorted "column-based list," explicitly tuned
 * to run in "approximately constant computational time" with "iterations
 * inversely proportional to the number of rows" — a 2015-era mobile shortcut
 * that trades optimality for speed and is NOT guaranteed to find the best
 * lineup.
 *
 * This does the opposite: an exact branch-and-bound that returns the PROVABLE
 * maximum of the mode's (additive) objective subject to the salary cap, the
 * roster slots, distinct players, and locks/excludes. Two wins at once:
 *   1. It is a fundamentally different algorithm (no column-list, no
 *      rows-inverse iteration bound) — a clean design-around of the claimed
 *      mechanism (confirm freedom-to-operate with counsel).
 *   2. It is provably optimal — a guarantee their heuristic structurally cannot
 *      make.
 *
 * Pure. Runs on the founder-gated illustrative slate by default; flips to a
 * licensed live slate with no code change (same `slate` seam as the heuristic).
 */

import { DFS_SLOTS, SALARY_CAP, type DfsPlayer } from "./dfs-slate";
import { eligible, objVal, salaryOf, type Mode, type OptOpts } from "./dfs-optimizer";
import { activeDfsSlate } from "@/lib/integrations/dfs";

export type ExactResult = {
  /** The provably-optimal lineup, or null if the constraints are infeasible. */
  readonly lineup: readonly DfsPlayer[] | null;
  /** The optimal objective value for the mode (−Infinity if infeasible). */
  readonly objective: number;
  /** Search nodes explored — a transparency counter, not a guarantee input. */
  readonly nodes: number;
  /** True when the search completed exhaustively (i.e. `objective` is proven optimal). */
  readonly optimal: boolean;
};

/** Safety backstop so a pathological live slate can't hang the browser. If the
 *  search ever hits this it returns the best-so-far with `optimal: false`. The
 *  illustrative slate finishes in a few thousand nodes, far under the cap. */
const NODE_CAP = 5_000_000;

const slotSig = (i: number): string => String(DFS_SLOTS[i]);

/**
 * Exact optimum for the given mode. `opts.stack` is intentionally ignored here:
 * the objective is additive and stacking is a lineup-level constraint handled by
 * the correlation-aware GPP path (see dfs-correlation / dfs-optimizer-edge).
 * Exact is the right tool for CASH, where a provable median-maximising lineup is
 * the headline the heuristic can only approximate.
 */
export function optimizeExact(
  opts: Pick<OptOpts, "mode" | "locks" | "excludes">,
  slate: readonly DfsPlayer[] = activeDfsSlate(),
): ExactResult {
  const mode: Mode = opts.mode;

  // Candidate pool: drop excludes. A lock that is also excluded is a
  // contradiction → infeasible.
  const cand = slate.filter((p) => !opts.excludes.has(p.id));
  for (const id of opts.locks) {
    if (!cand.some((p) => p.id === id)) {
      return { lineup: null, objective: -Infinity, nodes: 0, optimal: true };
    }
  }

  // Deterministic global ordering by objective value (desc), tie-break cheaper
  // salary then id — gives branch-and-bound a strong first-improving order and
  // makes the whole search reproducible.
  const ordered = [...cand].sort(
    (a, b) => objVal(b, mode) - objVal(a, mode) || a.salary - b.salary || a.id.localeCompare(b.id),
  );
  const rank = new Map<string, number>();
  ordered.forEach((p, i) => rank.set(p.id, i));

  const nSlots = DFS_SLOTS.length;
  // Per-slot eligible candidates (in global order → ranks ascend down each list).
  const perSlot: DfsPlayer[][] = DFS_SLOTS.map((slot) => ordered.filter((p) => eligible(p, slot)));

  // Admissible bounds (both intentionally optimistic → never prune a real optimum):
  //  bestObjForSlot: the single best objective any eligible player could add here.
  //  minSalForSlot:  the cheapest eligible player here.
  const bestObjForSlot = perSlot.map((list) => (list.length ? Math.max(...list.map((p) => objVal(p, mode))) : -Infinity));
  const minSalForSlot = perSlot.map((list) => (list.length ? Math.min(...list.map((p) => p.salary)) : Infinity));
  // Suffix sums for O(1) look-ahead bounds.
  const suffixBestObj = new Array<number>(nSlots + 1).fill(0);
  const suffixMinSal = new Array<number>(nSlots + 1).fill(0);
  for (let i = nSlots - 1; i >= 0; i--) {
    suffixBestObj[i] = suffixBestObj[i + 1]! + (bestObjForSlot[i]! === -Infinity ? 0 : bestObjForSlot[i]!);
    suffixMinSal[i] = suffixMinSal[i + 1]! + (minSalForSlot[i]! === Infinity ? 0 : minSalForSlot[i]!);
  }

  let bestObj = -Infinity;
  let bestLineup: DfsPlayer[] | null = null;
  let nodes = 0;
  let truncated = false;
  const used = new Set<string>();
  const chosen: DfsPlayer[] = new Array(nSlots);

  const recurse = (i: number, salaryUsed: number, curObj: number, prevSig: string, prevRank: number): void => {
    if (truncated) return;
    if (++nodes > NODE_CAP) { truncated = true; return; }

    // Bound 1 — even the optimistic remaining objective can't beat the best.
    if (curObj + suffixBestObj[i]! <= bestObj) return;
    // Bound 2 — cheapest completion already busts the cap.
    if (salaryUsed + suffixMinSal[i]! > SALARY_CAP) return;

    // Lock feasibility — every not-yet-placed lock must still fit somewhere ahead.
    const remainingSlots = nSlots - i;
    let unplacedLocks = 0;
    for (const id of opts.locks) if (!used.has(id)) unplacedLocks++;
    if (unplacedLocks > remainingSlots) return;

    if (i === nSlots) {
      if (unplacedLocks === 0 && curObj > bestObj) {
        bestObj = curObj;
        bestLineup = chosen.slice();
      }
      return;
    }

    const sig = slotSig(i);
    const sameAsPrev = sig === prevSig;
    // If locks exactly fill the remaining slots, only locks may be placed now.
    const mustPlaceLock = unplacedLocks === remainingSlots;

    for (const c of perSlot[i]!) {
      if (used.has(c.id)) continue;
      // Symmetry break: identical consecutive slots are combinations, not
      // permutations — require strictly increasing global rank.
      if (sameAsPrev && rank.get(c.id)! <= prevRank) continue;
      if (mustPlaceLock && !opts.locks.has(c.id)) continue;
      const newSal = salaryUsed + c.salary;
      // Leave enough cap for the cheapest legal completion of later slots.
      if (newSal + suffixMinSal[i + 1]! > SALARY_CAP) continue;

      used.add(c.id);
      chosen[i] = c;
      recurse(i + 1, newSal, curObj + objVal(c, mode), sig, rank.get(c.id)!);
      used.delete(c.id);

      if (truncated) return;
    }
  };

  recurse(0, 0, 0, "", -1);

  return {
    lineup: bestLineup,
    objective: bestLineup ? bestObj : -Infinity,
    nodes,
    optimal: !truncated,
  };
}

/** Convenience: just the optimal lineup (null if infeasible). */
export function optimizeExactLineup(
  opts: Pick<OptOpts, "mode" | "locks" | "excludes">,
  slate: readonly DfsPlayer[] = activeDfsSlate(),
): readonly DfsPlayer[] | null {
  return optimizeExact(opts, slate).lineup;
}

/** Sanity helper — the optimal objective is only meaningful for a cap-legal lineup. */
export function isCapLegal(lineup: readonly DfsPlayer[]): boolean {
  return salaryOf(lineup) <= SALARY_CAP;
}
