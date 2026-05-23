import {
  buildStudioAssetDraft,
  type StudioAssetDraft,
} from "@/lib/studio/build-assets";
import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import {
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import type {
  CreatorAssetKind,
  GenerationContext,
} from "@/lib/studio/templates";
import type { GameIntelligenceNode } from "@/lib/intelligence-graph";

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

interface AnthropicMessagesResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: {
    readonly input_tokens?: number;
    readonly output_tokens?: number;
  };
}

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

function extractText(response: AnthropicMessagesResponse): string {
  const text = response.content?.find((block) => block.type === "text" && typeof block.text === "string")?.text;
  if (!text?.trim()) {
    throw new StudioGenerationError("Claude response did not include text content.");
  }
  return text.trim();
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

  const fetchImpl = options.fetchImpl ?? fetch;
  const modelName = options.model ?? "claude-sonnet-4-6";
  const startedAt = Date.now();
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: dryRun.prompt.maxTokens,
      temperature: dryRun.prompt.temperature,
      system: dryRun.prompt.system,
      messages: [{ role: "user", content: dryRun.prompt.user }],
    }),
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    await maybeRecordStudioUsage({
      input,
      options,
      modelName,
      inputTokens: 0,
      outputTokens: 0,
      durationMs,
      success: false,
      errorKind: `HTTP_${response.status}`,
    });
    throw new StudioGenerationError(`Claude API error: ${response.status} - ${errorText}`);
  }

  const payload = (await response.json()) as AnthropicMessagesResponse;
  const inputTokens = payload.usage?.input_tokens ?? 0;
  const outputTokens = payload.usage?.output_tokens ?? 0;
  await maybeRecordStudioUsage({
    input,
    options,
    modelName,
    inputTokens,
    outputTokens,
    durationMs,
    success: true,
    errorKind: null,
  });

  return extractText(payload);
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
