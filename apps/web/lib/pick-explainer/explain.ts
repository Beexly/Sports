/**
 * explainPick — the "ask the model why" generator. Mirrors the Model Court
 * wrapper: budget gate → grounded Claude call → enforced output policy → cost
 * ledger on BOTH success and failure. The model only ever sees the grounded
 * context (grounding.ts); a policy-failing answer is thrown, never shown.
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
import { buildGroundedContext, type GroundingInput } from "./grounding";
import {
  DEFAULT_EXPLAIN_REGISTER,
  buildExplainSystem,
  buildExplainUser,
  type ExplainRegister,
} from "./prompts";
import { evaluatePickExplanationPolicy } from "./policy";

const SURFACE = "PICK_EXPLANATION" as const;

export class PickExplanationError extends Error {
  readonly kind: string;
  constructor(message: string, kind = "GENERIC") {
    super(message);
    this.name = "PickExplanationError";
    this.kind = kind;
  }
}

export interface ExplainPickOptions {
  readonly apiKey: string;
  readonly grounding: GroundingInput;
  readonly question?: string | null;
  /** Reader register — same grounding and safety rules, different depth. */
  readonly register?: ExplainRegister;
  readonly gameId?: string | null;
  readonly userId?: string | null;
  /** Default true; set false in tests to skip the cost ledger. */
  readonly recordUsage?: boolean;
  readonly model?: string;
  readonly fetchImpl?: typeof fetch;
  readonly usageClient?: ClaudeUsageStoreDb;
  // Test/override injection — skip the DB budget read.
  readonly monthlySpendUsd?: number;
  readonly budgetPolicy?: ClaudeApiBudgetPolicy;
  readonly budgetOverrideActive?: boolean;
}

export interface PickExplanation {
  readonly text: string;
  readonly modelName: string;
}

export async function explainPick(options: ExplainPickOptions): Promise<PickExplanation> {
  const grounded = buildGroundedContext(options.grounding);
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
      throw new PickExplanationError(
        usage.fallbackMessage ?? "The explainer is at capacity for this billing cycle.",
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
      // A ledger failure must never break the user's request.
    }
  };

  try {
    const result = await callClaudeMessages({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 450,
      temperature: 0.1,
      system: buildExplainSystem(options.register ?? DEFAULT_EXPLAIN_REGISTER),
      user: buildExplainUser({ context: grounded.context, question: options.question }),
      cache: { system: true },
    });

    const failures = evaluatePickExplanationPolicy(result.text);
    if (failures.length > 0) {
      await ledger({
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: `POLICY_${failures[0]}`,
      });
      throw new PickExplanationError(
        `Explanation failed policy validation: ${failures.join(", ")}`,
        "POLICY",
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

    return { text: result.text.trim(), modelName: result.modelName };
  } catch (error) {
    if (error instanceof PickExplanationError) throw error;
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
    throw new PickExplanationError(
      error instanceof Error ? error.message : "Pick explanation failed.",
    );
  }
}
