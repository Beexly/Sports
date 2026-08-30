import { describe, expect, it } from "vitest";
import { materializeJarvisDraftTasks } from "@/lib/cockpit/jarvis-draft-tasks";
import type { JarvisAssessment } from "@/lib/cockpit/jarvis";

function minimalAssessment(over: Partial<JarvisAssessment> = {}): JarvisAssessment {
  return {
    assessedAt: "2026-07-29T00:00:00.000Z",
    version: "test",
    launchStatus: "NOT_READY_DATA",
    oneSentenceAssessment: "test",
    confidenceLevel: "LOW",
    publicSurfaceStatus: "AMBER",
    customerDashboardStatus: "AMBER",
    picksStatus: "AMBER",
    performanceStatus: "AMBER",
    cockpitStatus: "GREEN",
    historicalPickStatus: "AMBER",
    ingestionStatus: "RED",
    settlementStatus: "AMBER",
    canonicalHistoryStatus: "AMBER",
    bootstrapStatus: "AMBER",
    signalCoverageStatus: "AMBER",
    readinessGateSummary: { openCount: 0, totalCount: 0, closed: [] },
    safetyWarnings: ["DEMO_PICKS_ENABLED sample data"],
    missingPhaseWarnings: [],
    externalConfigWarnings: ["DATABASE_URL"],
    recommendedNextActions: ["Run free:doctor", "Verify gamma cron"],
    phaseMatrix: [],
    ...over,
  } as JarvisAssessment;
}

describe("materializeJarvisDraftTasks", () => {
  it("emits P0 safety and config draft tasks", () => {
    const tasks = materializeJarvisDraftTasks(minimalAssessment());
    expect(tasks.some((t) => t.source === "jarvis_safety" && t.priority === "P0")).toBe(true);
    expect(tasks.some((t) => t.id.includes("database-url"))).toBe(true);
  });

  it("assigns tal for ingestion-related recommendations", () => {
    const tasks = materializeJarvisDraftTasks(
      minimalAssessment({
        safetyWarnings: [],
        externalConfigWarnings: [],
        recommendedNextActions: ["Investigate stale ingestion on sources"],
      }),
    );
    expect(tasks[0]?.assignedAgent).toBe("tal");
  });

  it("never invents empty ids", () => {
    const tasks = materializeJarvisDraftTasks(
      minimalAssessment({
        safetyWarnings: [],
        externalConfigWarnings: [],
        recommendedNextActions: [],
      }),
    );
    expect(tasks).toHaveLength(0);
  });
});
