/**
 * DFS lineup validation — independent of the solver.
 *
 * This module never calls optimizeOne/generateLineups. It re-checks their
 * OUTPUT (and their INPUT) against the roster rules, so a solver bug can be
 * caught rather than echoed. Shared shape constants (DFS_SLOTS, SALARY_CAP)
 * are imported — the rules themselves, not the solver's opinion of them.
 *
 * Identity is the ATHLETE (normalized name + team), not the row id: an import
 * that suffixes a repeated id (dk-import) must not smuggle the same athlete
 * into one lineup twice.
 */

import { DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";
import type { OptOpts } from "./dfs-optimizer";

export type ValidationIssue = {
  readonly code:
    | "WRONG_SIZE"
    | "SLOT_MISMATCH"
    | "OVER_CAP"
    | "DUPLICATE_ATHLETE"
    | "UNKNOWN_PLAYER"
    | "LOCK_MISSING"
    | "EXCLUDED_PRESENT"
    | "STACK_UNSATISFIED"
    | "NONFINITE_VALUE";
  readonly detail: string;
};

const FLEX_OK: ReadonlySet<DfsPos> = new Set(["RB", "WR", "TE"]);

/** Normalized athlete identity: name + team, case/space-insensitive. */
export function athleteKey(p: Pick<DfsPlayer, "name" | "team">): string {
  return `${p.name.trim().toLowerCase()}|${p.team.trim().toUpperCase()}`;
}

function finite(n: number): boolean {
  return Number.isFinite(n);
}

/**
 * Validate solver INPUT before solving. Returns issues (empty = proceed).
 * Lock/exclude conflicts and locked ids absent from the slate are ERRORS —
 * the solver silently drops excluded locks, so callers must reject first.
 */
export function validateOptimizerInput(
  opts: OptOpts,
  slate: readonly DfsPlayer[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set(slate.map((p) => p.id));
  for (const id of opts.locks) {
    if (opts.excludes.has(id)) {
      issues.push({ code: "LOCK_MISSING", detail: `Locked player ${id} is also excluded — conflict, refusing to solve.` });
    } else if (!ids.has(id)) {
      issues.push({ code: "LOCK_MISSING", detail: `Locked player ${id} is not on this slate — refusing to solve.` });
    }
  }
  const seenAthlete = new Map<string, string>();
  for (const p of slate) {
    const key = athleteKey(p);
    const prev = seenAthlete.get(key);
    if (prev !== undefined && prev !== p.id) {
      issues.push({ code: "DUPLICATE_ATHLETE", detail: `Slate lists ${p.name} (${p.team}) twice (${prev}, ${p.id}) — same athlete, distinct rows.` });
    } else {
      seenAthlete.set(key, p.id);
    }
  }
  return issues;
}

/** Validate one solved lineup against the rules. Empty = legal. */
export function validateLineup(
  lineup: readonly DfsPlayer[],
  opts: OptOpts,
  slate: readonly DfsPlayer[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (lineup.length !== DFS_SLOTS.length) {
    issues.push({ code: "WRONG_SIZE", detail: `Lineup has ${lineup.length} players, need ${DFS_SLOTS.length}.` });
    return issues;
  }
  const byId = new Map(slate.map((p) => [p.id, p]));
  lineup.forEach((p, i) => {
    const slot = DFS_SLOTS[i]!;
    const ok = (slot as string) === "FLEX" ? FLEX_OK.has(p.pos) : p.pos === slot;
    if (!ok) issues.push({ code: "SLOT_MISMATCH", detail: `${p.name} (${p.pos}) cannot fill slot ${i + 1} (${slot}).` });
    if (!byId.has(p.id)) issues.push({ code: "UNKNOWN_PLAYER", detail: `${p.name} (${p.id}) is not on this slate.` });
    if (opts.excludes.has(p.id)) issues.push({ code: "EXCLUDED_PRESENT", detail: `${p.name} was faded but appears in the lineup.` });
    for (const n of [p.salary, p.proj, p.floor, p.ceiling, p.own]) {
      if (!finite(n)) {
        issues.push({ code: "NONFINITE_VALUE", detail: `${p.name} carries a non-finite value — refusing.` });
        break;
      }
    }
  });
  const salary = lineup.reduce((s, p) => s + p.salary, 0);
  if (salary > SALARY_CAP) {
    issues.push({ code: "OVER_CAP", detail: `Salary $${salary.toLocaleString()} exceeds the $${SALARY_CAP.toLocaleString()} cap.` });
  }
  const seenAthlete = new Set<string>();
  for (const p of lineup) {
    const key = athleteKey(p);
    if (seenAthlete.has(key)) {
      issues.push({ code: "DUPLICATE_ATHLETE", detail: `${p.name} (${p.team}) appears twice — one athlete, one slot.` });
    }
    seenAthlete.add(key);
  }
  for (const id of opts.locks) {
    if (!opts.excludes.has(id) && !lineup.some((p) => p.id === id)) {
      issues.push({ code: "LOCK_MISSING", detail: `Pinned player ${id} is missing from the lineup.` });
    }
  }
  if (opts.stack) {
    const qb = lineup.find((p) => p.pos === "QB");
    const stacked = !!qb && lineup.some((p) => p.id !== qb.id && p.team === qb.team && (p.pos === "WR" || p.pos === "TE"));
    if (!stacked) issues.push({ code: "STACK_UNSATISFIED", detail: "Stacking was requested but no same-team pass catcher pairs the QB." });
  }
  return issues;
}
