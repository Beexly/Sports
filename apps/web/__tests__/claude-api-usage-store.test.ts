import { describe, expect, it, vi } from "vitest";
import {
  getCurrentMonthClaudeSpendUsd,
  getUtcMonthWindow,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";

describe("Claude API usage store", () => {
  it("builds UTC month windows for budget aggregation", () => {
    const window = getUtcMonthWindow(new Date("2026-05-22T18:30:00.000Z"));

    expect(window.start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("loads current-month spend for one surface", async () => {
    const aggregate = vi.fn().mockResolvedValue({
      _sum: {
        estimatedCostUsd: { toString: () => "123.456789" },
      },
    });
    const client: ClaudeUsageStoreDb = {
      claudeApiCallRecord: { aggregate, create: vi.fn() },
    };

    const spend = await getCurrentMonthClaudeSpendUsd(
      "STUDIO_GENERATION",
      new Date("2026-05-22T18:30:00.000Z"),
      client
    );

    expect(spend).toBe(123.456789);
    expect(aggregate).toHaveBeenCalledWith({
      _sum: { estimatedCostUsd: true },
      where: {
        surface: "STUDIO_GENERATION",
        observedAt: {
          gte: new Date("2026-05-01T00:00:00.000Z"),
          lt: new Date("2026-06-01T00:00:00.000Z"),
        },
      },
    });
  });

  it("returns zero when no spend is recorded", async () => {
    const client: ClaudeUsageStoreDb = {
      claudeApiCallRecord: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { estimatedCostUsd: null } }),
        create: vi.fn(),
      },
    };

    await expect(getCurrentMonthClaudeSpendUsd("MODEL_JOURNAL_DRAFT", new Date(), client)).resolves.toBe(0);
  });

  it("persists a Claude API call record", async () => {
    const create = vi.fn().mockResolvedValue({ id: "record-1" });
    const client: ClaudeUsageStoreDb = {
      claudeApiCallRecord: {
        aggregate: vi.fn(),
        create,
      },
    };

    await recordClaudeApiCall(
      {
        surface: "STUDIO_GENERATION",
        modelName: "claude-sonnet-4-6",
        inputTokens: 1200,
        outputTokens: 300,
        estimatedCostUsd: 0.0081,
        userId: "user-1",
        gameId: "game-1",
        templateKind: "X_THREAD",
        durationMs: 480,
        success: true,
        observedAt: new Date("2026-05-22T18:30:00.000Z"),
      },
      client
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        surface: "STUDIO_GENERATION",
        modelName: "claude-sonnet-4-6",
        inputTokens: 1200,
        outputTokens: 300,
        estimatedCostUsd: 0.0081,
        userId: "user-1",
        gameId: "game-1",
        templateKind: "X_THREAD",
        durationMs: 480,
        success: true,
        errorKind: null,
        observedAt: new Date("2026-05-22T18:30:00.000Z"),
      },
    });
  });
});
