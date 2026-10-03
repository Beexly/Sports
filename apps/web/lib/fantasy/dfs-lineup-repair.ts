/**
 * DFS lineup repair — manual, explicit, never autonomous.
 *
 * A saved lineup is device-local session state (no server persistence, no
 * contest submission path anywhere in this module). When a player in it
 * becomes unavailable, `proposeRepair` lists LEGAL swaps per affected slot:
 * slot-eligible, cap-feasible, no duplicates by athlete, excludes never
 * offered, locked and already-started players preserved with a reason.
 *
 * The proposal is data, not an action: nothing is applied until the caller
 * invokes `applySwap` (the explicit user gesture). Event-driven auto-repair
 * is intentionally absent — there is no verified gsis_id → DK-slate
 * crosswalk and no live inactives feed (nflverse `injuries` is a lagged
 * weekly report), so availability flags arrive via the manual `unavailable`
 * set and every proposal carries its source + timestamp.
 */

import { DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";
import { athleteKey } from "./dfs-lineup-validation";
import type { OptOpts } from "./dfs-optimizer";

export type RepairSource =
  | { readonly kind: "manual"; readonly markedAt: string }
  | {
      readonly kind: "nflverse-injuries";
      readonly season: number;
      readonly week: number | null;
      readonly generatedAt: string;
      readonly note: string;
    };

export type RepairCandidate = {
  readonly inn: DfsPlayer;
  /** New lineup salary after this swap (always ≤ cap — enforced, not hoped). */
  readonly newSalary: number;
  readonly salaryDelta: number;
  /** Null when the candidate's projection is missing/non-finite: reported, never ranked. */
  readonly projDelta: number | null;
  readonly projUnknown: boolean;
  /** True when this swap would leave a requested QB stack unsatisfied. Factual flag — not a veto. */
  readonly breaksStack: boolean;
};

export type SlotRepair =
  | { readonly kind: "candidates"; readonly slotIndex: number; readonly out: DfsPlayer; readonly candidates: readonly RepairCandidate[] }
  | { readonly kind: "no-alternative"; readonly slotIndex: number; readonly out: DfsPlayer; readonly reason: string }
  | { readonly kind: "preserved"; readonly slotIndex: number; readonly out: DfsPlayer; readonly reason: "locked" | "started" };

export type RepairProposal = {
  readonly source: RepairSource;
  readonly slots: readonly SlotRepair[];
};

const FLEX_OK: ReadonlySet<DfsPos> = new Set(["RB", "WR", "TE"]);

function slotFits(slot: DfsPos, pos: DfsPos): boolean {
  return (slot as string) === "FLEX" ? FLEX_OK.has(pos) : slot === pos;
}

function finite(n: number): boolean {
  return Number.isFinite(n);
}

function stackSatisfied(lineup: readonly DfsPlayer[]): boolean {
  const qb = lineup.find((p) => p.pos === "QB");
  return !!qb && lineup.some((p) => p.id !== qb.id && p.team === qb.team && (p.pos === "WR" || p.pos === "TE"));
}

/**
 * Propose legal swaps for each lineup member flagged unavailable.
 * Pure: the input lineup is never mutated; the proposal requires an
 * explicit `applySwap` to take effect.
 */
export function proposeRepair(args: {
  readonly lineup: readonly DfsPlayer[];
  readonly unavailable: ReadonlySet<string>;
  readonly pool: readonly DfsPlayer[];
  readonly opts: OptOpts;
  readonly started?: ReadonlySet<string>;
  readonly source: RepairSource;
}): RepairProposal {
  const { lineup, unavailable, pool, opts, started = new Set<string>(), source } = args;
  const total = lineup.reduce((s, p) => s + (finite(p.salary) ? p.salary : 0), 0);
  const slots: SlotRepair[] = [];

  lineup.forEach((out, slotIndex) => {
    if (!unavailable.has(out.id)) return;
    if (started.has(out.id)) {
      slots.push({
        kind: "preserved",
        slotIndex,
        out,
        reason: "started",
      });
      return;
    }
    if (opts.locks.has(out.id)) {
      slots.push({
        kind: "preserved",
        slotIndex,
        out,
        reason: "locked",
      });
      return;
    }
    const slot = DFS_SLOTS[slotIndex];
    if (slot === undefined) return;
    const inLineupIds = new Set(lineup.map((p) => p.id));
    const inLineupAthletes = new Set(lineup.filter((p) => p.id !== out.id).map(athleteKey));
    const known: RepairCandidate[] = [];
    const unknown: RepairCandidate[] = [];
    let sawOverCap = false;
    for (const c of pool) {
      if (c.id === out.id || inLineupIds.has(c.id)) continue;
      if (inLineupAthletes.has(athleteKey(c))) continue;
      if (opts.excludes.has(c.id) || unavailable.has(c.id)) continue;
      if (!slotFits(slot, c.pos)) continue;
      if (!finite(c.salary)) continue;
      const newSalary = total - out.salary + c.salary;
      if (newSalary > SALARY_CAP) {
        sawOverCap = true;
        continue;
      }
      const swapped = lineup.map((p, i) => (i === slotIndex ? c : p));
      const breaksStack = opts.stack && !stackSatisfied(swapped);
      if (finite(c.proj) && finite(out.proj)) {
        known.push({
          inn: c,
          newSalary,
          salaryDelta: c.salary - out.salary,
          projDelta: c.proj - out.proj,
          projUnknown: false,
          breaksStack,
        });
      } else {
        // Factual comparison only: projection unknown, so no delta and no rank.
        unknown.push({
          inn: c,
          newSalary,
          salaryDelta: c.salary - out.salary,
          projDelta: null,
          projUnknown: true,
          breaksStack,
        });
      }
    }
    known.sort((a, b) => (b.inn.proj as number) - (a.inn.proj as number));
    const candidates = [...known, ...unknown];
    if (candidates.length === 0) {
      slots.push({
        kind: "no-alternative",
        slotIndex,
        out,
        reason: sawOverCap
          ? "Every slot-eligible alternative breaks the salary cap — loosen a pin/fade or free salary elsewhere first."
          : "No slot-eligible alternative exists in this pool — nothing legal to offer, so nothing is offered.",
      });
    } else {
      slots.push({ kind: "candidates", slotIndex, out, candidates });
    }
  });

  return { source, slots };
}

/**
 * The explicit user gesture: build a NEW lineup with `inn` in `slotIndex`.
 * Returns a fresh array; the input is never mutated.
 */
export function applySwap(lineup: readonly DfsPlayer[], slotIndex: number, inn: DfsPlayer): DfsPlayer[] {
  return lineup.map((p, i) => (i === slotIndex ? inn : p));
}
