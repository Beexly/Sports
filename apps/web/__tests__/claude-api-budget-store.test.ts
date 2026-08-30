import { describe, expect, it, vi } from "vitest";
import {
  loadClaudeBudgetPolicy,
  type ClaudeBudgetStoreDb,
} from "@/lib/claude-api/budget-store";

describe("Claude API budget store", () => {
  it("falls back to the locked default policy when no row exists", async () => {
    const client: ClaudeBudgetStoreDb = {
      claudeApiBudget: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const loaded = await loadClaudeBudgetPolicy("STUDIO_GENERATION", new Date(), client);

    expect(loaded.policy.monthlyBudgetUsd).toBe(500);
    expect(loaded.policy.thresholds.red).toBe(1);
    expect(loaded.overrideActive).toBe(false);
  });

  it("loads budget rows and active overrides", async () => {
    const client: ClaudeBudgetStoreDb = {
      claudeApiBudget: {
        findUnique: vi.fn().mockResolvedValue({
          monthlyBudgetUsd: { toString: () => "750.00" },
          alertThresholds: { yellow: 0.4, orange: 0.7, red: 0.95, hardCap: 1.25 },
          overrideActive: true,
          overrideExpiresAt: new Date("2026-05-23T00:00:00.000Z"),
        }),
      },
    };

    const loaded = await loadClaudeBudgetPolicy(
      "STUDIO_GENERATION",
      new Date("2026-05-22T18:30:00.000Z"),
      client
    );

    expect(loaded.policy.monthlyBudgetUsd).toBe(750);
    expect(loaded.policy.thresholds).toEqual({ yellow: 0.4, orange: 0.7, red: 0.95, hardCap: 1.25 });
    expect(loaded.overrideActive).toBe(true);
  });

  it("treats expired overrides as inactive", async () => {
    const client: ClaudeBudgetStoreDb = {
      claudeApiBudget: {
        findUnique: vi.fn().mockResolvedValue({
          monthlyBudgetUsd: "500.00",
          alertThresholds: {},
          overrideActive: true,
          overrideExpiresAt: new Date("2026-05-01T00:00:00.000Z"),
        }),
      },
    };

    const loaded = await loadClaudeBudgetPolicy(
      "MODEL_COURT_ANSWER",
      new Date("2026-05-22T18:30:00.000Z"),
      client
    );

    expect(loaded.overrideActive).toBe(false);
    expect(loaded.policy.thresholds.red).toBe(1);
  });
});
