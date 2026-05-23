import { describe, expect, it, vi } from "vitest";
import { CLAUDE_API_SURFACES } from "@/lib/claude-api/cost-monitor";

describe("Claude API costs dashboard loader", () => {
  it("returns one current-month summary for every Claude API surface", async () => {
    process.env["DATABASE_URL"] = "stub";
    vi.resetModules();
    const { loadClaudeApiCostsDashboard } = await import("@/lib/claude-api/dashboard");
    const dashboard = await loadClaudeApiCostsDashboard(new Date("2026-05-22T18:30:00.000Z"));

    expect(dashboard.monthStartIso).toBe("2026-05-01T00:00:00.000Z");
    expect(dashboard.monthEndIso).toBe("2026-06-01T00:00:00.000Z");
    expect(dashboard.surfaces.map((surface) => surface.surface)).toEqual(CLAUDE_API_SURFACES);
    expect(dashboard.totalBudgetUsd).toBe(2750);
  });
});
