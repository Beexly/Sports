/**
 * FANTASY DISCOVERY LAYER — Fantasy Belief-State Transition (Invention F1, the core object).
 *
 * The unit of fantasy intelligence is not "pick" or "projected points" — it is a time-locked,
 * knowable, role-grounded BELIEF-STATE TRANSITION: what changed in football reality, who noticed
 * (props/platform/analyst/DFS/manager), who failed to notice, what roster decision became valuable,
 * and whether that value survived timing, cost, knowability, and ghost-memory. It assembles role
 * truth + every market belief + the light-cone verdict + a ghost check into one conservative
 * disposition. Nothing here flips a live gate or makes a public claim. Pure + deterministic.
 */

import type { FantasyPosition } from "./fantasy-role-state-vector.js";
import type { FantasyFormat } from "./fantasy-format-relativity.js";
import type { FantasyLightConeStatus } from "./fantasy-light-cone.js";

/** The umbrella action vocabulary (the Fantasy Action Router). Product modules narrow this. */
export type FantasyAction =
  | "START" | "SIT" | "ADD" | "HOLD" | "DROP" | "TRADE_FOR" | "TRADE_AWAY"
  | "DFS_OVERWEIGHT" | "DFS_FADE" | "BEST_BALL_TARGET" | "DYNASTY_BUY" | "WATCHLIST" | "PASS";

export type FantasyActionStatus =
  | "REJECTED"            // not knowable / contaminated — fails closed
  | "DATA_QUALITY_FAIL"
  | "POST_LOCK_ONLY"     // knowable but only after the lock — do not credit
  | "NEEDS_RIGHTS_REVIEW"
  | "WATCHLIST"          // knowable but no actionable gap (or ghost-suppressed)
  | "ACTIONABLE_SHADOW"; // knowable, pre-lock, real gap — shadow-track only

export type FantasyDirection = "underpriced" | "overpriced" | "fair";

export interface FantasyBeliefStateInput {
  readonly id: string;
  readonly player: string;
  readonly position: FantasyPosition;
  readonly format: FantasyFormat;
  readonly decisionTime: string;
  /** 0..1 role-implied value (the truth signal, e.g. from the role state vector). */
  readonly roleImpliedValue: number;
  readonly teamContextNote: string;
  // Market beliefs, each 0..1 implied value by surface.
  readonly platformProjectionBelief: number;
  readonly analystRankBelief: number;
  readonly dfsSalaryBelief: number;
  readonly dfsOwnershipBelief: number;
  readonly managerCrowdBelief: number;
  /** External truth signal (sportsbook prop-implied), if available. */
  readonly sportsbookImpliedBelief?: number;
  // Movement.
  readonly expectedMovement: number;
  readonly observedMovement: number;
  readonly absorptionLagMinutes: number;
  // Action + governance.
  readonly proposedAction: FantasyAction;
  readonly lightCone: FantasyLightConeStatus;
  readonly dataQualityStatus: "ok" | "warn" | "fail";
  readonly rightsStatus: "cleared" | "needs_review" | "blocked";
  readonly ghostSuppressed: boolean;
  readonly provenance: { readonly discoveredBy: string; readonly reportPath?: string };
}

export interface FantasyBeliefStateTransition extends FantasyBeliefStateInput {
  readonly marketBelief: number;
  readonly valueGap: number;        // roleImpliedValue − marketBelief
  readonly direction: FantasyDirection;
  readonly status: FantasyActionStatus;
  readonly actionableAction: FantasyAction;
  readonly reasons: readonly string[];
}

/** Assemble a fantasy belief-state transition and compute a conservative, fail-closed disposition. */
export function assembleFantasyTransition(input: FantasyBeliefStateInput, opts: { actionableThreshold?: number } = {}): FantasyBeliefStateTransition {
  const threshold = opts.actionableThreshold ?? 0.12;
  const surfaces = [input.platformProjectionBelief, input.analystRankBelief, input.dfsSalaryBelief, input.dfsOwnershipBelief, input.managerCrowdBelief];
  const marketBelief = surfaces.reduce((a, b) => a + b, 0) / surfaces.length;
  const valueGap = Number((input.roleImpliedValue - marketBelief).toFixed(4));
  const direction: FantasyDirection = valueGap >= threshold ? "underpriced" : valueGap <= -threshold ? "overpriced" : "fair";

  const reasons: string[] = [];
  let status: FantasyActionStatus;
  if (input.dataQualityStatus === "fail") {
    status = "DATA_QUALITY_FAIL";
    reasons.push("Data-quality failure — fix and re-run before any read.");
  } else if (input.lightCone === "CONTAMINATED" || input.lightCone === "OUTSIDE_LIGHT_CONE" || input.lightCone === "SOURCE_UNCLEAR") {
    status = "REJECTED";
    reasons.push(`Not certifiably knowable at decision time (light cone: ${input.lightCone}) — fails closed.`);
  } else if (input.lightCone === "POST_LOCK_ONLY") {
    status = "POST_LOCK_ONLY";
    reasons.push("Knowable only after the lock — not actionable; do not credit the decision.");
  } else if (input.rightsStatus === "blocked") {
    status = "NEEDS_RIGHTS_REVIEW";
    reasons.push("Source rights blocked — cannot use the data.");
  } else if (input.ghostSuppressed) {
    status = "WATCHLIST";
    reasons.push("Resembles a buried fantasy ghost — capped at WATCHLIST until new evidence defeats the trap.");
  } else if (Math.abs(valueGap) < threshold) {
    status = "WATCHLIST";
    reasons.push(`Role and market roughly agree (gap ${valueGap}) — no actionable edge.`);
  } else {
    status = "ACTIONABLE_SHADOW";
    reasons.push(`Knowable, pre-lock, ${direction} by ${Math.abs(valueGap)} with ~${Math.round(input.absorptionLagMinutes)}m absorption lag — shadow-track only.`);
  }

  const actionableAction: FantasyAction = status === "ACTIONABLE_SHADOW" ? input.proposedAction : status === "WATCHLIST" ? "WATCHLIST" : "PASS";
  return { ...input, marketBelief: Number(marketBelief.toFixed(4)), valueGap, direction, status, actionableAction, reasons };
}
