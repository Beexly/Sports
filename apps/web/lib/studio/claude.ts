import {
  buildStudioAssetDraft,
  type StudioAssetDraft,
} from "@/lib/studio/build-assets";
import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { callClaudeMessages, ClaudeMessagesError } from "@/lib/claude-api/messages";
import {
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import type {
  CreatorAssetKind,
  GenerationContext,
} from "@/lib/studio/templates";
import type { GameIntelligenceNode } from "@/lib/intelligence-graph";

export interface StudioClaudeClientOptions {
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

export interface GenerateStudioAssetInput {
  readonly node: GameIntelligenceNode;
  readonly templateKind: CreatorAssetKind;
  readonly context: GenerationContext;
}

export class StudioGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudioGenerationError";
  }
}

export async function callClaudeForStudioAsset(
  input: GenerateStudioAssetInput,
  options: StudioClaudeClientOptions
): Promise<string> {
  const dryRun = buildStudioAssetDraft(input);
  if (dryRun.refusalReason) {
    throw new StudioGenerationError(dryRun.refusalReason);
  }
  if (!dryRun.prompt) {
    throw new StudioGenerationError("Studio template did not produce a prompt.");
  }
  if (typeof options.monthlySpendUsd === "number" && !options.budgetOverrideActive) {
    const budget = evaluateClaudeBudgetUsage("STUDIO_GENERATION", options.monthlySpendUsd, options.budgetPolicy);
    if (!budget.requestAllowed) {
      throw new StudioGenerationError(budget.fallbackMessage ?? "Studio generation is at capacity.");
    }
  }

  const modelName = options.model ?? "claude-sonnet-4-6";
  try {
    const result = await callClaudeMessages({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: dryRun.prompt.maxTokens,
      temperature: dryRun.prompt.temperature,
      system: dryRun.prompt.system,
      user: dryRun.prompt.user,
    });
    await maybeRecordStudioUsage({
      input,
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
      await maybeRecordStudioUsage({
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
    throw new StudioGenerationError(error instanceof Error ? error.message : "Claude API error");
  }
}

async function maybeRecordStudioUsage(args: {
  readonly input: GenerateStudioAssetInput;
  readonly options: StudioClaudeClientOptions;
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
      surface: "STUDIO_GENERATION",
      modelName: args.modelName,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
      userId: args.options.userId ?? null,
      gameId: args.input.node.id,
      templateKind: args.input.templateKind,
      durationMs: args.durationMs,
      success: args.success,
      errorKind: args.errorKind,
    },
    args.options.usageClient
  );
}

export async function generateStudioAssetDraft(
  input: GenerateStudioAssetInput,
  options: StudioClaudeClientOptions
): Promise<StudioAssetDraft> {
  const body = await callClaudeForStudioAsset(input, options);
  return buildStudioAssetDraft({
    ...input,
    generatedBody: body,
  });
}
