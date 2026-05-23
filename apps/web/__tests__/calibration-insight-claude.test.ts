import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CLAUDE_API_BUDGETS } from "@/lib/claude-api/cost-monitor";
import {
  generateCalibrationWeeklyInsight,
  MIN_CALIBRATION_INSIGHT_ESTIMATES,
} from "@/lib/calibration-training/claude";
import type { CalibrationInsightInput } from "@/lib/calibration-training/insight-prompt";

const input: CalibrationInsightInput = {
  userId: "user-1",
  weekOfYear: 21,
  yearOf: 2026,
  totalEstimates: 18,
  bandData: {
    "60-69": { sampleSize: 8, actualWinRate: 63, userMidpoint: 65 },
    "70-79": { sampleSize: 10, actualWinRate: 61, userMidpoint: 75 },
  },
  perSportData: {
    NBA: { sampleSize: 12, calibrationDelta: 14.2, direction: "OVER" },
    MLB: { sampleSize: 6, calibrationDelta: 1.4, direction: "WELL_CALIBRATED" },
  },
  perPickKindData: {
    SPREAD: { sampleSize: 11, calibrationDelta: 9.1, direction: "OVER" },
    TOTAL: { sampleSize: 7, calibrationDelta: -2.5, direction: "WELL_CALIBRATED" },
  },
};

describe("Calibration weekly insight Claude generation", () => {
  it("returns a deterministic thin-week sentence without calling Claude", async () => {
    const fetchImpl = vi.fn();

    const result = await generateCalibrationWeeklyInsight(
      {
        ...input,
        totalEstimates: MIN_CALIBRATION_INSIGHT_ESTIMATES - 1,
      },
      {
        apiKey: "test-key",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }
    );

    expect(result).toEqual({
      insightText: "Not enough calibration estimates were logged this week to produce a reliable pattern.",
      usedClaude: false,
      modelName: null,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("enforces the calibration insight budget before calling Claude", async () => {
    const fetchImpl = vi.fn();

    await expect(
      generateCalibrationWeeklyInsight(input, {
        apiKey: "test-key",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        monthlySpendUsd: 50,
        budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.CALIBRATION_WEEKLY_INSIGHT,
      })
    ).rejects.toThrow("weekly calibration insight is pending");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls Claude and records usage for a populated week", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: '"You were overconfident on NBA spreads this week by 14%, while MLB totals stayed calibrated."',
            },
          ],
          usage: { input_tokens: 700, output_tokens: 40 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    const result = await generateCalibrationWeeklyInsight(input, {
      apiKey: "test-key",
      fetchImpl,
      monthlySpendUsd: 0,
      budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.CALIBRATION_WEEKLY_INSIGHT,
      recordUsage: true,
      usageClient: {
        claudeApiCallRecord: {
          aggregate: vi.fn(),
          create,
        },
      },
    });

    expect(result).toEqual({
      insightText: "You were overconfident on NBA spreads this week by 14%, while MLB totals stayed calibrated.",
      usedClaude: true,
      modelName: "claude-sonnet-4-6",
    });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "CALIBRATION_WEEKLY_INSIGHT",
      modelName: "claude-sonnet-4-6",
      inputTokens: 700,
      outputTokens: 40,
      estimatedCostUsd: 0.0027,
      userId: "user-1",
      gameId: null,
      templateKind: "CALIBRATION_WEEKLY_INSIGHT",
      success: true,
      errorKind: null,
    });
  });
});
