/**
 * GENESIS LAYER — Action Half-Life (Invention 54).
 *
 * Not every edge decays at the same speed. A stale prop dies in minutes; a DFS salary lag lasts
 * until lock; a waiver edge to the claim deadline; a trade buy-low for a week or two; a dynasty
 * dislocation for months. The half-life tells GSE which ACTION to express the same signal through:
 * an RB role shock can be too late to bet, still good for DFS, perfect for waivers, dangerous for
 * trades, and overhyped for dynasty. Pure + deterministic.
 *
 *   AHL = time until DecisionValue(t) ≤ 0.5 × DecisionValue(t0)
 */

export type ActionSurface =
  | "stale_prop" | "waiver_add" | "trade_offer" | "dfs_salary" | "dfs_ownership"
  | "start_sit" | "dynasty" | "bestball_adp";

export interface ActionHalfLifeInput {
  readonly surface: ActionSurface;
  readonly decisionValueT0: number; // 0..1
  /** Exponential decay rate per hour (> 0). */
  readonly decayPerHour: number;
  /** A hard lock that zeroes the value (e.g. salary lock), in hours from now. */
  readonly hardLockInHours?: number;
}

export type HalfLifeTier = "minutes" | "hours" | "days" | "weeks" | "months";

export interface ActionHalfLifeResult {
  readonly surface: ActionSurface;
  readonly halfLifeHours: number | null;
  readonly effectiveWindowHours: number;
  readonly tier: HalfLifeTier;
  readonly note: string;
}

/** Typical decay priors per surface (fractional per hour) — starting points, not fitted. */
export const SURFACE_DECAY_PRIORS: Readonly<Record<ActionSurface, number>> = {
  stale_prop: 4.0, dfs_ownership: 0.5, start_sit: 0.3, dfs_salary: 0.02,
  waiver_add: 0.03, trade_offer: 0.01, bestball_adp: 0.005, dynasty: 0.0008,
};

function tierFor(hours: number): HalfLifeTier {
  if (hours < 0.5) return "minutes";
  if (hours < 24) return "hours";
  if (hours < 24 * 7) return "days";
  if (hours < 24 * 30) return "weeks";
  return "months";
}

/** Estimate an action's half-life and effective decision window. */
export function computeActionHalfLife(i: ActionHalfLifeInput): ActionHalfLifeResult {
  const rate = i.decayPerHour;
  const halfLifeHours = rate > 0 ? Number((Math.log(2) / rate).toFixed(3)) : null;
  const hl = halfLifeHours ?? Number.POSITIVE_INFINITY;
  const effectiveWindowHours = Number(Math.min(hl, i.hardLockInHours ?? Number.POSITIVE_INFINITY).toFixed(3));
  const tierBasis = Number.isFinite(effectiveWindowHours) ? effectiveWindowHours : hl;
  const tier = tierFor(Number.isFinite(tierBasis) ? tierBasis : 24 * 365);
  return {
    surface: i.surface,
    halfLifeHours,
    effectiveWindowHours: Number.isFinite(effectiveWindowHours) ? effectiveWindowHours : Number.POSITIVE_INFINITY,
    tier,
    note: halfLifeHours === null
      ? `${i.surface}: no decay modeled${i.hardLockInHours != null ? `, but locks in ${i.hardLockInHours}h` : ""}.`
      : `${i.surface}: half-life ~${halfLifeHours}h (${tier}); effective window ${Number.isFinite(effectiveWindowHours) ? effectiveWindowHours + "h" : "open"}.`,
  };
}
