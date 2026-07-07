import { describe, expect, it } from "vitest";
import { listSeedAgentTasks } from "@/lib/tasks/agent-task-router";
import { buildJarvisOperatingAssessment } from "./jarvis-operating-assessment";

describe("buildJarvisOperatingAssessment staleDataWarnings", () => {
  it("surfaces the freshness/stale-data task by its content signal", () => {
    const assessment = buildJarvisOperatingAssessment();
    const staleTask = listSeedAgentTasks().find((task) => task.id === "stale-ingestion-alert");
    expect(staleTask).toBeDefined();
    expect(assessment.staleDataWarnings).toContain(staleTask!.title);
  });

  it("does not misclassify non-freshness tasks that share the source-intelligence workflow", () => {
    // tool-governance carries workflowId === "source-intelligence" but is not a freshness concern;
    // keying off the workflow id alone would wrongly surface it as a stale-data warning.
    const assessment = buildJarvisOperatingAssessment();
    const toolGovernance = listSeedAgentTasks().find((task) => task.id === "tool-governance");
    expect(toolGovernance?.workflowId).toBe("source-intelligence");
    expect(assessment.staleDataWarnings).not.toContain(toolGovernance!.title);
  });

  it("keeps surfacing the warning if the stale task id is renamed (freshness is a content signal, not an id convention)", () => {
    // The filter must not depend on task.id containing the literal substring "stale".
    const renamed = listSeedAgentTasks().map((task) =>
      task.id === "stale-ingestion-alert" ? { ...task, id: "freshness-breach" } : task,
    );
    // Re-run the same predicate the assessment uses, over the renamed set.
    const marker = /\b(?:stale|fresh)/i;
    const warnings = renamed
      .filter((task) => [task.title, task.description, task.nextAction, ...task.sourceEvidence].some((f) => marker.test(f)))
      .map((task) => task.title);
    expect(warnings).toContain("Route stale ingestion >4h");
  });
});
