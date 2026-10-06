/**
 * Construction-rule upgrades — HARNESS layer (LOCAL ONLY, never committed).
 *
 * Two GPP/leverage rules from docs/research/2026-09-25/gpp-winning-lineup-construction.md:
 *
 *  1. DOUBLE STACK: QB + ≥2 same-team pass-catchers (WR/TE/RB). The research calls
 *     QB+2 the single biggest construction edge (39.5% of top-100 Milly lineups vs
 *     28.6% of the field). The engine's `stack: true` only enforces ≥1, so we repair
 *     post-hoc: swap the worst non-mate skill player for the best available same-team
 *     catcher until 2 mates are present. Thin QB teams (<2 catchers in the pool) fall
 *     back to a single stack gracefully — never a crash.
 *
 *  2. NO TE IN FLEX: winners punt-or-premium TE and never flex it (negative leverage).
 *     Repair: swap the FLEX TE for the best affordable RB/WR. Only in the degenerate
 *     case (no affordable RB/WR exists) is the TE kept, and it is flagged.
 *
 * Cash mode: untouched — these are tournament-only rules. Nothing here invents data;
 * every swap respects the salary cap, slot eligibility, locks, and excludes.
 */
import {
  DFS_SLOTS,
  SALARY_CAP,
  type DfsPlayer,
  type DfsPos,
} from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-slate";
import {
  eligible,
  objVal,
  salaryOf,
  type Lineup,
  type Mode,
  type OptOpts,
} from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-optimizer";

const CATCHER_POS: ReadonlySet<DfsPos> = new Set(["WR", "TE", "RB"]);
const FLEX_IDX = (DFS_SLOTS as readonly string[]).indexOf("FLEX");
const DOUBLE_STACK_NEED = 2;

export function qbOf(lu: Lineup): DfsPlayer | undefined {
  return lu.find((p) => p.pos === "QB");
}

/** Same-team pass-catchers (WR/TE/RB), excluding the QB himself. */
export function stackMates(lu: Lineup): DfsPlayer[] {
  const qb = qbOf(lu);
  if (!qb) return [];
  return lu.filter(
    (p) => p.id !== qb.id && p.team === qb.team && CATCHER_POS.has(p.pos),
  );
}

export function stackMateCount(lu: Lineup): number {
  return stackMates(lu).length;
}

export function isDoubleStacked(lu: Lineup): boolean {
  return stackMateCount(lu) >= DOUBLE_STACK_NEED;
}

export function hasTeFlex(lu: Lineup): boolean {
  return lu[FLEX_IDX]!.pos === "TE";
}

export type StackRepair = {
  lineup: DfsPlayer[];
  repaired: boolean;
  /** true when the QB's team has <2 eligible catchers in the pool (thin team) */
  thinTeamFallback: boolean;
  notes: string[];
};

/**
 * Enforce QB + ≥2 same-team catchers via objective-ordered swaps.
 * Never places a TE into FLEX while repairing (rule 2 holds during rule 1).
 */
export function enforceDoubleStack(
  lu: Lineup,
  pool: readonly DfsPlayer[],
  opts: OptOpts,
  mode: Mode,
): StackRepair {
  const notes: string[] = [];
  let cur = [...lu];
  const qb = qbOf(cur);
  if (!qb) {
    return { lineup: cur, repaired: false, thinTeamFallback: false, notes: ["no QB — cannot evaluate stack"] };
  }
  const poolCatchers = pool.filter(
    (p) => !opts.excludes.has(p.id) && p.team === qb.team && p.pos !== "QB" && CATCHER_POS.has(p.pos),
  );
  if (poolCatchers.length < DOUBLE_STACK_NEED) {
    notes.push(
      `thin team: ${qb.team} has ${poolCatchers.length} eligible catcher(s) in pool — single-stack fallback`,
    );
    return { lineup: cur, repaired: false, thinTeamFallback: true, notes };
  }

  let repaired = false;
  for (let iter = 0; iter < 6 && stackMateCount(cur) < DOUBLE_STACK_NEED; iter++) {
    const inLineup = new Set(cur.map((p) => p.id));
    const mateIds = new Set(stackMates(cur).map((p) => p.id));
    const cands = poolCatchers
      .filter((p) => !inLineup.has(p.id))
      .sort((a, b) => objVal(b, mode) - objVal(a, mode));
    if (!cands.length) break;
    // Swappable: non-QB, non-DST, non-locked. Non-mates first (swapping a mate
    // for another mate never increases the count, so skip those while short).
    const swappable = cur
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.pos !== "QB" && p.pos !== "DST" && !opts.locks.has(p.id))
      .filter(({ p }) => !mateIds.has(p.id))
      .sort((a, b) => objVal(a.p, mode) - objVal(b.p, mode));
    let swapped = false;
    for (const { p: out, i } of swappable) {
      const slot = DFS_SLOTS[i]!;
      for (const c of cands) {
        if (inLineup.has(c.id)) continue;
        if (!eligible(c, slot)) continue;
        if (c.pos === "TE" && (slot as string) === "FLEX") continue; // rule 2 holds during repair
        const next = [...cur];
        next[i] = c;
        if (salaryOf(next) > SALARY_CAP) continue;
        if (!DFS_SLOTS.every((s, j) => eligible(next[j]!, s))) continue;
        cur = next;
        repaired = true;
        swapped = true;
        notes.push(`double-stack: ${out.name} (${out.pos}) → ${c.name} (${c.pos}, ${c.team})`);
        break;
      }
      if (swapped) break;
    }
    if (!swapped) break;
  }
  const final = stackMateCount(cur);
  if (final < DOUBLE_STACK_NEED) {
    notes.push(`repair incomplete: ${final}/${DOUBLE_STACK_NEED} mates (kept best effort)`);
  }
  return { lineup: cur, repaired, thinTeamFallback: false, notes };
}

export type TeFlexRepair = {
  lineup: DfsPlayer[];
  repaired: boolean;
  /** true only when no affordable RB/WR replacement exists (degenerate) */
  degenerateKeep: boolean;
  notes: string[];
};

/** Remove TE from FLEX: swap for the best affordable RB/WR. */
export function removeTeFlex(
  lu: Lineup,
  pool: readonly DfsPlayer[],
  opts: OptOpts,
  mode: Mode,
): TeFlexRepair {
  const notes: string[] = [];
  const cur = [...lu];
  const fp = cur[FLEX_IDX]!;
  if (fp.pos !== "TE") return { lineup: cur, repaired: false, degenerateKeep: false, notes };
  const inLineup = new Set(cur.map((p) => p.id));
  const cands = pool
    .filter((p) => !opts.excludes.has(p.id) && !inLineup.has(p.id) && (p.pos === "RB" || p.pos === "WR"))
    .sort((a, b) => objVal(b, mode) - objVal(a, mode));
  for (const c of cands) {
    const next = [...cur];
    next[FLEX_IDX] = c;
    if (salaryOf(next) > SALARY_CAP) continue;
    if (!DFS_SLOTS.every((s, j) => eligible(next[j]!, s))) continue;
    notes.push(`TE-FLEX: ${fp.name} → ${c.name} (${c.pos})`);
    return { lineup: next, repaired: true, degenerateKeep: false, notes };
  }
  notes.push(`TE-FLEX kept: no affordable RB/WR replacement for ${fp.name} (degenerate)`);
  return { lineup: cur, repaired: false, degenerateKeep: true, notes };
}

export type AppliedRules = {
  lineup: DfsPlayer[];
  doubleStacked: boolean;
  teFlex: boolean;
  thinTeamFallback: boolean;
  degenerateTeFlexKeep: boolean;
  notes: string[];
};

/**
 * Apply both GPP/leverage construction rules. Idempotent; never throws.
 * Runs double-stack then TE-FLEX removal, re-checking until stable (≤3 passes).
 */
export function applyConstructionRules(
  lu: Lineup,
  pool: readonly DfsPlayer[],
  opts: OptOpts,
  mode: Mode,
): AppliedRules {
  let cur = [...lu];
  const notes: string[] = [];
  let thinTeamFallback = false;
  let degenerateTeFlexKeep = false;
  for (let pass = 0; pass < 3; pass++) {
    const ds = enforceDoubleStack(cur, pool, opts, mode);
    cur = ds.lineup;
    notes.push(...ds.notes);
    if (ds.thinTeamFallback) thinTeamFallback = true;
    const tf = removeTeFlex(cur, pool, opts, mode);
    cur = tf.lineup;
    notes.push(...tf.notes);
    if (tf.degenerateKeep) degenerateTeFlexKeep = true;
    if (!ds.repaired && !tf.repaired) break;
  }
  return {
    lineup: cur,
    doubleStacked: isDoubleStacked(cur),
    teFlex: hasTeFlex(cur),
    thinTeamFallback,
    degenerateTeFlexKeep,
    notes,
  };
}
