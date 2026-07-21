import { describe, expect, it } from "vitest";

import {
  FOUNDER_OPERATING_POLICY,
  buildFounderDailyBrief,
  buildFounderQueue,
  buildNightlyAutopsy,
  validateFounderWorkItem,
  type FounderWorkItem,
} from "@/lib/opportunity-engine/founder-command";

function work(overrides: Partial<FounderWorkItem> = {}): FounderWorkItem {
  return {
    id: "work-1",
    title: "Activate one verified revenue path",
    project: "GSE",
    lane: "FIRST_CASH",
    state: "READY",
    authority: "AGENT_THEN_OWNER",
    what: "Prepare a bounded customer-ready offer and activation packet.",
    why: "Verified customer and payment evidence is the shortest path to economic truth.",
    when: "Before expanding speculative product scope.",
    how: ["Confirm the offer", "Prepare evidence", "Route owner-only actions"],
    acceptanceCriteria: ["Offer is customer-presentable", "Payment path has an owner decision"],
    evidenceRequired: ["Rendered offer", "Activation checklist"],
    agentCanDo: ["Draft and test internal artifacts"],
    ownerOnly: ["Approve pricing", "Send external communication"],
    urgency: 5,
    revenueImpact: 5,
    cashAvoidance: 2,
    strategicLeverage: 4,
    founderMinutes: 20,
    estimatedEngineeringHours: 2,
    externalActionsAllowed: false,
    ...overrides,
  };
}

describe("NOVA founder command", () => {
  it("pins human authority, zero-cash defaults, three memory layers, and bounded WIP", () => {
    expect(FOUNDER_OPERATING_POLICY).toMatchObject({
      canonicalProduct: "GSE",
      canonicalCompany: "GSN",
      humanInCommand: true,
      zeroCashDefault: true,
      maxRevenueImplementations: 1,
      maxExperiments: 2,
      maxUrgentRiskResponses: 1,
      maxDailyBriefItems: 5,
      memoryLayers: ["CANONICAL", "ACTIVE", "OUTCOMES"],
      nightlyAutopsyRequired: true,
      externalActionsAllowed: false,
    });
  });

  it("requires complete what, why, when, how, proof, and authority metadata", () => {
    expect(validateFounderWorkItem(work())).toEqual([]);
    const invalid = work({
      id: "",
      what: "",
      why: "",
      when: "",
      how: [],
      acceptanceCriteria: [],
      evidenceRequired: [],
      agentCanDo: [],
      ownerOnly: [],
    });
    expect(validateFounderWorkItem(invalid).length).toBeGreaterThanOrEqual(6);
  });

  it("caps one revenue implementation, two experiments, and one urgent risk response", () => {
    const queue = buildFounderQueue([
      work({ id: "revenue-a" }),
      work({ id: "revenue-b", title: "Second revenue implementation" }),
      work({ id: "experiment-a", lane: "COMPOUNDING_ASSET", revenueImpact: 1 }),
      work({ id: "experiment-b", lane: "FRONTIER_OPTION", revenueImpact: 1 }),
      work({ id: "experiment-c", lane: "FRONTIER_OPTION", revenueImpact: 1 }),
      work({ id: "risk-a", lane: "SECURITY_CONTINUITY", urgency: 5 }),
      work({ id: "risk-b", lane: "SECURITY_CONTINUITY", urgency: 4 }),
    ]);

    expect(queue.filter((entry) => entry.item.lane === "FIRST_CASH")).toHaveLength(1);
    expect(
      queue.filter(
        (entry) => entry.item.lane === "COMPOUNDING_ASSET" || entry.item.lane === "FRONTIER_OPTION",
      ),
    ).toHaveLength(2);
    expect(
      queue.filter((entry) => entry.item.lane === "SECURITY_CONTINUITY" && entry.item.urgency >= 4),
    ).toHaveLength(1);
  });

  it("keeps the daily decision surface to five items and preserves cash plus continuity lanes", () => {
    const brief = buildFounderDailyBrief(
      [
        work({ id: "cash" }),
        work({ id: "continuity", lane: "SECURITY_CONTINUITY", urgency: 5 }),
        work({ id: "launch", lane: "LAUNCH_BLOCKER" }),
        work({ id: "cost", lane: "COST_AVOIDANCE" }),
        work({ id: "asset", lane: "COMPOUNDING_ASSET" }),
        work({ id: "frontier", lane: "FRONTIER_OPTION" }),
      ],
      new Date("2026-07-21T12:00:00.000Z"),
    );

    expect(brief.decisions.length).toBeLessThanOrEqual(5);
    expect(brief.hasFirstCashLane).toBe(true);
    expect(brief.hasContinuityLane).toBe(true);
    expect(brief.externalActionsAllowed).toBe(false);
  });

  it("converts weak execution, excess owner attention, and poor model economics into corrections", () => {
    const autopsy = buildNightlyAutopsy({
      date: "2026-07-21",
      planned: ["A", "B", "C", "D"],
      completed: ["A"],
      blocked: ["Payment approval"],
      evidenceCreated: ["Focused test receipt"],
      revenueCreatedUsd: 0,
      cashAvoidedUsd: 0,
      ownerMinutesUsed: 120,
      modelSpendUsd: 25,
    });

    expect(autopsy.planCompletionRate).toBe(0.25);
    expect(autopsy.lessons.length).toBeGreaterThanOrEqual(4);
    expect(autopsy.activeMemoryCandidates.some((entry) => entry.startsWith("BLOCKER:"))).toBe(true);
    expect(autopsy.outcomeRecords).toContain("EVIDENCE: Focused test receipt");
    expect(autopsy.nextDayCorrections.length).toBeGreaterThanOrEqual(4);
  });
});
