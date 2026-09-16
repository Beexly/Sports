import { describe, expect, it } from "vitest";
import {
  createRepoAssistantPlan,
  getRepoAssistantProfile,
} from "../lib/agents/repo-assistants";

describe("repo assistant integration", () => {
  it("plans RepoMaster as an isolated repository investigation", () => {
    const plan = createRepoAssistantPlan(
      "repomaster",
      "Trace the stale ingestion alert path and propose a test-backed fix.",
      "/tmp/sports-review",
    );

    expect(plan.profile.fit).toContain("repository investigation");
    expect(plan.commands[1]).toContain("--backend-mode repository_agent");
    expect(plan.runRecord.reviewStatus).toBe("draft");
    expect(plan.runRecord.ownerApprovalRequired).toBe(true);
    expect(plan.runRecord.requestsExternalAction).toBe(false);
  });

  it("keeps Ponytail as an operator-side prompt/plugin, not a runtime dependency", () => {
    const plan = createRepoAssistantPlan(
      "ponytail",
      "Reduce an overbuilt UI change without removing its tests.",
      "/tmp/sports-review",
    );

    expect(plan.commands).toEqual([
      "Install Ponytail only in the operator coding-agent environment.",
      "Review its lifecycle hooks before enabling them.",
    ]);
    expect(getRepoAssistantProfile("ponytail").prohibitedUse).toContain(
      "approval gates",
    );
  });

  it("rejects workspaces that could expose production material", () => {
    expect(() =>
      createRepoAssistantPlan("repomaster", "Inspect the worker", "/srv/prod"),
    ).toThrow("disposable workspace");
    expect(() =>
      createRepoAssistantPlan("repomaster", "Inspect the worker", ""),
    ).toThrow("workspace is required");
  });
});
