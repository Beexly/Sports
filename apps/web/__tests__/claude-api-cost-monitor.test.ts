import { describe, expect, it } from "vitest";
import {
  CLAUDE_API_SURFACES,
  CLAUDE_BUDGET_FALLBACKS,
  DEFAULT_CLAUDE_API_BUDGETS,
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
} from "@/lib/claude-api/cost-monitor";

describe("Claude API cost monitor policy", () => {
  it("defines every budgeted Claude API surface from the product spec", () => {
    expect(CLAUDE_API_SURFACES).toEqual([
      "BLOG_GENERATION",
      "STUDIO_GENERATION",
      "MODEL_JOURNAL_DRAFT",
      "MODEL_COURT_ANSWER",
      "CALIBRATION_WEEKLY_INSIGHT",
      "PRE_MORTEM_SUMMARY",
      "PICK_EXPLANATION",
      "OTHER",
    ]);
    for (const surface of CLAUDE_API_SURFACES) {
      expect(DEFAULT_CLAUDE_API_BUDGETS[surface].surface).toBe(surface);
      expect(DEFAULT_CLAUDE_API_BUDGETS[surface].thresholds.red).toBe(1);
      expect(CLAUDE_BUDGET_FALLBACKS[surface]).toMatch(/\S/);
    }
  });

  it("moves through green, yellow, orange, red, and hard-cap statuses", () => {
    expect(evaluateClaudeBudgetUsage("STUDIO_GENERATION", 0).status).toBe("green");
    expect(evaluateClaudeBudgetUsage("STUDIO_GENERATION", 250).status).toBe("yellow");
    expect(evaluateClaudeBudgetUsage("STUDIO_GENERATION", 400).status).toBe("orange");
    expect(evaluateClaudeBudgetUsage("STUDIO_GENERATION", 500).status).toBe("red");
    expect(evaluateClaudeBudgetUsage("STUDIO_GENERATION", 750).status).toBe("hard_cap");
  });

  it("blocks requests and returns locked fallback copy at red threshold", () => {
    const usage = evaluateClaudeBudgetUsage("MODEL_COURT_ANSWER", 2000);

    expect(usage.requestAllowed).toBe(false);
    expect(usage.fallbackMessage).toContain("The Model Court is at capacity for this billing cycle.");
    expect(usage.fallbackMessage).toContain("The factor breakdown.");
    expect(usage.fallbackMessage).not.toMatch(/AI-powered|unlock|level up/i);
  });

  it("estimates token cost with the shared pricing policy", () => {
    expect(estimateClaudeCostUsd(1_000_000, 1_000_000)).toBe(18);
    expect(estimateClaudeCostUsd(500, 250)).toBe(0.00525);
  });
});
