import { describe, it, expect } from "vitest";
import {
  DECISION_ACTIONS,
  actionRequiresNote,
  buildDecisionActions,
  isDecisionAction,
  targetStatusFor,
} from "../decision-mapping";
import { isAllowedTransition } from "@/lib/cockpit/transitions";

describe("decision action → transition mapping", () => {
  it("maps the four owner actions to their target statuses", () => {
    expect(targetStatusFor("APPROVE")).toBe("APPROVED");
    expect(targetStatusFor("EDIT")).toBe("DRAFTED");
    expect(targetStatusFor("REJECT")).toBe("REJECTED");
    expect(targetStatusFor("ESCALATE")).toBe("BLOCKED");
  });

  it("requires a note for REJECT and ESCALATE only", () => {
    expect(actionRequiresNote("REJECT")).toBe(true);
    expect(actionRequiresNote("ESCALATE")).toBe(true);
    expect(actionRequiresNote("APPROVE")).toBe(false);
    expect(actionRequiresNote("EDIT")).toBe(false);
  });

  it("APPROVE→APPROVED is legal only from NEEDS_REVIEW", () => {
    expect(isAllowedTransition("NEEDS_REVIEW", targetStatusFor("APPROVE"))).toBe(true);
    expect(isAllowedTransition("DRAFTED", targetStatusFor("APPROVE"))).toBe(false);
    expect(isAllowedTransition("NEW", targetStatusFor("APPROVE"))).toBe(false);
    expect(isAllowedTransition("ROUTED", targetStatusFor("APPROVE"))).toBe(false);
  });

  it("validates the action discriminator", () => {
    expect(isDecisionAction("APPROVE")).toBe(true);
    expect(isDecisionAction("approve")).toBe(false);
    expect(isDecisionAction("ARCHIVE")).toBe(false);
    expect(isDecisionAction(42)).toBe(false);
  });

  describe("buildDecisionActions — buttons gated by the allow-list", () => {
    it("enables only Edit/Reject/Approve from NEEDS_REVIEW (Approve reachable here)", () => {
      const actions = buildDecisionActions("NEEDS_REVIEW");
      const enabled = new Set(actions.filter((a) => a.enabled).map((a) => a.action));
      expect(enabled.has("APPROVE")).toBe(true);
      expect(enabled.has("EDIT")).toBe(true);
      expect(enabled.has("REJECT")).toBe(true);
      // ESCALATE→BLOCKED is also legal from NEEDS_REVIEW.
      expect(enabled.has("ESCALATE")).toBe(true);
    });

    it("never enables Approve from a non-review status", () => {
      for (const status of ["NEW", "ROUTED", "DRAFTED", "BLOCKED"] as const) {
        const approve = buildDecisionActions(status).find((a) => a.action === "APPROVE");
        expect(approve?.enabled).toBe(false);
      }
    });

    it("always returns all four actions regardless of status", () => {
      const actions = buildDecisionActions("ARCHIVED");
      expect(actions.map((a) => a.action).sort()).toEqual([...DECISION_ACTIONS].sort());
      // ARCHIVED is terminal — nothing is enabled.
      expect(actions.every((a) => !a.enabled)).toBe(true);
    });
  });
});
