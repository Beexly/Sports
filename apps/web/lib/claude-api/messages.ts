import { pickModelForSurface, type ClaudeSurface } from "./model-router";

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
   */
  readonly cache?: { readonly system?: boolean };
}

export interface ClaudeMessagesResult {
  readonly text: string;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
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
  const systemField = request.cache?.system
    ? [{ type: "text" as const, text: request.system, cache_control: { type: "ephemeral" as const } }]
    : request.system;

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

  return {
    text,
    modelName,
    inputTokens: payload.usage?.input_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? 0,
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
