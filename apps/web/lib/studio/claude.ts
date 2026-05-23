import {
  buildStudioAssetDraft,
  type StudioAssetDraft,
} from "@/lib/studio/build-assets";
import { evaluateClaudeBudgetUsage } from "@/lib/claude-api/cost-monitor";
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
}

export interface StudioClaudeClientOptions {
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly model?: string;
  readonly monthlySpendUsd?: number;
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
  if (typeof options.monthlySpendUsd === "number") {
    const budget = evaluateClaudeBudgetUsage("STUDIO_GENERATION", options.monthlySpendUsd);
    if (!budget.requestAllowed) {
      throw new StudioGenerationError(budget.fallbackMessage ?? "Studio generation is at capacity.");
    }
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model ?? "claude-sonnet-4-6",
      max_tokens: dryRun.prompt.maxTokens,
      temperature: dryRun.prompt.temperature,
      system: dryRun.prompt.system,
      messages: [{ role: "user", content: dryRun.prompt.user }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new StudioGenerationError(`Claude API error: ${response.status} - ${errorText}`);
  }

  return extractText((await response.json()) as AnthropicMessagesResponse);
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
