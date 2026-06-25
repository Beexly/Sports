/**
 * FANTASY DISCOVERY LAYER — Fantasy Conservation Engine (Invention F15).
 *
 * A team has a finite number of plays, dropbacks, routes, targets, carries, red-zone snaps,
 * goal-line touches, air yards, and touchdowns. Fantasy projections fail when they ignore that
 * conservation: a WR1 injury whose targets "vanish", a backup whose ownership spikes without
 * inheriting the valuable touches, a stale DFS salary the ownership already corrected past, a rank
 * move with no sportsbook/role support, a platform projection that ignores a real role shock.
 * This detects incoherent fantasy worlds — a claimed move that exceeds its underlying support.
 * Pure + deterministic.
 */

export type FantasyIncoherenceKind =
  | "opportunity_without_volume"  // team total up but player opportunity unchanged
  | "vacuum_not_redistributed"    // WR injury but no target redistribution
  | "ownership_without_role"      // backup ownership overreacts without RZ/3rd-down role
  | "stale_salary_overcorrected"  // DFS salary stale yet ownership overcorrected
  | "rank_without_support"        // analyst rank moved without sportsbook/role support
  | "projection_ignores_shock";   // platform projection ignores a real role shock

export interface FantasyConservationInput {
  readonly kind: FantasyIncoherenceKind;
  /** Magnitude of the asserted move/claim, 0..1. */
  readonly claimedMove: number;
  /** Supporting role / role-mass / sportsbook evidence, 0..1. */
  readonly support: number;
  /** Liquidity/sample quality, 0..1 (low = could be noise, not real incoherence). */
  readonly sampleQuality: number;
}

export type FantasyViolationSeverity = "none" | "low" | "medium" | "high";

export interface FantasyConservationViolation {
  readonly kind: FantasyIncoherenceKind;
  readonly residual: number; // max(0, claimedMove − support)
  readonly severity: FantasyViolationSeverity;
  readonly real: boolean;    // false when sample quality too low to trust
  readonly note: string;
}

/** Detect a single conservation violation: a claim/move unsupported by underlying role evidence. */
export function checkFantasyConservation(i: FantasyConservationInput): FantasyConservationViolation {
  const residual = Math.max(0, i.claimedMove - i.support);
  const real = i.sampleQuality >= 0.4;
  const severity: FantasyViolationSeverity = !real ? "none" : residual >= 0.5 ? "high" : residual >= 0.3 ? "medium" : residual >= 0.12 ? "low" : "none";
  return {
    kind: i.kind,
    residual: Number(residual.toFixed(4)),
    severity,
    real,
    note: !real
      ? "Sample/liquidity too thin to call this incoherent — flag as noise, not a violation."
      : severity === "none"
        ? "Move is supported by role/market evidence — coherent."
        : `${i.kind}: claimed move ${i.claimedMove.toFixed(2)} exceeds support ${i.support.toFixed(2)} (residual ${residual.toFixed(2)}) — ${severity} incoherence.`,
  };
}

/** Run a batch and return only the real, non-trivial violations, worst-first. */
export function findFantasyIncoherences(inputs: readonly FantasyConservationInput[]): FantasyConservationViolation[] {
  return inputs.map(checkFantasyConservation).filter((v) => v.real && v.severity !== "none").sort((a, b) => b.residual - a.residual);
}
