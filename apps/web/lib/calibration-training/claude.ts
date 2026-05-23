import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { callClaudeMessages, ClaudeMessagesError } from "@/lib/claude-api/messages";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import {
  buildCalibrationInsightUserPrompt,
  CALIBRATION_INSIGHT_SYSTEM_PROMPT,
  type CalibrationInsightInput,
} from "@/lib/calibration-training/insight-prompt";

export const MIN_CALIBRATION_INSIGHT_ESTIMATES = 5;

export interface CalibrationInsightClaudeOptions {
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly model?: string;
  readonly monthlySpendUsd?: number;
  readonly budgetPolicy?: ClaudeApiBudgetPolicy;
  readonly budgetOverrideActive?: boolean;
  readonly recordUsage?: boolean;
  readonly usageClient?: ClaudeUsageStoreDb;
  readonly userId?: string | null;
}

export interface CalibrationInsightResult {
  readonly insightText: string;
  readonly usedClaude: boolean;
  readonly modelName: string | null;
}

export class CalibrationInsightGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalibrationInsightGenerationError";
  }
}

export async function generateCalibrationWeeklyInsight(
  input: CalibrationInsightInput,
  options: CalibrationInsightClaudeOptions
): Promise<CalibrationInsightResult> {
  if (input.totalEstimates < MIN_CALIBRATION_INSIGHT_ESTIMATES) {
    return {
      insightText: "Not enough calibration estimates were logged this week to produce a reliable pattern.",
      usedClaude: false,
      modelName: null,
    };
  }

  const modelName = options.model ?? "claude-sonnet-4-6";
  const [monthlySpendUsd, budget] =
    typeof options.monthlySpendUsd === "number" && options.budgetPolicy
      ? [
          options.monthlySpendUsd,
          {
            policy: options.budgetPolicy,
            overrideActive: options.budgetOverrideActive ?? false,
          },
        ]
      : await Promise.all([
          getCurrentMonthClaudeSpendUsd("CALIBRATION_WEEKLY_INSIGHT"),
          loadClaudeBudgetPolicy("CALIBRATION_WEEKLY_INSIGHT"),
        ]);

  if (!budget.overrideActive) {
    const usage = evaluateClaudeBudgetUsage("CALIBRATION_WEEKLY_INSIGHT", monthlySpendUsd, budget.policy);
    if (!usage.requestAllowed) {
      throw new CalibrationInsightGenerationError(
        usage.fallbackMessage ?? "Your weekly calibration insight is pending while the API budget recovers."
      );
    }
  }

  try {
    const result = await callClaudeMessages({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 120,
      temperature: 0.1,
      system: CALIBRATION_INSIGHT_SYSTEM_PROMPT,
      user: buildCalibrationInsightUserPrompt(input),
    });
    await maybeRecordCalibrationUsage({
      input,
      options,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
      errorKind: null,
    });

    return {
      insightText: normalizeInsightText(result.text),
      usedClaude: true,
      modelName: result.modelName,
    };
  } catch (error) {
    if (error instanceof ClaudeMessagesError) {
      await maybeRecordCalibrationUsage({
        input,
        options,
        modelName: error.modelName,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: error.durationMs,
        success: false,
        errorKind: `HTTP_${error.status}`,
      });
    }
    throw new CalibrationInsightGenerationError(
      error instanceof Error ? error.message : "Calibration insight generation failed."
    );
  }
}

function normalizeInsightText(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0] ?? "";
}

async function maybeRecordCalibrationUsage(args: {
  readonly input: CalibrationInsightInput;
  readonly options: CalibrationInsightClaudeOptions;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
  readonly success: boolean;
  readonly errorKind: string | null;
}): Promise<void> {
  if (!args.options.recordUsage) return;

  await recordClaudeApiCall(
    {
      surface: "CALIBRATION_WEEKLY_INSIGHT",
      modelName: args.modelName,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
      userId: args.options.userId ?? args.input.userId,
      gameId: null,
      templateKind: "CALIBRATION_WEEKLY_INSIGHT",
      durationMs: args.durationMs,
      success: args.success,
      errorKind: args.errorKind,
    },
    args.options.usageClient
  );
}
