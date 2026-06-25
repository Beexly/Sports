/**
 * AUTONOMY — acceptance K–P.
 *
 * The nervous system proposes the next move but can never execute an irreversible/outward/spend action.
 * Calm and shock both keep publish/spend/roster gated; publish isn't even proposed unless the gate is
 * open; any spend carries a cost preview; a clearance-denied extraction is BLOCKED, not proposed; and a
 * forged "executed" action is rejected. The charter can't drift out of conformance with the audit.
 */

import { describe, it, expect } from "vitest";
import { getReadinessGates } from "@sports/prediction-engine";
import type { RegimeVerdict } from "@sports/engine";
import {
  runAutonomousCycle,
  checkCharterConformance,
  assertBoundedAutonomy,
  type AutonomousAction,
  type OperatingPlan,
} from "../index.js";

const CALM: RegimeVerdict = { regime: "CalmConsensus", confidence: 0.8, rationale: "quiet", suppressAction: false };
const SHOCK: RegimeVerdict = { regime: "LiquidityTrap", confidence: 0.7, rationale: "thin+moving+uncertain", suppressAction: true };
const GATES_NO_PUBLISH = getReadinessGates(); // default: canPublishContent === false
const GATES_PUBLISH = { ...getReadinessGates(), canPublishContent: true };

const base = { frameId: "f", missedFactGroups: [] as string[], emittedCards: 1, suppressedCards: 0 };

describe("Autonomy — bounded operating cycle (K–P)", () => {
  it("(K) a calm cycle proposes only safe actions, all PROPOSED, none forbidden", () => {
    const plan = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_NO_PUBLISH });
    for (const a of plan.proposedActions) expect(a.status).toBe("PROPOSED");
    const forbidden = plan.proposedActions.filter((a) => ["ROSTER_WRITE", "FLIP_GATE"].includes(a.type));
    expect(forbidden).toHaveLength(0);
    expect(() => assertBoundedAutonomy(plan as unknown as OperatingPlan)).not.toThrow();
  });

  it("(L) a shock cycle proposes MORE observation but still gates publish/spend/roster", () => {
    const calm = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_NO_PUBLISH });
    const shock = runAutonomousCycle({ ...base, regime: SHOCK, gates: GATES_NO_PUBLISH });
    expect(shock.proposedActions.length).toBeGreaterThan(calm.proposedActions.length);
    expect(shock.nextCadenceMinutes).toBeLessThan(calm.nextCadenceMinutes);
    // No SELF publish/spend in either.
    const selfOutward = shock.proposedActions.filter((a) => ["PUBLISH_CARD", "SPEND"].includes(a.type) && a.authority === "SELF");
    expect(selfOutward).toHaveLength(0);
  });

  it("(M) PUBLISH is not even proposed unless the gate is open; when open it is owner-gated", () => {
    const off = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_NO_PUBLISH });
    expect(off.proposedActions.some((a) => a.type === "PUBLISH_CARD")).toBe(false);

    const on = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_PUBLISH });
    const pub = on.proposedActions.find((a) => a.type === "PUBLISH_CARD");
    expect(pub).toBeDefined();
    expect(pub!.authority).toBe("OWNER_GATE");
    expect(on.ownerApprovalsNeeded.some((a) => a.type === "PUBLISH_CARD")).toBe(true);
  });

  it("(N) any SPEND proposal is owner-gated and carries a cost preview", () => {
    const plan = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_NO_PUBLISH, missedFactGroups: ["fantasy_belief_snapshot"] });
    const spend = plan.proposedActions.find((a) => a.type === "SPEND");
    expect(spend).toBeDefined();
    expect(spend!.authority).toBe("OWNER_GATE");
    expect(spend!.costPreview).toBeTruthy();
  });

  it("(O) a clearance-denied extraction is BLOCKED, not proposed", () => {
    const plan = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_NO_PUBLISH, blockedExtractionSourceId: "draftkings_unofficial" });
    expect(plan.blockedActions.length).toBeGreaterThanOrEqual(1);
    const blockedIds = new Set(plan.blockedActions.map((a) => a.id));
    expect(plan.proposedActions.some((a) => blockedIds.has(a.id))).toBe(false);
  });

  it("(P) the charter conforms to the audit, and a forged executed action is rejected", () => {
    expect(checkCharterConformance().ok).toBe(true);
    const plan = runAutonomousCycle({ ...base, regime: CALM, gates: GATES_NO_PUBLISH });
    const forged = { ...plan.proposedActions[0]!, status: "EXECUTED" } as unknown as AutonomousAction;
    const bad: OperatingPlan = { frameId: "x", proposedActions: [forged], ownerApprovalsNeeded: [], note: "" };
    expect(() => assertBoundedAutonomy(bad)).toThrow(/PROPOSED/);
  });
});
