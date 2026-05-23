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

export type CalibrationInsightPolicyReason =
  | "EMPTY"
  | "TOO_LONG"
  | "MULTI_SENTENCE"
  | "EMOJI"
  | "BETTING_ADVICE"
  | "CTA"
  | "COMPARISON"
  | "BANNED_POSITIONING";

export interface CalibrationInsightPolicyResult {
  readonly allowed: boolean;
  readonly reason: CalibrationInsightPolicyReason | null;
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
    const insightText = normalizeInsightText(result.text);
    const policy = evaluateCalibrationInsightPolicy(insightText);
    if (!policy.allowed) {
      await maybeRecordCalibrationUsage({
        input,
        options,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: `POLICY_${policy.reason ?? "UNKNOWN"}`,
      });
      throw new CalibrationInsightGenerationError("Calibration insight failed policy validation.");
    }

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
      insightText,
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

export function evaluateCalibrationInsightPolicy(
  text: string,
): CalibrationInsightPolicyResult {
  const trimmed = text.trim();
  if (!trimmed) return { allowed: false, reason: "EMPTY" };

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 25) return { allowed: false, reason: "TOO_LONG" };

  const sentenceMarks = trimmed.match(/[.!?]/g)?.length ?? 0;
  if (sentenceMarks > 1) return { allowed: false, reason: "MULTI_SENTENCE" };

  if (/[\u{1F300}-\u{1F9FF}]/u.test(trimmed)) {
    return { allowed: false, reason: "EMOJI" };
  }

  if (/\b(?:bet|wager|stake)\s+(?:more|less)\b/i.test(trimmed)) {
    return { allowed: false, reason: "BETTING_ADVICE" };
  }

  if (/\b(?:increase|decrease|raise|lower)\s+your\s+(?:bet|bets|stake|stakes|unit|units|bankroll)\b/i.test(trimmed)) {
    return { allowed: false, reason: "BETTING_ADVICE" };
  }

  if (/\b(?:keep it up|try again next week|upgrade|subscribe|tap|click|join)\b/i.test(trimmed)) {
    return { allowed: false, reason: "CTA" };
  }

  if (/\b(?:other users|everyone else|most users|average user|bettors like you)\b/i.test(trimmed)) {
    return { allowed: false, reason: "COMPARISON" };
  }

  const bannedPositioningPatterns = [
    /\bAI-(?:powered|driven)\b/i,
    new RegExp(`\\bpowered by ${"AI"}\\b`, "i"),
    new RegExp(`\\bun${"lo"}${"ck"} your\\b`, "i"),
    /\blevel up\b/i,
    new RegExp(`\\bguaran${"tee"}d?\\b`, "i"),
    new RegExp(`\\b${"lo"}${"ck"}\\b`, "i"),
    /\bhammer\b/i,
  ];

  if (bannedPositioningPatterns.some((pattern) => pattern.test(trimmed))) {
    return { allowed: false, reason: "BANNED_POSITIONING" };
  }

  return { allowed: true, reason: null };
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
