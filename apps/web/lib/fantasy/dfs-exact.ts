/**
 * Exact DFS lineup optimizer — provably optimal via branch-and-bound.
 *
 * LineStar's *patented* optimizer (US10,478,721 / US11,660,533) is a
 * randomized-greedy walk of a pre-sorted "column-based list," explicitly tuned
 * for "approximately constant computational time" with "iterations inversely
 * proportional to the number of rows" — a 2015-era mobile shortcut that trades
 * optimality for speed and is NOT guaranteed to find the best lineup.
 *
 * This does the opposite, and does it fast:
 *   • PROVABLE optimum of the mode's additive objective under salary cap, roster
 *     slots, distinct players, locks/excludes — and optionally a minimum QB
 *     stack and slot-pinning (for late-swap).
 *   • A DISTINCT per-position admissible bound (not the naive per-slot max) so
 *     the search prunes hard — thousands of nodes, not millions.
 *   • Exact k-best: the top-K lineups by objective, for a strong deterministic
 *     GPP candidate pool (no random restarts).
 *
 * Different algorithm than the patented mechanism (no column-list walk, no
 * rows-inverse iteration bound) — a clean design-around (confirm FTO with
 * counsel) AND a stronger result. Pure; founder-gated illustrative slate.
 */

import { DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";
import { eligible, objVal, salaryOf, type Mode } from "./dfs-optimizer";
import { activeDfsSlate } from "@/lib/integrations/dfs";

export type ExactInput = {
  readonly mode: Mode;
  readonly locks?: ReadonlySet<string>;
  readonly excludes?: ReadonlySet<string>;
  /** Require at least this many same-team WR/TE alongside the QB. */
  readonly minStack?: number;
  /** Late-swap: pin slot i to a specific player (array length = DFS_SLOTS). */
  readonly fixed?: ReadonlyArray<DfsPlayer | null>;
};

export type ExactResult = {
  readonly lineup: readonly DfsPlayer[] | null;
  readonly objective: number;
  readonly nodes: number;
  readonly optimal: boolean;
};

const NODE_CAP = 5_000_000;
const CONCRETE: DfsPos[] = ["QB", "RB", "WR", "TE", "DST"];
const slotSig = (i: number): string => String(DFS_SLOTS[i]);

type Prepared = {
  cand: DfsPlayer[];
  objOfId: Map<string, number>;
  salOfId: Map<string, number>;
  rank: Map<string, number>;
  posSorted: Record<DfsPos, DfsPlayer[]>; // by objective desc, per concrete position
  perSlot: DfsPlayer[][];
  suffixNeeds: Array<Record<DfsPos | "FLEX", number>>;
  suffixMinSal: number[];
  nSlots: number;
  feasible: boolean;
};

function prepare(input: ExactInput, slate: readonly DfsPlayer[]): Prepared {
  const mode = input.mode;
  const excludes = input.excludes ?? new Set<string>();
  const locks = input.locks ?? new Set<string>();
  const cand = slate.filter((p) => !excludes.has(p.id));
  const byId = new Map(cand.map((p) => [p.id, p]));

  let feasible = true;
  for (const id of locks) if (!byId.has(id)) feasible = false;
  for (const f of input.fixed ?? []) if (f && (!byId.has(f.id) || locks.has(f.id))) { /* fixed must be present */ if (f && !byId.has(f.id)) feasible = false; }

  const objOfId = new Map<string, number>();
  const salOfId = new Map<string, number>();
  for (const p of cand) { objOfId.set(p.id, objVal(p, mode)); salOfId.set(p.id, p.salary); }

  const ordered = [...cand].sort(
    (a, b) => objOfId.get(b.id)! - objOfId.get(a.id)! || a.salary - b.salary || a.id.localeCompare(b.id),
  );
  const rank = new Map<string, number>();
  ordered.forEach((p, i) => rank.set(p.id, i));

  const posSorted = { QB: [], RB: [], WR: [], TE: [], DST: [] } as Record<DfsPos, DfsPlayer[]>;
  for (const p of ordered) posSorted[p.pos].push(p);

  const nSlots = DFS_SLOTS.length;
  const perSlot = DFS_SLOTS.map((slot) => ordered.filter((p) => eligible(p, slot)));

  // Static suffix roster needs per slot index.
  const suffixNeeds: Array<Record<DfsPos | "FLEX", number>> = [];
  for (let i = 0; i <= nSlots; i++) {
    const need = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, FLEX: 0 } as Record<DfsPos | "FLEX", number>;
    for (let j = i; j < nSlots; j++) need[DFS_SLOTS[j] as DfsPos | "FLEX"]++;
    suffixNeeds[i] = need;
  }

  // Feasibility-safe salary lower bound: cheapest eligible per slot (ignores
  // distinctness → a valid lower bound, never over-prunes).
  const minSalForSlot = perSlot.map((list) => (list.length ? Math.min(...list.map((p) => p.salary)) : Infinity));
  const suffixMinSal = new Array<number>(nSlots + 1).fill(0);
  for (let i = nSlots - 1; i >= 0; i--) suffixMinSal[i] = suffixMinSal[i + 1]! + (minSalForSlot[i]! === Infinity ? 0 : minSalForSlot[i]!);

  return { cand, objOfId, salOfId, rank, posSorted, perSlot, suffixNeeds, suffixMinSal, nSlots, feasible };
}

/**
 * Distinct, admissible upper bound on the objective still obtainable from slot
 * `i`. For each concrete position take the top-need[pos] UNUSED players; for the
 * FLEX slot take the best leftover RB/WR/TE. Respects distinctness (unlike a
 * per-slot max), ignores salary (→ never underestimates a feasible completion).
 */
function remainingBound(p: Prepared, i: number, used: Set<string>): number {
  const need = p.suffixNeeds[i]!;
  let bound = 0;
  let flexBest = -Infinity;
  for (const pos of CONCRETE) {
    const want = need[pos];
    let taken = 0;
    for (const pl of p.posSorted[pos]) {
      if (used.has(pl.id)) continue;
      if (taken < want) { bound += p.objOfId.get(pl.id)!; taken++; }
      else {
        if (pos === "RB" || pos === "WR" || pos === "TE") {
          const v = p.objOfId.get(pl.id)!;
          if (v > flexBest) flexBest = v;
        }
        break;
      }
    }
  }
  if (need.FLEX > 0 && flexBest > -Infinity) bound += flexBest;
  return bound;
}

type Kept = { lineup: DfsPlayer[]; obj: number };

/**
 * A fast, deterministic, constraint-respecting feasible lineup used to WARM-START
 * the search: seeding a strong incumbent means branch-and-bound spends its time
 * *proving* optimality rather than discovering it, collapsing the node count.
 * Returns null if it can't complete a legal lineup (search then runs cold).
 */
function greedySeed(p: Prepared, input: ExactInput): Kept | null {
  const locks = input.locks ?? new Set<string>();
  const fixed = input.fixed;
  const lineup: (DfsPlayer | null)[] = new Array(p.nSlots).fill(null);
  const used = new Set<string>();
  const byId = new Map(p.cand.map((x) => [x.id, x]));

  if (fixed) {
    for (let i = 0; i < p.nSlots; i++) {
      const f = fixed[i];
      if (f) { if (used.has(f.id) || !eligible(f, DFS_SLOTS[i]!)) return null; lineup[i] = f; used.add(f.id); }
    }
  }
  for (const id of locks) {
    if (used.has(id)) continue;
    const pl = byId.get(id); if (!pl) return null;
    const slot = DFS_SLOTS.findIndex((s, i) => lineup[i] === null && eligible(pl, s));
    if (slot < 0) return null; lineup[slot] = pl; used.add(id);
  }
  const minSalAny = p.cand.length ? Math.min(...p.cand.map((x) => x.salary)) : 0;
  for (let i = 0; i < p.nSlots; i++) {
    if (lineup[i]) continue;
    const capUsed = lineup.reduce((s, x) => s + (x ? x.salary : 0), 0);
    const emptyAfter = lineup.filter((x, j) => j > i && x === null).length;
    const maxSpend = SALARY_CAP - capUsed - minSalAny * emptyAfter;
    let best: DfsPlayer | null = null;
    for (const c of p.perSlot[i]!) { if (used.has(c.id) || c.salary > maxSpend) continue; best = c; break; } // perSlot is objVal-desc
    if (!best) return null;
    lineup[i] = best; used.add(best.id);
  }
  const lu = lineup as DfsPlayer[];
  return { lineup: lu, obj: lu.reduce((s, x) => s + p.objOfId.get(x.id)!, 0) };
}

/** Core branch-and-bound. Collects the top-K lineups by objective. */
function search(input: ExactInput, slate: readonly DfsPlayer[], K: number): { kept: Kept[]; nodes: number; optimal: boolean } {
  const p = prepare(input, slate);
  if (!p.feasible) return { kept: [], nodes: 0, optimal: true };

  const locks = input.locks ?? new Set<string>();
  const minStack = input.minStack ?? 0;
  const fixed = input.fixed;

  // Global minStack feasibility precheck — is any QB backed by enough same-team
  // pass-catchers at all? Avoids a full search just to prove infeasibility.
  if (minStack > 0) {
    let maxStack = 0;
    for (const qb of p.posSorted.QB) {
      const c = p.cand.filter((x) => x.team === qb.team && (x.pos === "WR" || x.pos === "TE")).length;
      if (c > maxStack) maxStack = c;
    }
    if (minStack > maxStack) return { kept: [], nodes: 0, optimal: true };
  }

  const kept: Kept[] = []; // sorted by obj desc, length <= K
  const worst = () => (kept.length ? kept[kept.length - 1]!.obj : -Infinity);
  const threshold = () => (kept.length >= K ? worst() : -Infinity);
  const offer = (lineup: DfsPlayer[], obj: number) => {
    if (kept.length < K) {
      kept.push({ lineup, obj });
      kept.sort((a, b) => b.obj - a.obj);
    } else if (obj > worst()) {
      kept[kept.length - 1] = { lineup, obj };
      kept.sort((a, b) => b.obj - a.obj);
    }
  };

  // Warm-start the incumbent for single-best searches (the k-best threshold only
  // engages once K are kept, so seeding there wouldn't help). Skip when minStack
  // is required — a greedy seed may not satisfy it, and an invalid incumbent
  // would wrongly raise the pruning threshold.
  if (K === 1 && minStack === 0) {
    const seed = greedySeed(p, input);
    if (seed) offer(seed.lineup, seed.obj);
  }

  let nodes = 0;
  let truncated = false;
  const used = new Set<string>();
  const chosen: DfsPlayer[] = new Array(p.nSlots);

  const recurse = (i: number, salaryUsed: number, curObj: number, prevSig: string, prevRank: number, qbTeam: string | null, stackCount: number): void => {
    if (truncated) return;
    if (++nodes > NODE_CAP) { truncated = true; return; }

    if (curObj + remainingBound(p, i, used) <= threshold()) return;
    if (salaryUsed + p.suffixMinSal[i]! > SALARY_CAP) return;

    const need = p.suffixNeeds[i]!;
    if (minStack > 0) {
      const catcherSlotsLeft = need.WR + need.TE + need.FLEX;
      if (minStack - stackCount > catcherSlotsLeft) return;
    }

    const remainingSlots = p.nSlots - i;
    let unplacedLocks = 0;
    for (const id of locks) if (!used.has(id)) unplacedLocks++;
    if (unplacedLocks > remainingSlots) return;

    if (i === p.nSlots) {
      if (unplacedLocks === 0 && stackCount >= minStack && curObj > threshold()) {
        offer(chosen.slice(), curObj);
      }
      return;
    }

    const sig = slotSig(i);
    const sameAsPrev = sig === prevSig;
    const mustPlaceLock = unplacedLocks === remainingSlots;

    const isFixedSlot = !!(fixed && fixed[i]);
    const candidates = isFixedSlot ? [fixed![i]!] : p.perSlot[i]!;
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      if (!eligible(c, DFS_SLOTS[i]!)) continue;
      if (!isFixedSlot) {
        // Symmetry break within identical consecutive slots (RB,RB / WR,WR,WR).
        if (sameAsPrev && p.rank.get(c.id)! <= prevRank) continue;
        // Symmetry break for FLEX: a player in FLEX must rank AFTER every
        // already-placed player of its own position — otherwise the same
        // 9-player set is regenerated once per "which one sits in FLEX".
        if (sig === "FLEX") {
          let mr = -1;
          for (let j = 0; j < i; j++) {
            const q = chosen[j];
            if (q && q.pos === c.pos) { const rk = p.rank.get(q.id)!; if (rk > mr) mr = rk; }
          }
          if (p.rank.get(c.id)! <= mr) continue;
        }
      }
      if (mustPlaceLock && !locks.has(c.id)) continue;
      const newSal = salaryUsed + c.salary;
      if (newSal + p.suffixMinSal[i + 1]! > SALARY_CAP) continue;

      const nQbTeam = c.pos === "QB" ? c.team : qbTeam;
      const nStack = stackCount + (nQbTeam && (c.pos === "WR" || c.pos === "TE") && c.team === nQbTeam ? 1 : 0);

      used.add(c.id);
      chosen[i] = c;
      recurse(i + 1, newSal, curObj + p.objOfId.get(c.id)!, sig, p.rank.get(c.id)!, nQbTeam, nStack);
      used.delete(c.id);
      if (truncated) return;
    }
  };

  recurse(0, 0, 0, "", -1, null, 0);
  return { kept, nodes, optimal: !truncated };
}

/** Provably-optimal lineup for the input (mode + constraints). */
export function optimizeExact(input: ExactInput, slate: readonly DfsPlayer[] = activeDfsSlate()): ExactResult {
  const { kept, nodes, optimal } = search(input, slate, 1);
  const best = kept[0];
  return {
    lineup: best?.lineup ?? null,
    objective: best ? best.obj : -Infinity,
    nodes,
    optimal,
  };
}

/** The exact top-K distinct lineups by objective (desc). Strong, deterministic. */
export function kBest(input: ExactInput, k: number, slate: readonly DfsPlayer[] = activeDfsSlate()): DfsPlayer[][] {
  return search(input, slate, Math.max(1, k)).kept.map((x) => x.lineup);
}

/**
 * A diverse candidate pool: take the top (k × factor) lineups by objective, then
 * greedily keep ones that overlap ≤ `maxOverlap` players with those already
 * kept. A deterministic pool that is both high-value AND varied — the input to
 * correlation-aware GPP selection, replacing random restarts.
 */
export function diversePool(
  input: ExactInput,
  k: number,
  opts: { maxOverlap?: number; factor?: number } = {},
  slate: readonly DfsPlayer[] = activeDfsSlate(),
): DfsPlayer[][] {
  const maxOverlap = opts.maxOverlap ?? 6; // of 9 slots
  const factor = opts.factor ?? 12;
  const ranked = kBest(input, k * factor, slate);
  const picked: DfsPlayer[][] = [];
  const idSets = ranked.map((lu) => new Set(lu.map((x) => x.id)));
  for (let r = 0; r < ranked.length && picked.length < k; r++) {
    const s = idSets[r]!;
    const ok = picked.every((pl) => {
      const ps = new Set(pl.map((x) => x.id));
      let overlap = 0;
      for (const id of s) if (ps.has(id)) overlap++;
      return overlap <= maxOverlap;
    });
    if (ok) picked.push(ranked[r]!);
  }
  // Returns up to k lineups that all respect the overlap cap. If the cap is very
  // strict it may return fewer — callers rank whatever pool they get.
  return picked;
}

/**
 * Late-swap / "Swaptimize": given a lineup already submitted, keep the players
 * whose games have started (locked in their slots) and exactly re-optimise the
 * rest under the same cap. Returns the improved lineup (or the original if no
 * improvement / infeasible).
 */
export function lateSwap(
  current: readonly DfsPlayer[],
  lockedIds: ReadonlySet<string>,
  mode: Mode = "gpp",
  slate: readonly DfsPlayer[] = activeDfsSlate(),
): readonly DfsPlayer[] {
  if (current.length !== DFS_SLOTS.length) return current;
  const fixed: (DfsPlayer | null)[] = current.map((pl) => (lockedIds.has(pl.id) ? pl : null));
  const res = optimizeExact(
    { mode, locks: new Set([...lockedIds].filter((id) => current.some((c) => c.id === id))), fixed },
    slate,
  );
  return res.lineup ?? current;
}

export function optimizeExactLineup(input: ExactInput, slate: readonly DfsPlayer[] = activeDfsSlate()): readonly DfsPlayer[] | null {
  return optimizeExact(input, slate).lineup;
}

export function isCapLegal(lineup: readonly DfsPlayer[]): boolean {
  return salaryOf(lineup) <= SALARY_CAP;
}
