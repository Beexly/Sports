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
import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";
import type { JournalWeekData } from "@/lib/journal/week-data";

/**
 * Numbers the draft is ALLOWED to contain: every stat-shaped number that appeared
 * in the exact prompt the model was given, plus the structured weekly counts (and
 * thus the real W-L record). Any stat in the output that isn't here is fabricated —
 * the model was never given it. This is the "Math you can read" safety net actually
 * connected (it was previously dead code, imported only by its own test).
 */
export interface JournalGrounding {
  readonly promptText: string;
  readonly counts: JournalWeekData["counts"];
}

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

  const userPrompt = buildJournalDraftPromptUser(weekData);
  try {
    const result = await callClaude({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 3000,
      temperature: 0.2,
      system: JOURNAL_DRAFTING_SYSTEM_PROMPT,
      user: userPrompt,
      cache: { system: true },
    });
    const policyFailures = evaluateModelJournalDraftPolicy(result.text, {
      promptText: userPrompt,
      counts: weekData.counts,
    });
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

export function evaluateModelJournalDraftPolicy(
  markdown: string,
  grounding?: JournalGrounding,
): string[] {
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

  // Numeric grounding: every stat-shaped number in the draft must have appeared in
  // the prompt (or be a real weekly count). A fabricated record (9-2 when the week
  // was 7-4), an invented win rate, or a hallucinated factor stat is thus blocked —
  // not just the narrow banned-phrase regexes. Only runs when the caller supplies
  // grounding (generation time); the length/phrase checks stay standalone.
  if (grounding) {
    const allowed = [
      ...extractNumericClaims(grounding.promptText).map((c) => c.value),
      grounding.counts.settledPicks,
      grounding.counts.wins,
      grounding.counts.losses,
      grounding.counts.pushes,
      grounding.counts.publicLossAutopsies,
    ];
    if (!validateNumericClaims(text, { allowed }).grounded) {
      failures.push("UNGROUNDED_NUMERIC");
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
