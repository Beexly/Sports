import { describe, it, expect } from "vitest";
import { computeOperatorPulse } from "@/lib/cockpit/intelligence";

const NOW = new Date("2026-05-18T12:00:00Z");

const EMPTY_PROMO = {
  active: 0,
  needsReview: 0,
  blocked: 0,
  expired: 0,
  total: 0,
};

describe("computeOperatorPulse", () => {
  it("readinessScore is 100 when all gates on and no review backlog", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map(),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.readinessScore).toBe(100);
    expect(pulse.routeHealth).toBe("GREEN");
  });

  it("routeHealth is RED when a COMPLIANCE_HOLD task exists", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map([["COMPLIANCE_HOLD", 1]]),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 0,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.routeHealth).toBe("RED");
  });

  it("routeHealth is RED when a BLOCKED promotion exists", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map(),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: { ...EMPTY_PROMO, blocked: 1 },
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.routeHealth).toBe("RED");
  });

  it("aging task counts split at 24h and 72h boundaries", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map(),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [
        { id: "1", title: "fresh", status: "NEW", assignedAgent: "TAL", ageHours: 1 },
        {
          id: "2",
          title: "1-day",
          status: "NEEDS_REVIEW",
          assignedAgent: "TAL",
          ageHours: 30,
        },
        {
          id: "3",
          title: "old",
          status: "BLOCKED",
          assignedAgent: "TAL",
          ageHours: 100,
        },
      ],
      staleSourceCount: 0,
    });
    expect(pulse.tasksAging24h).toBe(1);
    expect(pulse.tasksAging72h).toBe(1);
  });

  it("nextBestActions always non-empty", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map(),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 0,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.nextBestActions.length).toBeGreaterThan(0);
  });

  it("calibration alerts surface in pulse", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map(),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 3,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.calibrationAlerts).toBe(3);
    expect(pulse.nextBestActions.some((a) => a.includes("calibration"))).toBe(
      true
    );
  });
});
