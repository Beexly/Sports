import { pickModelForSurface, type ClaudeSurface } from "./model-router";

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

/** Anthropic / Foundry / Bedrock / Vertex usage shape (cache fields optional). */
export interface AnthropicUsageShape {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
  readonly cache_creation_input_tokens?: number;
  readonly cache_read_input_tokens?: number;
}

interface AnthropicMessagesResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: AnthropicUsageShape;
}

/**
 * Build the `system` field for Anthropic-compatible Messages APIs.
 * When `cache.system` is true, emits an ephemeral cache_control block so the
 * static system prefix is reusable at ~0.1× input cost on cache hits.
 * Contract: the system string itself must stay byte-stable across requests —
 * never put request-id, timestamps, or user-specific text inside it.
 */
export function buildSystemField(
  system: string,
  cache?: { readonly system?: boolean },
): string | readonly [{ type: "text"; text: string; cache_control: { type: "ephemeral" } }] {
  if (cache?.system) {
    return [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }];
  }
  return system;
}

/** Normalize provider usage into ledger fields (missing cache fields → 0). */
export function parseAnthropicUsage(usage: AnthropicUsageShape | undefined | null): {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
} {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
  };
}

export interface ClaudeMessagesRequest {
  readonly apiKey: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  /** Explicit model id. If omitted, resolved from `surface` (else Sonnet). */
  readonly model?: string;
  /** Logical surface — routes to the right model tier via pickModelForSurface(). */
  readonly surface?: ClaudeSurface;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
  /**
   * Opt-in prompt caching. When `{ system: true }`, the system prompt is sent as
   * an ephemeral cache_control block so repeated calls reuse it at ~0.1× input
   * cost. Off by default — the request body is then byte-identical to before.
   * Prefer enabling on every call site with a long static system prompt.
   */
  readonly cache?: { readonly system?: boolean };
}

export interface ClaudeMessagesResult {
  readonly text: string;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** Tokens written to prompt cache this call (billed at cache-write rate). */
  readonly cacheCreationInputTokens: number;
  /** Tokens read from prompt cache this call (billed at ~0.1× input). */
  readonly cacheReadInputTokens: number;
  readonly durationMs: number;
}

export class ClaudeMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(message: string, args: { readonly status: number; readonly durationMs: number; readonly modelName: string }) {
    super(message);
    this.name = "ClaudeMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

export async function callClaudeMessages(request: ClaudeMessagesRequest): Promise<ClaudeMessagesResult> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const modelName =
    request.model ??
    (request.surface ? pickModelForSurface(request.surface) : "claude-sonnet-4-6");
  const startedAt = Date.now();

  // Optional prompt caching: send the (often long, static) system prompt as an
  // ephemeral cache_control block so repeated calls reuse it at ~0.1× input cost.
  // Off by default → body stays byte-identical to the prior behavior.
  const systemField = buildSystemField(request.system, request.cache);

  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": request.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      system: systemField,
      messages: [{ role: "user", content: request.user }],
    }),
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new ClaudeMessagesError(`Claude API error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName,
    });
  }

  const payload = (await response.json()) as AnthropicMessagesResponse;
  const text = extractText(payload);
  const usage = parseAnthropicUsage(payload.usage);

  return {
    text,
    modelName,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationInputTokens: usage.cacheCreationInputTokens,
    cacheReadInputTokens: usage.cacheReadInputTokens,
    durationMs,
  };
}

function extractText(response: AnthropicMessagesResponse): string {
  const text = response.content?.find((block) => block.type === "text" && typeof block.text === "string")?.text;
  if (!text?.trim()) {
    throw new Error("Claude response did not include text content.");
  }
  return text.trim();
}
