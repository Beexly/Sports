import { describe, expect, it, vi } from "vitest";
import {
  getCurrentMonthClaudeSpendUsd,
  getProviderFallbackCount,
  getUtcMonthWindow,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import type { LlmDispatchRecord } from "@/lib/claude-api/cost-policy";

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
        costMode: null,
        providerRequested: null,
        providerUsed: null,
        billingPool: null,
        fallbackReason: null,
      },
    });
  });

  it("persists dispatch telemetry when a dispatch record is supplied", async () => {
    const create = vi.fn().mockResolvedValue({ id: "record-2" });
    const client: ClaudeUsageStoreDb = {
      claudeApiCallRecord: { aggregate: vi.fn(), create },
    };
    const dispatch: LlmDispatchRecord = {
      costMode: "normal",
      providerRequested: "bedrock",
      providerUsed: "anthropic",
      modelRequested: "claude-sonnet-4-6",
      modelUsed: "claude-sonnet-4-6",
      fallbackReason: "bedrock: boom",
      billingPool: "anthropic_direct",
      surface: "STUDIO_GENERATION",
    };

    await recordClaudeApiCall(
      {
        surface: "STUDIO_GENERATION",
        modelName: "claude-sonnet-4-6",
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: 0.001,
        durationMs: 200,
        success: true,
        dispatch,
      },
      client,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          costMode: "normal",
          providerRequested: "bedrock",
          providerUsed: "anthropic",
          billingPool: "anthropic_direct",
          fallbackReason: "bedrock: boom",
        }),
      }),
    );
  });

  it("warns when cash was billed while a credit provider was selected", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client: ClaudeUsageStoreDb = {
      claudeApiCallRecord: { aggregate: vi.fn(), create: vi.fn().mockResolvedValue({}) },
    };
    const dispatch: LlmDispatchRecord = {
      costMode: "normal",
      providerRequested: "bedrock",
      providerUsed: "anthropic",
      modelRequested: "claude-sonnet-4-6",
      modelUsed: "claude-sonnet-4-6",
      fallbackReason: "bedrock: boom",
      billingPool: "anthropic_direct",
      surface: "STUDIO_GENERATION",
    };

    await recordClaudeApiCall(
      {
        surface: "STUDIO_GENERATION",
        modelName: "claude-sonnet-4-6",
        inputTokens: 1,
        outputTokens: 1,
        estimatedCostUsd: 0,
        durationMs: 1,
        success: true,
        dispatch,
      },
      client,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("cash billed to Anthropic");
    warnSpy.mockRestore();
  });

  it("does not warn when the direct Anthropic API was deliberately requested", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client: ClaudeUsageStoreDb = {
      claudeApiCallRecord: { aggregate: vi.fn(), create: vi.fn().mockResolvedValue({}) },
    };
    const dispatch: LlmDispatchRecord = {
      costMode: "normal",
      providerRequested: "anthropic",
      providerUsed: "anthropic",
      modelRequested: "claude-sonnet-4-6",
      modelUsed: "claude-sonnet-4-6",
      fallbackReason: null,
      billingPool: "anthropic_direct",
      surface: "STUDIO_GENERATION",
    };

    await recordClaudeApiCall(
      {
        surface: "STUDIO_GENERATION",
        modelName: "claude-sonnet-4-6",
        inputTokens: 1,
        outputTokens: 1,
        estimatedCostUsd: 0,
        durationMs: 1,
        success: true,
        dispatch,
      },
      client,
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  describe("getProviderFallbackCount", () => {
    it("counts only fallback-to-anthropic calls, excluding deliberate direct calls", async () => {
      const count = vi.fn().mockResolvedValue(3);
      const client: ClaudeUsageStoreDb = {
        claudeApiCallRecord: { aggregate: vi.fn(), create: vi.fn(), count },
      };

      const result = await getProviderFallbackCount(
        "STUDIO_GENERATION",
        new Date("2026-05-22T18:30:00.000Z"),
        client,
      );

      expect(result).toBe(3);
      expect(count).toHaveBeenCalledWith({
        where: {
          surface: "STUDIO_GENERATION",
          providerUsed: "anthropic",
          providerRequested: { in: ["bedrock", "vertex"] },
          observedAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lt: new Date("2026-06-01T00:00:00.000Z"),
          },
        },
      });
    });

    it("returns 0 when the injected client has no count method", async () => {
      const client: ClaudeUsageStoreDb = {
        claudeApiCallRecord: { aggregate: vi.fn(), create: vi.fn() },
      };

      await expect(getProviderFallbackCount("STUDIO_GENERATION", new Date(), client)).resolves.toBe(0);
    });
  });
});
