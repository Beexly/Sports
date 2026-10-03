import { describe, it, expect } from "vitest";
import {
  isAllowedTransition,
  allowedTransitionsFrom,
  CockpitTransitionRefused,
} from "@/lib/cockpit/transitions";
import type { CockpitTaskStatus } from "@prisma/client";

const ALL_STATUSES: readonly CockpitTaskStatus[] = [
  "NEW",
  "ROUTED",
  "DRAFTED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
  "BLOCKED",
  "ARCHIVED",
];

describe("Cockpit status transitions — allow-list", () => {
  it("refuses no-op transitions (same status to same status)", () => {
    for (const s of ALL_STATUSES) {
      expect(isAllowedTransition(s, s)).toBe(false);
    }
  });

  it("permits the documented forward path: NEW -> ROUTED -> DRAFTED -> NEEDS_REVIEW -> APPROVED -> ARCHIVED", () => {
    expect(isAllowedTransition("NEW", "ROUTED")).toBe(true);
    expect(isAllowedTransition("ROUTED", "DRAFTED")).toBe(true);
    expect(isAllowedTransition("DRAFTED", "NEEDS_REVIEW")).toBe(true);
    expect(isAllowedTransition("NEEDS_REVIEW", "APPROVED")).toBe(true);
    expect(isAllowedTransition("APPROVED", "ARCHIVED")).toBe(true);
  });

  it("permits rejection and re-routing from NEEDS_REVIEW", () => {
    expect(isAllowedTransition("NEEDS_REVIEW", "REJECTED")).toBe(true);
    expect(isAllowedTransition("NEEDS_REVIEW", "DRAFTED")).toBe(true);
  });

  it("permits BLOCKED from any pre-terminal state", () => {
    expect(isAllowedTransition("NEW", "BLOCKED")).toBe(true);
    expect(isAllowedTransition("ROUTED", "BLOCKED")).toBe(true);
    expect(isAllowedTransition("DRAFTED", "BLOCKED")).toBe(true);
    expect(isAllowedTransition("NEEDS_REVIEW", "BLOCKED")).toBe(true);
  });

  it("refuses backward and skip transitions that bypass the queue", () => {
    // Skipping the queue — strictly refused
    expect(isAllowedTransition("NEW", "APPROVED")).toBe(false);
    expect(isAllowedTransition("NEW", "DRAFTED")).toBe(false);
    expect(isAllowedTransition("NEW", "NEEDS_REVIEW")).toBe(false);
    expect(isAllowedTransition("ROUTED", "APPROVED")).toBe(false);
    expect(isAllowedTransition("ROUTED", "NEEDS_REVIEW")).toBe(false);
    expect(isAllowedTransition("DRAFTED", "APPROVED")).toBe(false);

    // Reanimating archived items — refused
    expect(isAllowedTransition("ARCHIVED", "NEW")).toBe(false);
    expect(isAllowedTransition("ARCHIVED", "ROUTED")).toBe(false);

    // Approved cannot go back to needs-review
    expect(isAllowedTransition("APPROVED", "NEEDS_REVIEW")).toBe(false);
  });

  it("treats ARCHIVED as terminal (no outgoing transitions)", () => {
    expect(allowedTransitionsFrom("ARCHIVED")).toEqual([]);
  });

  it("CockpitTransitionRefused carries from/to/taskId and a useful message", () => {
    const err = new CockpitTransitionRefused("task_x", "NEW", "APPROVED");
    expect(err.taskId).toBe("task_x");
    expect(err.from).toBe("NEW");
    expect(err.to).toBe("APPROVED");
    expect(err.message).toContain("task_x");
    expect(err.message).toContain("NEW");
    expect(err.message).toContain("APPROVED");
    expect(err.message).toContain("Allowed targets");
  });

  it("every status has a deterministic, finite outgoing edge set (allow-list integrity)", () => {
    for (const s of ALL_STATUSES) {
      const out = allowedTransitionsFrom(s);
      expect(Array.isArray(out)).toBe(true);
      // No self-loop, no duplicates
      expect(out).not.toContain(s);
      const unique = new Set(out);
      expect(unique.size).toBe(out.length);
    }
  });
});
