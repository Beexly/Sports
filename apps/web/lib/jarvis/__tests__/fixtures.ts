import type { OwnerSummary } from "@/lib/cockpit/owner-summary";

/** A realistic OwnerSummary fixture. Numbers here are the ONLY source of truth tests accept. */
export function makeSummary(overrides: Partial<OwnerSummary> = {}): OwnerSummary {
  return {
    overallColor: "AMBER",
    oneLiner: "Platform operational; performance gate closed pending sample.",
    picks: {
      today: 4,
      isPublicGateOpen: true,
      publicReadyCount: 4,
      blockedReason: null,
      canonicalPending: 6,
      canonicalSettled: 18,
      bootstrapExcluded: 12,
      totalInSystem: 38,
      publicReadinessExplanation: "Gate open; 4 picks public-ready today.",
    },
    performance: {
      targetPct: 70,
      actualWinRate: null,
      canonicalSampleSize: 18,
      minimumRequired: 25,
      remainingToThreshold: 7,
      isGateOpen: false,
      displaySafe: false,
      gateBlockers: ["canonical sample 18 < 25"],
      smallSampleWarning: true,
      record: "10-6-2",
    },
    departments: [
      {
        id: "picks",
        name: "Picks Desk",
        agentKey: "SCOUT",
        agentDisplayName: "Scout",
        status: "GREEN",
        oneLiner: "4 picks published today; pipeline normal.",
        actionRequired: false,
        actionDescription: null,
        agentMode: "DRAFT_ONLY",
        drilldownHref: "/cockpit",
      },
      {
        id: "data",
        name: "Data Pipeline",
        agentKey: "TAL",
        agentDisplayName: "Tal",
        status: "AMBER",
        oneLiner: "Ingestion fresh; one source category aging.",
        actionRequired: true,
        actionDescription: "Review aging source category before tonight's slate.",
        agentMode: "DRAFT_ONLY",
        drilldownHref: "/cockpit/sources",
      },
    ],
    decisions: [
      { urgency: "HIGH", description: "Approve tonight's featured pick set", link: "/cockpit" },
    ],
    criticalWarnings: [],
    advisoryWarnings: ["Performance gate closed (sample 18/25)."],
    aiOps: {
      available: false,
      reason: "Telemetry not wired.",
      modelLanePolicy: [],
      toInstrumentNext: [],
      ccusageNote: "n/a",
    },
    assessedAt: "2026-06-12T06:00:00.000Z",
    jarvisVersion: "test",
    ...overrides,
  };
}
