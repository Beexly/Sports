/**
 * draftLossAutopsy — operator-triggered, grounded loss-autopsy DRAFT generator.
 * Mirrors the pick explainer: budget gate → grounded Claude call → parse +
 * validate → cost ledger on both paths. Returns a structured DRAFT; persistence
 * (always status=DRAFT, isPublic=false) and the no-auto-publish rule live in the
 * admin route. The model never sees anything but the grounded context.
 */

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
import { buildGroundedContext, type GroundingInput } from "@/lib/pick-explainer/grounding";
import { LOSS_AUTOPSY_SYSTEM, buildLossAutopsyUser } from "./prompts";
import { parseLossAutopsyDraft, type LossAutopsyDraft } from "./parse";

const SURFACE = "LOSS_AUTOPSY_DRAFT" as const;

export class LossAutopsyDraftError extends Error {
  readonly kind: string;
  constructor(message: string, kind = "GENERIC") {
    super(message);
    this.name = "LossAutopsyDraftError";
    this.kind = kind;
  }
}

export interface DraftLossAutopsyOptions {
  readonly apiKey: string;
  readonly grounding: GroundingInput;
  readonly gameId?: string | null;
  readonly userId?: string | null;
  readonly recordUsage?: boolean;
  readonly model?: string;
  readonly fetchImpl?: typeof fetch;
  readonly usageClient?: ClaudeUsageStoreDb;
  readonly monthlySpendUsd?: number;
  readonly budgetPolicy?: ClaudeApiBudgetPolicy;
  readonly budgetOverrideActive?: boolean;
}

export interface DraftedLossAutopsy {
  readonly draft: LossAutopsyDraft;
  readonly modelName: string;
}

export async function draftLossAutopsy(
  options: DraftLossAutopsyOptions,
): Promise<DraftedLossAutopsy> {
  const grounded = buildGroundedContext(options.grounding);
  if (!grounded.isSettled) {
    throw new LossAutopsyDraftError("Cannot draft an autopsy for an unsettled pick.", "NOT_SETTLED");
  }
  const modelName = options.model ?? "claude-sonnet-4-6";

  const [monthlySpendUsd, budget] =
    typeof options.monthlySpendUsd === "number" && options.budgetPolicy
      ? [
          options.monthlySpendUsd,
          { policy: options.budgetPolicy, overrideActive: options.budgetOverrideActive ?? false },
        ]
      : await Promise.all([
          getCurrentMonthClaudeSpendUsd(SURFACE),
          loadClaudeBudgetPolicy(SURFACE),
        ]);

  if (!budget.overrideActive) {
    const usage = evaluateClaudeBudgetUsage(SURFACE, monthlySpendUsd, budget.policy);
    if (!usage.requestAllowed) {
      throw new LossAutopsyDraftError(
        usage.fallbackMessage ?? "Loss-autopsy drafting is at capacity for this billing cycle.",
        "BUDGET",
      );
    }
  }

  const ledger = async (args: {
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    success: boolean;
    errorKind: string | null;
  }): Promise<void> => {
    if (options.recordUsage === false) return;
    try {
      await recordClaudeApiCall(
        {
          surface: SURFACE,
          modelName: args.modelName,
          inputTokens: args.inputTokens,
          outputTokens: args.outputTokens,
          estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
          userId: options.userId ?? null,
          gameId: options.gameId ?? null,
          templateKind: SURFACE,
          durationMs: args.durationMs,
          success: args.success,
          errorKind: args.errorKind,
        },
        options.usageClient,
      );
    } catch {
      // Ledger failure must never break the request.
    }
  };

  try {
    const result = await callClaudeMessages({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 800,
      temperature: 0.2,
      system: LOSS_AUTOPSY_SYSTEM,
      user: buildLossAutopsyUser(grounded.context),
      cache: { system: true },
    });

    const parsed = parseLossAutopsyDraft(result.text);
    if (!parsed.ok) {
      await ledger({
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: `PARSE_${parsed.failures[0]}`,
      });
      throw new LossAutopsyDraftError(
        `Draft failed validation: ${parsed.failures.join(", ")}`,
        "PARSE",
      );
    }

    await ledger({
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
      errorKind: null,
    });

    return { draft: parsed.draft, modelName: result.modelName };
  } catch (error) {
    if (error instanceof LossAutopsyDraftError) throw error;
    if (error instanceof ClaudeMessagesError) {
      await ledger({
        modelName: error.modelName,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: error.durationMs,
        success: false,
        errorKind: `HTTP_${error.status}`,
      });
    }
    throw new LossAutopsyDraftError(
      error instanceof Error ? error.message : "Loss-autopsy draft failed.",
    );
  }
}
