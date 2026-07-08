import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { ClaudeMessagesError } from "@/lib/claude-api/messages";
import { callClaude } from "@/lib/claude-api/provider-dispatch";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import {
  buildJournalDraftPromptUser,
  JOURNAL_DRAFTING_SYSTEM_PROMPT,
} from "@/lib/journal/prompts";
import { scanModelJournalMarkdown } from "@/lib/journal/compliance";
import type { JournalWeekData } from "@/lib/journal/week-data";

export interface ModelJournalClaudeOptions {
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

export class ModelJournalGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelJournalGenerationError";
  }
}

export async function generateModelJournalDraftMarkdown(
  weekData: JournalWeekData,
  options: ModelJournalClaudeOptions
): Promise<string> {
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
          getCurrentMonthClaudeSpendUsd("MODEL_JOURNAL_DRAFT"),
          loadClaudeBudgetPolicy("MODEL_JOURNAL_DRAFT"),
        ]);

  if (!budget.overrideActive) {
    const usage = evaluateClaudeBudgetUsage("MODEL_JOURNAL_DRAFT", monthlySpendUsd, budget.policy);
    if (!usage.requestAllowed) {
      throw new ModelJournalGenerationError(
        usage.fallbackMessage ?? "The Model Journal weekly draft is paused while the API budget recovers."
      );
    }
  }

  try {
    const result = await callClaude({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 3000,
      temperature: 0.2,
      system: JOURNAL_DRAFTING_SYSTEM_PROMPT,
      user: buildJournalDraftPromptUser(weekData),
    });
    const policyFailures = evaluateModelJournalDraftPolicy(result.text);
    if (policyFailures.length > 0) {
      await maybeRecordJournalUsage({
        options,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: `POLICY_${policyFailures[0]}`,
      });
      throw new ModelJournalGenerationError(`Model Journal draft failed policy validation: ${policyFailures.join(", ")}`);
    }

    await maybeRecordJournalUsage({
      options,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
      errorKind: null,
    });
    return result.text;
  } catch (error) {
    if (error instanceof ClaudeMessagesError) {
      await maybeRecordJournalUsage({
        options,
        modelName: error.modelName,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: error.durationMs,
        success: false,
        errorKind: `HTTP_${error.status}`,
      });
    }
    throw new ModelJournalGenerationError(error instanceof Error ? error.message : "Model Journal draft failed.");
  }
}

export function evaluateModelJournalDraftPolicy(markdown: string): string[] {
  const failures: string[] = [];
  const text = markdown.trim();

  if (text.length === 0) {
    failures.push("EMPTY");
  }
  if (text.length > 12000) {
    failures.push("TOO_LONG");
  }

  const scan = scanModelJournalMarkdown(text);
  for (const flag of scan.flags) {
    if (flag.severity === "block") {
      failures.push(flag.id);
    }
  }

  return failures;
}

async function maybeRecordJournalUsage(args: {
  readonly options: ModelJournalClaudeOptions;
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
      surface: "MODEL_JOURNAL_DRAFT",
      modelName: args.modelName,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
      userId: args.options.userId ?? null,
      gameId: null,
      templateKind: "MODEL_JOURNAL_DRAFT",
      durationMs: args.durationMs,
      success: args.success,
      errorKind: args.errorKind,
    },
    args.options.usageClient
  );
}
