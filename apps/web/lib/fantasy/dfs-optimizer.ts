/**
 * DFS Optimizer engine — salary-cap lineup optimization, glass-box.
 *
 * Beats a black-box optimizer on three axes: (1) it optimises for the right
 * objective (cash=projection, GPP=ceiling, leverage=contrarian ceiling vs.
 * ownership), (2) it builds many UNIQUE lineups with real exposure control and
 * stacking, and (3) every lineup ships with the WHY — salary, stack, total
 * ownership, and a leverage score. Illustrative slate.
 *
 * Two layers, in order:
 *   1. `optimizeHeuristic` — randomised multi-start + steepest-ascent hill-climb.
 *      Browser-cheap, no optimality guarantee (it was measured ~0.4–1.8% short
 *      of the optimum on the shipped slate by `scripts/dfs/oracle.py`).
 *   2. `optimizeExact` — branch-and-bound over the same model, seeded by (1) and
 *      pruned with a fractional-knapsack bound. `optimizeOne` runs this; the
 *      public "best lineup" claim is checked against an independent CP-SAT
 *      oracle (`scripts/dfs/oracle.py`, `python scripts/dfs/oracle.py`).
 */

import { DFS_SLOTS, SALARY_CAP, leverage, type DfsPlayer, type DfsPos } from "./dfs-slate";
import { activeDfsSlate } from "@/lib/integrations/dfs";

export type Mode = "cash" | "gpp" | "leverage";
export type OptOpts = {
  readonly mode: Mode;
  readonly stack: boolean;
  readonly locks: ReadonlySet<string>;
  readonly excludes: ReadonlySet<string>;
};

/**
 * Search-cost ceiling for `optimizeExact`, in (candidate iterations x pool
 * size) — the unit that tracks wall clock, derived and measured in that
 * function's header. 600M is roughly two seconds at every pool size tested
 * (50 to 600 players) and sits ~10x above the largest search that completes
 * on its own today. Exported so a caller that can afford to wait, or a test
 * that needs the bound to bite, can name its own number.
 */
export const DEFAULT_COST_BUDGET = 600_000_000;

const FLEX_POS: DfsPos[] = ["RB", "WR", "TE"];
export const eligible = (p: DfsPlayer, slot: DfsPos | "FLEX"): boolean =>
  slot === "FLEX" ? FLEX_POS.includes(p.pos) : p.pos === slot;

export function objVal(p: DfsPlayer, mode: Mode): number {
  if (mode === "cash") return p.proj;
  if (mode === "gpp") return p.ceiling;
  return leverage(p) * 6 + p.ceiling * 0.45; // leverage: contrarian ceiling
}

export type Lineup = readonly DfsPlayer[];

export const salaryOf = (lu: Lineup) => lu.reduce((s, p) => s + p.salary, 0);
export const objOf = (lu: Lineup, mode: Mode) => lu.reduce((s, p) => s + objVal(p, mode), 0);

function qbStackCount(lu: Lineup): { team: string | null; stacked: number } {
  const qb = lu.find((p) => p.pos === "QB");
  if (!qb) return { team: null, stacked: 0 };
  const stacked = lu.filter((p) => p.id !== qb.id && p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length;
  return { team: qb.team, stacked };
}

/**
 * Deterministic 32-bit PRNG (mulberry32), because the multi-start heuristic
 * needs a SPREAD of starting points, not unpredictability.
 *
 * It used to call the platform's unseeded random, which made `optimizeOne` a
 * different function on every process. Measured 2026-09-18 on the shipped 36-player slate in cash
 * mode: identical inputs, identical node count (400,001) and identical best
 * value, but the search did 7,163,409 candidate iterations on one run and
 * 7,081,041 on the next, because a different seed lineup set a different
 * incumbent and therefore pruned differently. That is survivable only while
 * the search runs to completion and the optimum is unique; the moment a budget
 * truncates it, the lineup we ship depends on the roll. The file's own test
 * scans this source for that call and has been red since the module was
 * written; this is the fix it was asking for, not a relaxation of it. Note the
 * test greps the FILE, so a comment naming the call trips it too: describe it,
 * never spell it.
 */
function rng32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRandom(pool: readonly DfsPlayer[], opts: OptOpts, pen: (p: DfsPlayer) => number, rand: () => number): DfsPlayer[] | null {
  const cand = pool.filter((p) => !opts.excludes.has(p.id));
  if (!cand.length) return null;
  const minSal = Math.min(...cand.map((p) => p.salary));
  const lineup: (DfsPlayer | null)[] = DFS_SLOTS.map(() => null);
  const used = new Set<string>();

  for (const id of opts.locks) {
    const pl = cand.find((p) => p.id === id);
    if (!pl || used.has(id)) continue;
    const slot = DFS_SLOTS.findIndex((s, i) => lineup[i] === null && eligible(pl, s));
    if (slot < 0) return null;
    lineup[slot] = pl; used.add(id);
  }

  for (let i = 0; i < DFS_SLOTS.length; i++) {
    if (lineup[i]) continue;
    const slot = DFS_SLOTS[i]!;
    const capUsed = lineup.reduce((s, p) => s + (p?.salary ?? 0), 0);
    const slotsAfter = lineup.filter((p, j) => j > i && p === null).length;
    const maxSpend = SALARY_CAP - capUsed - minSal * slotsAfter;
    const options = cand
      .filter((p) => !used.has(p.id) && eligible(p, slot) && p.salary <= maxSpend)
      .sort((a, b) => objVal(b, opts.mode) - pen(b) - (objVal(a, opts.mode) - pen(a)));
    if (!options.length) return null;
    const k = Math.min(5, options.length);
    const pick = options[Math.floor(rand() * k)]!;
    lineup[i] = pick; used.add(pick.id);
  }
  return lineup as DfsPlayer[];
}

function hillClimb(lu: DfsPlayer[], pool: readonly DfsPlayer[], opts: OptOpts): DfsPlayer[] {
  const cand = pool.filter((p) => !opts.excludes.has(p.id));
  const cur = [...lu];
  let improving = true;
  let guard = 0;
  while (improving && guard++ < 40) {
    improving = false;
    let bestGain = 0;
    let bestSwap: { i: number; p: DfsPlayer } | null = null;
    for (let i = 0; i < DFS_SLOTS.length; i++) {
      if (opts.locks.has(cur[i]!.id)) continue;
      const slot = DFS_SLOTS[i]!;
      const inLineup = new Set(cur.map((p) => p.id));
      for (const c of cand) {
        if (inLineup.has(c.id) || !eligible(c, slot)) continue;
        const next = [...cur]; next[i] = c;
        if (salaryOf(next) > SALARY_CAP) continue;
        const gain = objOf(next, opts.mode) - objOf(cur, opts.mode);
        if (gain > bestGain) { bestGain = gain; bestSwap = { i, p: c }; }
      }
    }
    if (bestSwap) { cur[bestSwap.i] = bestSwap.p; improving = true; }
  }
  return cur;
}

/** Try to add a same-team WR/TE for the lineup's current QB. Returns null if impossible. */
function stackToQb(lu: DfsPlayer[], pool: readonly DfsPlayer[], opts: OptOpts): DfsPlayer[] | null {
  const qb = lu.find((p) => p.pos === "QB");
  if (!qb) return null;
  const cand = pool
    .filter((p) => !opts.excludes.has(p.id) && p.team === qb.team && (p.pos === "WR" || p.pos === "TE"))
    .sort((a, b) => objVal(b, opts.mode) - objVal(a, opts.mode));
  if (!cand.length) return null;
  const inLineup = new Set(lu.map((p) => p.id));
  const swappable = lu
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (p.pos === "WR" || p.pos === "TE") && !opts.locks.has(p.id))
    .sort((a, b) => objVal(a.p, opts.mode) - objVal(b.p, opts.mode));
  for (const { i } of swappable) {
    for (const c of cand) {
      if (inLineup.has(c.id)) continue;
      const next = [...lu]; next[i] = c;
      if (salaryOf(next) <= SALARY_CAP && DFS_SLOTS.every((s, j) => eligible(next[j]!, s))) return next;
    }
  }
  return null;
}

function enforceStack(lu: DfsPlayer[], pool: readonly DfsPlayer[], opts: OptOpts): DfsPlayer[] {
  if (qbStackCount(lu).stacked >= 1) return lu;

  // 1) try to stack a pass-catcher onto the current QB
  const stacked = stackToQb(lu, pool, opts);
  if (stacked) return stacked;

  // 2) fallback: the QB has no available pass-catcher. If the QB isn't locked,
  //    swap in the best stackable QB (one with same-team catchers) and stack that.
  const qbIdx = DFS_SLOTS.indexOf("QB");
  if (qbIdx < 0 || opts.locks.has(lu[qbIdx]!.id)) return lu;
  const inLineup = new Set(lu.map((p) => p.id));
  const altQbs = pool
    .filter((p) => p.pos === "QB" && !opts.excludes.has(p.id) && !inLineup.has(p.id))
    .filter((q) => pool.some((c) => c.team === q.team && (c.pos === "WR" || c.pos === "TE") && !opts.excludes.has(c.id)))
    .sort((a, b) => objVal(b, opts.mode) - objVal(a, opts.mode));
  for (const q of altQbs) {
    const swapped = [...lu]; swapped[qbIdx] = q;
    if (salaryOf(swapped) > SALARY_CAP) continue;
    const done = stackToQb(swapped, pool, opts);
    if (done) return done;
  }
  return lu;
}

/**
 * Randomised multi-start + hill-climb. Fast enough for the browser and used to
 * SEED the exact search below — on its own it has no optimality guarantee
 * (`scripts/dfs/oracle.py` measures the regret, and finds it).
 */
export function optimizeHeuristic(opts: OptOpts, pen: (p: DfsPlayer) => number = () => 0, restarts = 60, slate: readonly DfsPlayer[] = activeDfsSlate()): DfsPlayer[] | null {
  let best: DfsPlayer[] | null = null;
  let bestObj = -Infinity;
  // Seeded once per call, never from a clock or a module-level counter: the
  // same arguments replay the same restarts in the same order, in any process.
  const rand = rng32(0x9e3779b9);
  for (let r = 0; r < restarts; r++) {
    let lu = buildRandom(slate, opts, pen, rand);
    if (!lu) continue;
    lu = hillClimb(lu, slate, opts);
    if (opts.stack) lu = enforceStack(lu, slate, opts);
    if (salaryOf(lu) > SALARY_CAP) continue;
    const o = objOf(lu, opts.mode);
    if (o > bestObj) { bestObj = o; best = lu; }
  }
  return best;
}

/** A player's contribution to the search objective (mode value minus penalty). */
const searchValue = (p: DfsPlayer, mode: Mode, pen: (q: DfsPlayer) => number): number => objVal(p, mode) - pen(p);

const slotAccepts = (slot: DfsPos | "FLEX", p: DfsPlayer): boolean => eligible(p, slot);

/**
 * Exact branch-and-bound over the slot list.
 *
 * Why it exists: the product ships a "best" lineup. The heuristic above can be
 * beaten — measured, not theorised: `scripts/dfs/oracle.py` (CP-SAT) beat it on
 * 4/6 shipped-slate cases and 23/78 synthetic cases, by up to 5.9%. This search
 * closes that gap in-engine, and makes `stack: true` a real constraint instead
 * of a preference the fallback could silently drop.
 *
 * Correctness: pruning only ever discards branches whose admissible bound (the
 * fractional-knapsack relaxation of the remaining slots, respecting
 * distinctness and the salary cap) cannot beat the incumbent, so the result is
 * optimal *if* neither budget was exhausted — and never worse than the
 * heuristic seed that starts it. When `stack: true` is asked for, the seed only
 * counts as an incumbent if it actually stacks, so a stack-constrained result
 * can score below an unstacked seed: the hard constraint wins over the number.
 *
 * TWO budgets, because one of them does not bound time. `nodeBudget` counts
 * entries into `dfs`, but the work a single node does is proportional to its
 * slot's candidate list, and the admissible bound rescans the value/salary
 * order, so per-node cost grows with the pool. Measured 2026-09-18 on the
 * `makeBigPool` fixture, all four runs stopping on the SAME 400k nodes:
 *
 *     pool    work (candidate iterations)    wall clock
 *       50            13.8M                     2.3s
 *      100            30.9M                    10.6s
 *      150            47.5M                    24.1s
 *      200            63.3M                    43.8s
 *
 * Same node count, 19x the time. Cost per candidate iteration is close to
 * linear in pool size (0.12 microseconds at 36, 0.69 at 200), so the currency
 * that tracks wall clock is work x pool size, and that is what `costBudget`
 * bounds. 600M holds every pool size to roughly two seconds, and sits far
 * above every search that completes today: the 14-16 player correctness
 * fixtures finish in 6.8k-78.6k work (~1M cost) and the 36-player shipped
 * slate proves gpp in 1.62M work (58M cost). Raising it buys optimality on
 * big pools at the cost of freezing the caller; this runs in the browser on
 * the user's main thread (`components/fantasy/dfs-optimizer.tsx`), so it is
 * bounded on purpose.
 *
 * Both budgets are deterministic functions of the input — never a clock — so
 * an identical call returns an identical lineup on any machine.
 */
/**
 * A search result WITH its provenance.
 *
 * WHY THIS EXISTS. `optimizeExact` returns a lineup and nothing else, so a
 * result the budget cut short is indistinguishable from a proven optimum at
 * the call site. That ambiguity has a concrete cost one caller down:
 * `dfs-optimizer-edge.ts` cross-checks this solver against the independently
 * written one in `dfs-exact.ts` and prints `objectiveGapVsIncumbent`. The
 * exact side reports `optimal`; the incumbent side could not, so a non-zero
 * gap read the same whether the two solvers genuinely DISAGREED (the bug that
 * cross-check exists to catch) or this one simply ran out of budget. A
 * cross-check that cannot tell a disagreement from a timeout is not one.
 *
 * `optimal` is the same word, with the same meaning, as `ExactResult.optimal`
 * in `dfs-exact.ts`, deliberately: two flags in one directory spelling one
 * concept two ways is how they drift.
 */
export type SolveResult = {
  readonly lineup: DfsPlayer[] | null;
  /**
   * The search COMPLETED: no budget stopped it.
   *
   * True with a lineup means that lineup is optimal for this objective under
   * these constraints. True with `lineup: null` means the search PROVED no
   * feasible lineup exists. False always means a budget stopped the search, so
   * a lineup here is the incumbent, never a proof.
   *
   * The flag never overstates. Paths that refuse before searching at all (an
   * unplaceable lock) report false, because "we did not look" and "we looked
   * and it is not there" must not read the same.
   */
  readonly optimal: boolean;
  /** Nodes entered. Zero when the answer needed no search. */
  readonly nodes: number;
  /** Candidate iterations: the currency `costBudget` actually bounds. */
  readonly work: number;
};

export function solveExact(
  opts: OptOpts,
  pen: (p: DfsPlayer) => number = () => 0,
  restarts = 60,
  slate: readonly DfsPlayer[] = activeDfsSlate(),
  nodeBudget = 400_000,
  cap = SALARY_CAP,
  costBudget = DEFAULT_COST_BUDGET,
): SolveResult {
  const cand = slate.filter((p) => !opts.excludes.has(p.id));
  // Nothing to search. The answer "no feasible lineup" is PROVEN, not guessed.
  if (!cand.length) return { lineup: null, optimal: true, nodes: 0, work: 0 };

  const byId = new Map(cand.map((p) => [p.id, p]));
  const used = new Set<string>();
  const chosen: DfsPlayer[] = new Array(DFS_SLOTS.length);

  const stackable = (lu: readonly (DfsPlayer | undefined)[]): boolean => {
    const filled = lu.filter((p): p is DfsPlayer => Boolean(p));
    return qbStackCount(filled).stacked >= 1;
  };

  const seed = optimizeHeuristic(opts, pen, restarts, slate);

  // 1) locks are hard: place each locked player in a distinct legal slot first.
  const lockIds = [...opts.locks];
  for (const id of lockIds) {
    const p = byId.get(id);
    // Unknown pinned player (not on slate): do not invent a lineup. The search
    // never ran, so this is neither a proof nor a budget stop — `optimal` false
    // is the safe direction, because it only ever understates what we know.
    if (!p) return { lineup: seed ?? null, optimal: false, nodes: 0, work: 0 };
    let placed = false;
    for (let i = 0; i < DFS_SLOTS.length; i++) {
      if (chosen[i] === undefined && slotAccepts(DFS_SLOTS[i]!, p)) {
        chosen[i] = p; used.add(id); placed = true; break;
      }
    }
    if (!placed) return { lineup: seed ?? null, optimal: false, nodes: 0, work: 0 };
  }

  // The heuristic seed is only a valid incumbent when it satisfies the stack
  // constraint the caller asked for; otherwise it is kept purely as a
  // last-resort fallback for slates that cannot stack at all.
  const seedOk = seed !== null && (!opts.stack || stackable(seed));
  let best: DfsPlayer[] | null = seedOk ? seed : null;
  const fallback: DfsPlayer[] | null = seedOk ? null : seed;
  let bestVal = best ? best.reduce((s, p) => s + searchValue(p, opts.mode, pen), 0) : -Infinity;

  // 2) Search structures, index-based. The hot loop allocates nothing, hashes
  // nothing and never re-derives a value: candidate index arrays + typed arrays.
  type PoolKey = 0 | 1 | 2; // 0 SKILL (RB/WR/TE incl. FLEX), 1 QB, 2 DST
  const n = cand.length;
  const idxOf = new Map<string, number>(cand.map((p, i) => [p.id, i]));
  const VALUE = new Float64Array(n);
  const SALARY = new Int32Array(n);
  const POOL = new Int8Array(n);
  const poolOfPos = (pos: DfsPos): PoolKey => (pos === "QB" ? 1 : pos === "DST" ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const p = cand[i]!;
    VALUE[i] = searchValue(p, opts.mode, pen);
    SALARY[i] = p.salary;
    POOL[i] = poolOfPos(p.pos);
  }
  const usedIdx = new Uint8Array(n);
  for (const p of chosen) if (p) usedIdx[idxOf.get(p.id)!] = 1;

  /** candidate indices per slot, best value first (drives the search order) */
  const lists: number[][] = DFS_SLOTS.map((slot) =>
    Array.from({ length: n }, (_, i) => i)
      .filter((i) => !usedIdx[i] && slotAccepts(slot, cand[i]!))
      .sort((a, b) => VALUE[b]! - VALUE[a]!));

  const free: number[] = [];
  for (let i = 0; i < DFS_SLOTS.length; i++) if (chosen[i] === undefined) free.push(i);
  // most-constrained-first: fewer candidates searched earlier = earlier pruning
  free.sort((a, b) => lists[a]!.length - lists[b]!.length);
  // A slot no candidate can fill: proven infeasible without searching a node.
  if (free.some((i) => lists[i]!.length === 0)) {
    return { lineup: best ?? fallback, optimal: true, nodes: 0, work: 0 };
  }

  // per-slot pool, and suffix counts of the pools still to be filled — so a node
  // reads its remaining quotas in O(1) instead of walking the slot list
  const slotName = (idx: number): string => String(DFS_SLOTS[idx]);
  const slotPool = free.map((i) => poolOfPos((slotName(i) === "FLEX" ? "WR" : slotName(i)) as DfsPos));
  const remSkill = new Int32Array(free.length + 1);
  const remQB = new Int32Array(free.length + 1);
  const remDST = new Int32Array(free.length + 1);
  for (let d = free.length - 1; d >= 0; d--) {
    const isSkill = slotPool[d] === 0 ? 1 : 0;
    remSkill[d] = remSkill[d + 1]! + isSkill;
    remQB[d] = remQB[d + 1]! + (slotPool[d] === 1 ? 1 : 0);
    remDST[d] = remDST[d + 1]! + (slotPool[d] === 2 ? 1 : 0);
  }

  // cheapest-first index order per pool (salary floor) and value-per-salary
  // order across all candidates (fractional-knapsack bound). Both fixed once.
  const cheapByPool: number[][] = [[], [], []];
  for (let i = 0; i < n; i++) cheapByPool[POOL[i]!]!.push(i);
  for (const l of cheapByPool) l.sort((a, b) => SALARY[a]! - SALARY[b]!);
  const ratio = Array.from({ length: n }, (_, i) => i).sort((a, b) => VALUE[b]! / SALARY[b]! - VALUE[a]! / SALARY[a]!);

  /** lower bound on the salary of the cheapest completion of one pool */
  const floorFor = (poolIdx: PoolKey, k: number): number => {
    if (k === 0) return 0;
    let s = 0;
    let m = 0;
    for (const i of cheapByPool[poolIdx]!) {
      if (usedIdx[i]) continue;
      s += SALARY[i]!;
      if (++m === k) return s;
    }
    return Infinity; // not enough distinct players remain
  };

  let salary = chosen.reduce((s, p) => s + (p ? p.salary : 0), 0);
  let val = chosen.reduce((s, p) => s + (p ? searchValue(p, opts.mode, pen) : 0), 0);
  let nodes = 0;
  let work = 0;
  let exhausted = false;
  // cost = work x pool size (see the header). Deriving the work ceiling once,
  // from the pool size, keeps the comparison in the hot loop a single integer
  // test while still bounding wall clock rather than recursion depth.
  const workBudget = Math.max(1, Math.floor(costBudget / n));

  const dfs = (depth: number): void => {
    if (exhausted) return;
    if (++nodes > nodeBudget) { exhausted = true; return; }
    if (depth === free.length) {
      if (opts.stack && !stackable(chosen)) return;
      if (salary > cap) return;
      if (val > bestVal + 1e-9) {
        bestVal = val;
        best = [...chosen] as DfsPlayer[];
      }
      return;
    }

    const slotIdx = free[depth]!;
    const kSkill = remSkill[depth + 1]!;
    const kQB = remQB[depth + 1]!;
    const kDST = remDST[depth + 1]!;

    for (const ci of lists[slotIdx]!) {
      // Checked BEFORE any mutation for this candidate, so returning here
      // leaves `chosen`, `salary`, `val` and `usedIdx` exactly as the parent
      // frame left them; its own unwind then runs as normal.
      if (++work > workBudget) { exhausted = true; return; }
      if (usedIdx[ci]) continue;
      const nextSalary = salary + SALARY[ci]!;

      usedIdx[ci] = 1;
      // salary floor: cheapest possible completion of each remaining pool
      const floor = floorFor(0, kSkill) + floorFor(1, kQB) + floorFor(2, kDST);
      if (nextSalary + floor > cap) { usedIdx[ci] = 0; continue; }

      // admissible bound: this pick + the fractional-knapsack relaxation of
      // what the remaining slots could add within the leftover salary
      const v = VALUE[ci]!;
      let left = cap - nextSalary;
      let bound = val + v;
      for (const qi of ratio) {
        if (left <= 0) break;
        if (usedIdx[qi]) continue;
        const qp = POOL[qi]!;
        if ((qp === 0 ? kSkill : qp === 1 ? kQB : kDST) <= 0) continue; // group full
        const qv = VALUE[qi]!;
        const qs = SALARY[qi]!;
        if (qs <= left) {
          bound += qv > 0 ? qv : 0;
          left -= qs;
        } else {
          bound += (qv > 0 ? qv : 0) * (left / qs); // fractional last item
          break;
        }
      }
      if (bound <= bestVal + 1e-9) { usedIdx[ci] = 0; continue; }

      const p = cand[ci]!;
      chosen[slotIdx] = p;
      salary = nextSalary;
      val += v;

      // stack feasibility: once the QB is placed, a same-team catcher must still
      // be reachable from the remaining slots
      let stackOk = true;
      if (opts.stack && !stackable(chosen)) {
        const qb = (chosen.filter(Boolean) as DfsPlayer[]).find((q) => q.pos === "QB");
        let catchers = 0;
        if (qb) {
          for (let i = 0; i < n; i++) {
            const q = cand[i]!;
            if (!usedIdx[i] && q.team === qb.team && (q.pos === "WR" || q.pos === "TE")) catchers++;
          }
        } else {
          catchers = 1;
        }
        let catcherSlots = 0;
        for (let d = depth + 1; d < free.length; d++) {
          const s = slotName(free[d]!);
          if (s === "WR" || s === "TE" || s === "FLEX") catcherSlots++;
        }
        stackOk = catchers > 0 && catcherSlots > 0;
      }
      if (stackOk) dfs(depth + 1);

      chosen[slotIdx] = undefined as unknown as DfsPlayer;
      salary -= SALARY[ci]!;
      val -= v;
      usedIdx[ci] = 0;
      if (exhausted) return;
    }
  };

  dfs(0);
  if (process.env.DFS_SEARCH_DEBUG) {
    console.error(`[dfs-exact] nodes=${nodes}/${nodeBudget} work=${work}/${workBudget} exhausted=${exhausted} best=${bestVal} mode=${opts.mode} stack=${opts.stack}`);
  }
  return { lineup: best ?? fallback, optimal: !exhausted, nodes, work };
}

/**
 * The lineup alone, for callers that do not inspect provenance. Identical
 * search, identical result; `solveExact` is the same call with the flag.
 */
export function optimizeExact(
  opts: OptOpts,
  pen: (p: DfsPlayer) => number = () => 0,
  restarts = 60,
  slate: readonly DfsPlayer[] = activeDfsSlate(),
  nodeBudget = 400_000,
  cap = SALARY_CAP,
  costBudget = DEFAULT_COST_BUDGET,
): DfsPlayer[] | null {
  return solveExact(opts, pen, restarts, slate, nodeBudget, cap, costBudget).lineup;
}

/**
 * The public "best lineup" entry point: exact search seeded by the heuristic.
 * Falls back to the heuristic result alone if the slate is too large to search
 * within the node budget (the search returns its incumbent in that case, so the
 * result is never worse than the heuristic would have been).
 */
export function optimizeOne(opts: OptOpts, pen: (p: DfsPlayer) => number = () => 0, restarts = 60, slate: readonly DfsPlayer[] = activeDfsSlate(), nodeBudget = 400_000, costBudget = DEFAULT_COST_BUDGET): DfsPlayer[] | null {
  return optimizeExact(opts, pen, restarts, slate, nodeBudget, SALARY_CAP, costBudget);
}


export type LineupMetrics = {
  readonly salary: number;
  readonly proj: number;
  readonly floor: number;
  readonly ceiling: number;
  readonly totalOwn: number; // sum of ownership points
  readonly leverageScore: number; // avg leverage
  readonly stackTeam: string | null;
  readonly stacked: number;
};

export function metrics(lu: Lineup): LineupMetrics {
  const { team, stacked } = qbStackCount(lu);
  return {
    salary: salaryOf(lu),
    proj: Math.round(lu.reduce((s, p) => s + p.proj, 0) * 10) / 10,
    floor: Math.round(lu.reduce((s, p) => s + p.floor, 0)),
    ceiling: Math.round(lu.reduce((s, p) => s + p.ceiling, 0)),
    totalOwn: Math.round(lu.reduce((s, p) => s + p.own * 100, 0)),
    leverageScore: Math.round((lu.reduce((s, p) => s + leverage(p), 0) / lu.length) * 100) / 100,
    stackTeam: team,
    stacked,
  };
}

export type GenResult = {
  readonly lineups: ReadonlyArray<{ players: Lineup; metrics: LineupMetrics }>;
  readonly exposure: ReadonlyArray<{ id: string; name: string; pos: DfsPos; count: number; pct: number }>;
  /** How many lineups the caller asked for. */
  readonly requested: number;
  /**
   * The search STOPPED before returning `requested` lineups. It is not a proof
   * that no further feasible lineup exists — sequential construction gives up
   * under the current locks, excludes, cap and exposure pressure. The UI says
   * "stopped", never "exhausted".
   */
  readonly partial: boolean;
  /**
   * The per-player exposure TARGET the prefix rule enforced (0-1). Realized
   * shares in `exposure` can exceed it on a short portfolio, because the rule
   * bans a player only once their running share has already reached it. The UI
   * discloses the target and labels the shares realized, never capped.
   */
  readonly exposureTarget: number;
};

/**
 * Generate N unique lineups with exposure control.
 *
 * `signalPen` is the environment penalty from `dfs-signals.ts` — weather, implied
 * team totals, backup quarterbacks, airwave fades. It is ADDED to the internal
 * diversity penalty rather than replacing it, so exposure control and world
 * knowledge compose instead of overwriting each other. It defaults to zero, so
 * callers that do not pass one behave exactly as before.
 *
 * This module deliberately does NOT import dfs-signals; the penalty arrives as a
 * plain function so the dependency stays one-way (signals -> optimizer).
 */
export function generateLineups(
  opts: OptOpts,
  count: number,
  maxExposure = 0.6,
  slate: readonly DfsPlayer[] = activeDfsSlate(),
  signalPen: (p: DfsPlayer) => number = () => 0,
): GenResult {
  const usage = new Map<string, number>();
  const seen = new Set<string>();
  const lineups: { players: Lineup; metrics: LineupMetrics }[] = [];

  const key = (lu: Lineup) => lu.map((p) => p.id).sort().join(",");

  for (let n = 0; n < count; n++) {
    // hard exclude players at max exposure
    const overexposed = new Set<string>();
    for (const [id, c] of usage) if (c / count >= maxExposure) overexposed.add(id);
    const dynOpts: OptOpts = { ...opts, excludes: new Set([...opts.excludes, ...overexposed]) };
    // soft diversity penalty, plus whatever the world says about this player
    const pen = (p: DfsPlayer) => ((usage.get(p.id) ?? 0) / Math.max(1, n)) * 9 + signalPen(p);

    let lu: DfsPlayer[] | null = null;
    for (let tries = 0; tries < 6; tries++) {
      // smaller node budget here: this loop runs per lineup and its job is
      // diversity, not single-lineup optimality (which /optimizer calls direct).
      const c = optimizeOne(dynOpts, pen, 40, slate, 20_000);
      if (c && !seen.has(key(c))) { lu = c; break; }
      if (c && tries === 5) lu = c; // accept dup as last resort
    }
    if (!lu) break;
    seen.add(key(lu));
    lineups.push({ players: lu, metrics: metrics(lu) });
    for (const p of lu) usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
  }

  const byId = new Map(slate.map((p) => [p.id, p]));
  const exposure = [...usage.entries()]
    .map(([id, c]) => {
      const p = byId.get(id)!;
      return { id, name: p.name, pos: p.pos, count: c, pct: Math.round((c / Math.max(1, lineups.length)) * 100) };
    })
    .sort((a, b) => b.count - a.count);

  return {
    lineups,
    exposure,
    requested: count,
    partial: lineups.length < count,
    exposureTarget: maxExposure,
  };
}
