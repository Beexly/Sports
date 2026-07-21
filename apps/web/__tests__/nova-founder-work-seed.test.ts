import { describe, expect, it } from "vitest";

import { buildFounderDailyBrief, validateFounderWorkItem } from "@/lib/opportunity-engine/founder-command";
import { FOUNDER_WORK_SEED } from "@/lib/opportunity-engine/founder-work-seed";

describe("NOVA founder execution backlog", () => {
  it("gives the coding agent complete what, why, when, how, proof, and authority fields", () => {
    expect(FOUNDER_WORK_SEED.length).toBeGreaterThanOrEqual(8);
    for (const item of FOUNDER_WORK_SEED) {
      expect(validateFounderWorkItem(item), item.id).toEqual([]);
      expect(item.externalActionsAllowed).toBe(false);
      expect(item.acceptanceCriteria.length).toBeGreaterThanOrEqual(4);
      expect(item.evidenceRequired.length).toBeGreaterThanOrEqual(3);
      expect(item.agentCanDo.length).toBeGreaterThan(0);
    }
  });

  it("covers revenue, launch, local continuity, sources, apps, portable skills, credits, and observability", () => {
    const ids = new Set(FOUNDER_WORK_SEED.map((item) => item.id));
    for (const id of [
      "nova-pr-146-verification",
      "founder-ai-opportunity-audit-offer",
      "local-coding-continuity",
      "nova-user-source-resolution",
      "nova-chatgpt-read-app",
      "nova-portable-agent-skill-pack",
      "credit-truth-and-workload-router",
      "nova-observability-and-evaluation",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("builds a bounded daily brief that includes first-cash and continuity work", () => {
    const brief = buildFounderDailyBrief(FOUNDER_WORK_SEED, new Date("2026-07-21T21:00:00.000Z"));
    expect(brief.decisions.length).toBeLessThanOrEqual(5);
    expect(brief.hasFirstCashLane).toBe(true);
    expect(brief.hasContinuityLane).toBe(true);
    expect(brief.externalActionsAllowed).toBe(false);
    expect(brief.decisions.some((entry) => entry.item.id === "founder-ai-opportunity-audit-offer")).toBe(true);
  });
});
