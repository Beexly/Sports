/**
 * Targeted coverage for cockpit/intelligence branches not reached by
 * cockpit-intelligence.test.ts.
 *
 * The primary test covers: readinessScore=100 (all gates on), RED via
 * COMPLIANCE_HOLD, RED via blocked promo, aging 24h/72h split, nextBestActions
 * always non-empty, calibration alerts.
 *
 * This file covers: AMBER routeHealth (HIGH-risk task, reviewCount > 5,
 * staleSourceCount > 0), RED via staleSourceCount > 5, nextBestActions
 * for promoCounts.needsReview / staleSourceCount / promoCounts.expired /
 * aging72 actions, computeTaskAge helper.
 */

import { describe, it, expect } from "vitest";
import {
  computeOperatorPulse,
  computeTaskAge,
} from "@/lib/cockpit/intelligence";

const NOW = new Date("2026-05-18T12:00:00Z");

const EMPTY_PROMO = {
  active: 0,
  needsReview: 0,
  blocked: 0,
  expired: 0,
  total: 0,
};

function baseInput() {
  return {
    now: NOW,
    taskCountsByStatus: new Map<string, number>(),
    taskCountsByAgent: new Map<string, number>(),
    tasksByRisk: new Map<string, number>(),
    mediaDraftsPending: 0,
    mediaApprovedPending: 0,
    promoCounts: { ...EMPTY_PROMO },
    readinessGatesOn: 7,
    readinessGatesTotal: 7,
    calibrationProposalCount: 0,
    agingTasks: [] as Array<{ id: string; title: string; status: string; assignedAgent: string; ageHours: number }>,
    staleSourceCount: 0,
  };
}

// ============================================================
// routeHealth — AMBER branches
// ============================================================

describe("computeOperatorPulse — routeHealth AMBER via HIGH-risk task", () => {
  it("routeHealth is AMBER when a HIGH-risk task exists (no RED conditions)", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      tasksByRisk: new Map([["HIGH", 1]]),
    });
    expect(pulse.routeHealth).toBe("AMBER");
  });
});

describe("computeOperatorPulse — routeHealth AMBER via reviewCount > 5", () => {
  it("routeHealth is AMBER when reviewCount > 5 (NEEDS_REVIEW + BLOCKED > 5)", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      taskCountsByStatus: new Map([
        ["NEEDS_REVIEW", 4],
        ["BLOCKED", 2], // total = 6 > 5
      ]),
    });
    expect(pulse.routeHealth).toBe("AMBER");
  });
});

describe("computeOperatorPulse — routeHealth AMBER via staleSourceCount", () => {
  it("routeHealth is AMBER when staleSourceCount is between 1 and 5 inclusive", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      staleSourceCount: 3,
    });
    expect(pulse.routeHealth).toBe("AMBER");
  });
});

describe("computeOperatorPulse — routeHealth RED via staleSourceCount > 5", () => {
  it("routeHealth is RED when staleSourceCount exceeds 5", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      staleSourceCount: 6,
    });
    expect(pulse.routeHealth).toBe("RED");
  });
});

// ============================================================
// nextBestActions — individual action branches
// ============================================================

describe("computeOperatorPulse — nextBestActions for promoCounts.needsReview", () => {
  it("includes promo review action when needsReview > 0", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      promoCounts: { ...EMPTY_PROMO, needsReview: 2 },
    });
    expect(pulse.nextBestActions.some((a) => a.includes("promotion"))).toBe(true);
  });

  it("uses singular 'promotion' when needsReview === 1", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      promoCounts: { ...EMPTY_PROMO, needsReview: 1 },
    });
    const action = pulse.nextBestActions.find((a) => a.includes("promotion"));
    expect(action).toContain("1 promotion");
  });
});

describe("computeOperatorPulse — nextBestActions for staleSourceCount", () => {
  it("includes re-run ingestion action when staleSourceCount > 0", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      staleSourceCount: 2,
    });
    expect(pulse.nextBestActions.some((a) => a.includes("stale") || a.includes("ingestion"))).toBe(true);
  });

  it("uses singular 'category is' when staleSourceCount === 1", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      staleSourceCount: 1,
    });
    const action = pulse.nextBestActions.find((a) => a.includes("source"));
    expect(action).toContain("is stale");
  });

  it("uses plural 'ies are' when staleSourceCount > 1", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      staleSourceCount: 3,
    });
    const action = pulse.nextBestActions.find((a) => a.includes("source"));
    expect(action).toContain("ies are");
  });
});

describe("computeOperatorPulse — nextBestActions for promoCounts.expired", () => {
  it("includes archive action when promoCounts.expired > 0", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      promoCounts: { ...EMPTY_PROMO, expired: 3 },
    });
    expect(pulse.nextBestActions.some((a) => a.includes("expired") || a.includes("Archive"))).toBe(true);
  });
});

describe("computeOperatorPulse — nextBestActions for aging72", () => {
  it("includes re-route action when a task is aged >72h", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      agingTasks: [{ id: "t1", title: "old task", status: "NEW", assignedAgent: "AVA", ageHours: 80 }],
    });
    expect(pulse.nextBestActions.some((a) => a.includes("72h"))).toBe(true);
  });

  it("uses singular 'task' when aging72 === 1", () => {
    const pulse = computeOperatorPulse({
      ...baseInput(),
      agingTasks: [{ id: "t1", title: "old task", status: "NEW", assignedAgent: "AVA", ageHours: 75 }],
    });
    const action = pulse.nextBestActions.find((a) => a.includes("72h"));
    expect(action).toContain("1 task");
  });
});

// ============================================================
// computeTaskAge
// ============================================================

describe("computeTaskAge", () => {
  it("returns 0 when createdAt equals now", () => {
    expect(computeTaskAge(NOW, NOW)).toBe(0);
  });

  it("returns 24 for a task created exactly 24 hours ago", () => {
    const createdAt = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(computeTaskAge(createdAt, NOW)).toBe(24);
  });

  it("returns 72 for a task created exactly 72 hours ago", () => {
    const createdAt = new Date(NOW.getTime() - 72 * 60 * 60 * 1000);
    expect(computeTaskAge(createdAt, NOW)).toBe(72);
  });

  it("returns fractional hours for partial durations", () => {
    const createdAt = new Date(NOW.getTime() - 90 * 60 * 1000); // 90 minutes
    expect(computeTaskAge(createdAt, NOW)).toBeCloseTo(1.5, 1);
  });
});
