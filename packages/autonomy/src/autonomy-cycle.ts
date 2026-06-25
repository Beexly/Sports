/**
 * AUTONOMY — the bounded operating cycle.
 *
 * runAutonomousCycle reads the regime and the readiness gates and PROPOSES the organism's next move —
 * never executes it. It generalizes the discovery-engine's propose-only literal trick (every action is
 * `status:"PROPOSED"`, an executed publish/spend/roster/gate-flip is un-constructible here) and folds in
 * real gates: it won't even PROPOSE publishing unless `canPublishContent` is on, any spend is an
 * owner-gated proposal carrying a cost preview (never a purchase), and a clearance-denied extraction is
 * recorded as BLOCKED, not proposed. Reuses @sports/decision-field-runtime's charter. Pure.
 */

import type { RegimeVerdict } from "@sports/engine";
import type { ReadinessGates } from "@sports/prediction-engine";
import {
  type AutonomousAction,
  proposeAction,
} from "@sports/decision-field-runtime";

export interface AutonomyCycleInput {
  readonly frameId: string;
  readonly regime: RegimeVerdict;
  readonly gates: ReadinessGates;
  /** Required-fact groups the frame was missing (the OVI demand side). */
  readonly missedFactGroups: readonly string[];
  readonly emittedCards: number;
  readonly suppressedCards: number;
  readonly settledOutcomes?: number;
  /** A source whose extraction clearance was DENIED — recorded as blocked, not proposed. */
  readonly blockedExtractionSourceId?: string;
}

export interface AutonomyCyclePlan {
  readonly frameId: string;
  readonly proposedActions: readonly AutonomousAction[];
  readonly ownerApprovalsNeeded: readonly AutonomousAction[];
  readonly blockedActions: readonly AutonomousAction[];
  readonly regimeNote: string;
  readonly nextCadenceMinutes: number;
  readonly note: string;
}

export function runAutonomousCycle(input: AutonomyCycleInput): AutonomyCyclePlan {
  const { frameId, regime, gates } = input;
  const proposed: AutonomousAction[] = [
    proposeAction(`obs:${frameId}`, "OBSERVE", "Re-observe the field next cycle", "Field is live; keep watching.", true),
    proposeAction(`ing:${frameId}`, "INGEST_FREE", "Pull free role + crowd data (nflverse/Sleeper)", "Strengthen the read with rights-clear sources.", true),
    proposeAction(`cls:${frameId}`, "CLASSIFY", "Classify changes + conflicts", "Turn raw facts into decision state.", true),
  ];

  if ((input.settledOutcomes ?? 0) > 0) {
    proposed.push(proposeAction(`aut:${frameId}`, "RUN_AUTOPSY", "Grade settled cards (process over outcome)", "Close the loop; a single week never moves a weight.", true));
  }

  // Regime: shock observes MORE (an extra dense ingest) — it never acts more (that's the runtime's gate).
  if (regime.suppressAction) {
    proposed.push(proposeAction(`ing2:${frameId}`, "INGEST_FREE", "Dense re-observation (shock mode)", "Suppressing regime — observe densely, do not escalate action.", true));
  }
  const regimeNote = regime.suppressAction
    ? `${regime.regime}: observe densely; action suppressed.`
    : `${regime.regime}: observe + act within proof.`;

  // OVI demand side — a missing required fact justifies EVALUATING (review) and, separately, an
  // owner-gated SPEND proposal that always carries a cost preview and never a purchase.
  if (input.missedFactGroups.length > 0) {
    const group = input.missedFactGroups[0]!;
    proposed.push(proposeAction(`paid:${frameId}`, "PROPOSE_PAID_SOURCE", `Evaluate a licensed source for "${group}"`, "OVI-ranked; would unlock a stronger card.", true, "--plan: preview credit cost first"));
    proposed.push(proposeAction(`spend:${frameId}`, "SPEND", `Acquire a licensed feed for "${group}" (owner approval)`, "Only if the owner approves after the cost preview.", true, "--plan: bounded monthly credit cost, owner-gated"));
  }

  // Publish only if the gate is open — and even then it is an owner-gated PROPOSAL, never executed.
  if (gates.canPublishContent && input.emittedCards > 0) {
    proposed.push(proposeAction(`pub:${frameId}`, "PUBLISH_CARD", "Publish today's cards (owner approval)", "Gate is open; still owner-gated.", false));
  }

  const blockedActions: AutonomousAction[] = [];
  if (input.blockedExtractionSourceId) {
    blockedActions.push(proposeAction(`blk:${frameId}`, "INGEST_FREE", `Extraction from ${input.blockedExtractionSourceId} (BLOCKED)`, "Clearance denied — recorded, not run.", true));
  }

  const ownerApprovalsNeeded = proposed.filter((a) => a.authority === "OWNER_GATE");
  const nextCadenceMinutes = regime.suppressAction ? 5 : 240;

  return {
    frameId,
    proposedActions: proposed,
    ownerApprovalsNeeded,
    blockedActions,
    regimeNote,
    nextCadenceMinutes,
    note: `${proposed.length} proposed (${ownerApprovalsNeeded.length} owner-gated), ${blockedActions.length} blocked. Nothing executed.`,
  };
}
