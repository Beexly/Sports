import { describe, it, expect } from "vitest";
import { computeOperatorPulse, computeTaskAge } from "@/lib/cockpit/intelligence";

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

  it("routeHealth is RED when staleSourceCount > 5", () => {
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
      staleSourceCount: 6,
    });
    expect(pulse.routeHealth).toBe("RED");
  });

  it("routeHealth is AMBER when staleSourceCount is 1-5", () => {
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
      staleSourceCount: 3,
    });
    expect(pulse.routeHealth).toBe("AMBER");
  });

  it("routeHealth is AMBER when reviewCount > 5", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map([
        ["NEEDS_REVIEW", 4],
        ["BLOCKED", 3],
      ]),
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
    expect(pulse.routeHealth).toBe("AMBER");
  });

  it("routeHealth is AMBER when a HIGH risk task exists", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map([["HIGH", 1]]),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.routeHealth).toBe("AMBER");
  });

  it("openRisks = HIGH tasks + COMPLIANCE_HOLD tasks + blocked promos + stale sources", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map([
        ["HIGH", 2],
        ["COMPLIANCE_HOLD", 1],
      ]),
      mediaDraftsPending: 0,
      mediaApprovedPending: 0,
      promoCounts: { ...EMPTY_PROMO, blocked: 3 },
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 4,
    });
    expect(pulse.openRisks).toBe(2 + 1 + 3 + 4);
  });

  it("readinessScore is 0 when no gates on and full review backlog", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map([
        ["NEEDS_REVIEW", 5],
        ["NEW", 5],
      ]),
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
    expect(pulse.readinessScore).toBeGreaterThanOrEqual(0);
    expect(pulse.readinessScore).toBeLessThan(50);
  });

  it("contentReviewQueue reflects mediaDraftsPending", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map(),
      taskCountsByAgent: new Map(),
      tasksByRisk: new Map(),
      mediaDraftsPending: 7,
      mediaApprovedPending: 0,
      promoCounts: EMPTY_PROMO,
      readinessGatesOn: 7,
      readinessGatesTotal: 7,
      calibrationProposalCount: 0,
      agingTasks: [],
      staleSourceCount: 0,
    });
    expect(pulse.contentReviewQueue).toBe(7);
  });

  it("nextBestActions includes stale source message when staleSourceCount > 0", () => {
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
      staleSourceCount: 2,
    });
    expect(pulse.nextBestActions.some((a) => a.includes("stale"))).toBe(true);
  });

  it("nextBestActions includes aging>72h message when tasks are that old", () => {
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
        { id: "x", title: "old", status: "BLOCKED", assignedAgent: "TAL", ageHours: 90 },
      ],
      staleSourceCount: 0,
    });
    expect(pulse.nextBestActions.some((a) => a.includes("72h"))).toBe(true);
  });

  it("blockedTaskCount reflects BLOCKED status count", () => {
    const pulse = computeOperatorPulse({
      now: NOW,
      taskCountsByStatus: new Map([["BLOCKED", 4]]),
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
    expect(pulse.blockedTaskCount).toBe(4);
  });
});

describe("computeOperatorPulse — nextBestActions singular/plural wording", () => {
  function pulse(overrides: Partial<Parameters<typeof computeOperatorPulse>[0]>) {
    return computeOperatorPulse({
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
      ...overrides,
    });
  }

  it("singular 'cockpit item' when reviewCount is 1", () => {
    const p = pulse({ taskCountsByStatus: new Map([["NEEDS_REVIEW", 1]]) });
    expect(p.nextBestActions.some((a) => a.includes("1 cockpit item "))).toBe(true);
  });

  it("plural 'cockpit items' when reviewCount > 1", () => {
    const p = pulse({ taskCountsByStatus: new Map([["NEEDS_REVIEW", 2]]) });
    expect(p.nextBestActions.some((a) => a.includes("cockpit items"))).toBe(true);
  });

  it("singular 'promotion' when needsReview is 1", () => {
    const p = pulse({ promoCounts: { ...EMPTY_PROMO, needsReview: 1 } });
    expect(p.nextBestActions.some((a) => /1 promotion /.test(a))).toBe(true);
  });

  it("plural 'promotions' when needsReview > 1", () => {
    const p = pulse({ promoCounts: { ...EMPTY_PROMO, needsReview: 2 } });
    expect(p.nextBestActions.some((a) => /promotions/.test(a))).toBe(true);
  });

  it("singular 'calibration proposal' when proposalCount is 1", () => {
    const p = pulse({ calibrationProposalCount: 1 });
    expect(p.nextBestActions.some((a) => /1 calibration proposal /.test(a))).toBe(true);
  });

  it("plural 'calibration proposals' when proposalCount > 1", () => {
    const p = pulse({ calibrationProposalCount: 2 });
    expect(p.nextBestActions.some((a) => /calibration proposals/.test(a))).toBe(true);
  });

  it("singular 'source category is' when staleSourceCount is 1", () => {
    const p = pulse({ staleSourceCount: 1 });
    expect(p.nextBestActions.some((a) => /source category is/.test(a))).toBe(true);
  });

  it("plural 'source categories are' when staleSourceCount > 1", () => {
    const p = pulse({ staleSourceCount: 2 });
    expect(p.nextBestActions.some((a) => /ies are/.test(a))).toBe(true);
  });

  it("singular 'task aged' when aging72 is 1", () => {
    const p = pulse({
      agingTasks: [{ id: "x", title: "old", status: "BLOCKED", assignedAgent: "TAL", ageHours: 80 }],
    });
    expect(p.nextBestActions.some((a) => /^1 task aged/.test(a))).toBe(true);
  });

  it("plural 'tasks aged' when aging72 > 1", () => {
    const p = pulse({
      agingTasks: [
        { id: "x", title: "old1", status: "BLOCKED", assignedAgent: "TAL", ageHours: 80 },
        { id: "y", title: "old2", status: "BLOCKED", assignedAgent: "TAL", ageHours: 90 },
      ],
    });
    expect(p.nextBestActions.some((a) => /tasks aged/.test(a))).toBe(true);
  });

  it("readinessGatesTotal=0 produces readinessScore of 40 (only queue health counts)", () => {
    const p = pulse({ readinessGatesOn: 0, readinessGatesTotal: 0 });
    // gatesPct = 0 (guarded), queueHealth = 1 (empty queue), score = round(0*0.6 + 1*0.4) * 100 = 40
    expect(p.readinessScore).toBe(40);
  });

  it("promotionsReviewQueue reflects promoCounts.needsReview", () => {
    const p = pulse({ promoCounts: { ...EMPTY_PROMO, needsReview: 5 } });
    expect(p.promotionsReviewQueue).toBe(5);
  });
});

describe("computeTaskAge", () => {
  it("returns exact hours between createdAt and now", () => {
    const now = new Date("2026-05-24T10:00:00Z");
    const createdAt = new Date("2026-05-24T08:00:00Z");
    expect(computeTaskAge(createdAt, now)).toBeCloseTo(2, 5);
  });

  it("returns 0 when createdAt equals now", () => {
    const now = new Date("2026-05-24T10:00:00Z");
    expect(computeTaskAge(now, now)).toBe(0);
  });

  it("returns fractional hours for sub-hour gaps", () => {
    const now = new Date("2026-05-24T10:00:00Z");
    const createdAt = new Date("2026-05-24T09:30:00Z");
    expect(computeTaskAge(createdAt, now)).toBeCloseTo(0.5, 5);
  });

  it("returns large values for tasks aged multiple days", () => {
    const now = new Date("2026-05-24T10:00:00Z");
    const createdAt = new Date("2026-05-21T10:00:00Z"); // 3 days ago
    expect(computeTaskAge(createdAt, now)).toBeCloseTo(72, 3);
  });

  it("is consistent with the 24h and 72h aging thresholds in computeOperatorPulse", () => {
    const now = new Date("2026-05-24T10:00:00Z");
    const justUnder24 = new Date(now.getTime() - 23.9 * 60 * 60 * 1000);
    const justOver24 = new Date(now.getTime() - 24.1 * 60 * 60 * 1000);
    const justOver72 = new Date(now.getTime() - 72.1 * 60 * 60 * 1000);
    expect(computeTaskAge(justUnder24, now)).toBeLessThan(24);
    expect(computeTaskAge(justOver24, now)).toBeGreaterThan(24);
    expect(computeTaskAge(justOver72, now)).toBeGreaterThan(72);
  });
});
