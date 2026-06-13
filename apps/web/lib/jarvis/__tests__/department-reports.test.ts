import { describe, it, expect } from "vitest";
import {
  buildDepartmentReport,
  buildAllDepartmentReports,
  buildIntelligenceBriefing,
  generateMorningBriefing,
} from "../department-reports";
import type { OwnerSummary } from "../../cockpit/owner-summary";
import type { JarvisIntelligenceState } from "../intelligence-state";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeOwnerSummary(overrides: Partial<OwnerSummary> = {}): OwnerSummary {
  return {
    overallColor: "GREEN",
    oneLiner: "Platform is GREEN and operating normally.",
    picks: {
      today: 3,
      isPublicGateOpen: true,
      publicReadyCount: 3,
      blockedReason: null,
      canonicalPending: 1,
      canonicalSettled: 10,
      bootstrapExcluded: 2,
      totalInSystem: 13,
      publicReadinessExplanation: "3 picks published today.",
    },
    performance: {
      targetPct: 70,
      actualWinRate: null,
      canonicalSampleSize: 10,
      minimumRequired: 100,
      remainingToThreshold: 90,
      isGateOpen: false,
      displaySafe: false,
      gateBlockers: [],
      smallSampleWarning: true,
      record: "7-3",
    },
    departments: [
      {
        id: "picks-desk",
        name: "Picks Desk",
        agentKey: "SCOUT",
        agentDisplayName: "Scout",
        status: "GREEN",
        oneLiner: "3 picks published today.",
        actionRequired: false,
        actionDescription: null,
        agentMode: "DRAFT_ONLY",
        drilldownHref: null,
      },
      {
        id: "data-pipeline",
        name: "Data Pipeline",
        agentKey: "TAL",
        agentDisplayName: "Tal",
        status: "GREEN",
        oneLiner: "Data pipeline healthy.",
        actionRequired: false,
        actionDescription: null,
        agentMode: "DRAFT_ONLY",
        drilldownHref: null,
      },
    ],
    decisions: [],
    criticalWarnings: [],
    advisoryWarnings: [],
    aiOps: {
      available: false,
      reason: "Not wired",
      modelLanePolicy: ["Use Claude claude-fable-5 for production"],
      toInstrumentNext: ["Wire Langfuse"],
      ccusageNote: "Run ccusage for spot-checks",
    },
    assessedAt: new Date().toISOString(),
    jarvisVersion: "v2-test",
    ...overrides,
  };
}

function makeOSState(summary: OwnerSummary): JarvisIntelligenceState {
  return {
    summary,
    capabilities: [],
    capabilityStats: {
      total: 0,
      active: 0,
      draftOnly: 0,
      manual: 0,
      designed: 0,
      notWired: 0,
      wiringScore: 0,
      wiringLabel: "0% wired",
    },
    council: [],
    councilCounts: {
      total: 0,
      draftOnly: 0,
      manual: 0,
      notWired: 0,
      registeredCockpitAgents: 0,
    },
    operatingLoop: [],
    memory: {
      wired: false,
      truth: "Not wired",
      protocolDocs: [],
      nextAction: "Wire memory",
    },
    assessedAt: summary.assessedAt,
  };
}

// ─── buildDepartmentReport ────────────────────────────────────────────────────

describe("buildDepartmentReport", () => {
  it("returns UNKNOWN health for unknown agentId", () => {
    const summary = makeOwnerSummary();
    const report = buildDepartmentReport("unknown_agent_xyz", summary);
    expect(report.healthLevel).toBe("UNKNOWN");
    expect(report.agentId).toBe("unknown_agent_xyz");
  });

  it("SCOUT reports HEALTHY when gate is open and picks > 0", () => {
    const summary = makeOwnerSummary();
    const report = buildDepartmentReport("scout", summary);
    expect(report.healthLevel).toBe("HEALTHY");
    expect(report.department).toBe("PICKS_DESK");
  });

  it("SCOUT reports DEGRADED when gate is open but no picks today", () => {
    const summary = makeOwnerSummary({
      picks: {
        today: 0,
        isPublicGateOpen: true,
        publicReadyCount: 0,
        blockedReason: null,
        canonicalPending: 0,
        canonicalSettled: 0,
        bootstrapExcluded: 0,
        totalInSystem: 0,
        publicReadinessExplanation: "",
      },
    });
    const report = buildDepartmentReport("scout", summary);
    expect(report.healthLevel).toBe("DEGRADED");
    expect(report.topRisk).not.toBeNull();
  });

  it("department reports never claim HEALTHY without OwnerSummary evidence", () => {
    // With empty/RED summary, no dept should claim HEALTHY
    const summary = makeOwnerSummary({
      overallColor: "RED",
      criticalWarnings: ["Safety: something broken"],
      picks: {
        today: 0,
        isPublicGateOpen: false,
        publicReadyCount: 0,
        blockedReason: "Gate closed",
        canonicalPending: 0,
        canonicalSettled: 0,
        bootstrapExcluded: 0,
        totalInSystem: 0,
        publicReadinessExplanation: "Gate closed",
      },
    });
    const report = buildDepartmentReport("scout", summary);
    // SCOUT with gate closed and no picks should be ATTENTION, not HEALTHY
    expect(report.healthLevel).not.toBe("HEALTHY");
  });

  it("SETTLEMENT reports correctly from canonicalPending", () => {
    const summary = makeOwnerSummary({
      picks: {
        today: 3,
        isPublicGateOpen: true,
        publicReadyCount: 3,
        blockedReason: null,
        canonicalPending: 15,
        canonicalSettled: 100,
        bootstrapExcluded: 0,
        totalInSystem: 115,
        publicReadinessExplanation: "",
      },
    });
    const report = buildDepartmentReport("settlement-officer", summary);
    expect(report.healthLevel).toBe("ATTENTION");
    expect(report.topRisk).toContain("15");
  });

  it("oneLiner cites the source field", () => {
    const summary = makeOwnerSummary();
    const report = buildDepartmentReport("scout", summary);
    expect(report.oneLiner).toMatch(/source:/);
  });
});

// ─── buildAllDepartmentReports ────────────────────────────────────────────────

describe("buildAllDepartmentReports", () => {
  it("returns 8 department reports", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    expect(reports).toHaveLength(8);
  });

  it("all reports have required fields", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    for (const r of reports) {
      expect(r.department).toBeTruthy();
      expect(r.agentId).toBeTruthy();
      expect(r.oneLiner).toBeTruthy();
      expect(r.lastUpdated).toBeTruthy();
    }
  });
});

// ─── buildIntelligenceBriefing ────────────────────────────────────────────────

describe("buildIntelligenceBriefing", () => {
  it("executiveSummary is under 300 characters", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    const osState = makeOSState(summary);
    const briefing = buildIntelligenceBriefing(reports, osState);
    expect(briefing.executiveSummary.length).toBeLessThan(300);
  });

  it("has at most 3 items in topThreeActions", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    const osState = makeOSState(summary);
    const briefing = buildIntelligenceBriefing(reports, osState);
    expect(briefing.topThreeActions.length).toBeLessThanOrEqual(3);
  });

  it("includes generatedAt timestamp", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    const osState = makeOSState(summary);
    const briefing = buildIntelligenceBriefing(reports, osState);
    expect(briefing.generatedAt).toBeTruthy();
    expect(() => new Date(briefing.generatedAt).toISOString()).not.toThrow();
  });

  it("briefingForOwner contains NEEDS YOUR DECISION section", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    const osState = makeOSState(summary);
    const briefing = buildIntelligenceBriefing(reports, osState);
    expect(briefing.briefingForOwner).toContain("NEEDS YOUR DECISION");
  });

  it("briefingForOwner contains RUNNING FINE section", () => {
    const summary = makeOwnerSummary();
    const reports = buildAllDepartmentReports(summary);
    const osState = makeOSState(summary);
    const briefing = buildIntelligenceBriefing(reports, osState);
    expect(briefing.briefingForOwner).toContain("RUNNING FINE");
  });

  it("RED overall color appears in CRITICAL departments", () => {
    const summary = makeOwnerSummary({
      overallColor: "RED",
      criticalWarnings: ["Major system failure"],
      picks: {
        today: 0,
        isPublicGateOpen: false,
        publicReadyCount: 0,
        blockedReason: "Gate closed",
        canonicalPending: 0,
        canonicalSettled: 0,
        bootstrapExcluded: 0,
        totalInSystem: 0,
        publicReadinessExplanation: "",
      },
    });
    const reports = buildAllDepartmentReports(summary);
    const osState = makeOSState(summary);
    const briefing = buildIntelligenceBriefing(reports, osState);
    // The summary should reflect RED status
    expect(briefing.executiveSummary).toContain("RED");
  });
});

// ─── generateMorningBriefing ──────────────────────────────────────────────────

describe("generateMorningBriefing", () => {
  it("returns a non-empty briefing string", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const briefing = generateMorningBriefing(summary, osState);
    expect(briefing.length).toBeGreaterThan(0);
  });

  it("contains NEXT BUILD section", () => {
    const summary = makeOwnerSummary();
    const osState = makeOSState(summary);
    const briefing = generateMorningBriefing(summary, osState);
    expect(briefing).toContain("NEXT BUILD:");
  });
});
