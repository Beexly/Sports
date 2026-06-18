/**
 * Generic OpenAI-compatible chat-completions adapter.
 *
 * Many free LLM providers (Pollinations, Groq, DeepSeek, OpenRouter, Together,
 * Gemini's OpenAI-compat shim, Cerebras, self-hosted Ollama, …) speak the same
 * POST {baseUrl}/chat/completions wire format. This adapter is the single place
 * that format is implemented, returning the SAME shape as callClaudeMessages
 * (ClaudeMessagesResult) so it is a drop-in for content surfaces and all
 * downstream governance (claim / brand-safety scanners, cost recording) runs
 * unchanged. AI output stays Tier 6 / content-only regardless of provider —
 * see docs/models/local-model-lane.md.
 *
 * Keyless by design: when no apiKey is supplied NO Authorization header is sent,
 * so a fully keyless provider (e.g. Pollinations) works with zero secrets. Used
 * only via the provider pool / free-lane dispatcher, never directly.
 */
import type { ClaudeMessagesResult } from "../messages";

export interface OpenAICompatibleRequest {
  /** Base URL WITHOUT the trailing /chat/completions (it is appended here). */
  readonly baseUrl: string;
  readonly model: string;
  /** Optional bearer token. When absent, no Authorization header is sent (keyless). */
  readonly apiKey?: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
}

interface OpenAIChatResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

export class OpenAICompatibleError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(
    message: string,
    args: { readonly status: number; readonly durationMs: number; readonly modelName: string }
  ) {
    super(message);
    this.name = "OpenAICompatibleError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

function buildEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/chat/completions`;
}

export async function callOpenAICompatible(
  request: OpenAICompatibleRequest
): Promise<ClaudeMessagesResult> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const modelName = request.model;
  const startedAt = Date.now();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Keyless providers get NO Authorization header — sending an empty bearer
  // token would be rejected by some endpoints.
  if (request.apiKey && request.apiKey.trim() !== "") {
    headers["Authorization"] = `Bearer ${request.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetchImpl(buildEndpoint(request.baseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
    });
  } catch (error) {
    // Network/timeout/abort — surface as the typed error so the pool fails over.
    const durationMs = Date.now() - startedAt;
    const detail = error instanceof Error ? error.message : String(error);
    throw new OpenAICompatibleError(`OpenAI-compatible request failed: ${detail}`, {
      status: 0,
      durationMs,
      modelName,
    });
  }
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new OpenAICompatibleError(
      `OpenAI-compatible API error: ${response.status} - ${errorText}`,
      { status: response.status, durationMs, modelName }
    );
  }

  const payload = (await response.json()) as OpenAIChatResponse;
  const text = extractText(payload, modelName, durationMs);

  return {
    text,
    modelName,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    durationMs,
  };
}

function extractText(
  response: OpenAIChatResponse,
  modelName: string,
  durationMs: number
): string {
  const text = response.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    // An empty/garbled body is a provider failure — throw the typed error so the
    // pool fails over instead of returning an empty (effectively fabricated) reply.
    throw new OpenAICompatibleError("OpenAI-compatible response did not include text content.", {
      status: 502,
      durationMs,
      modelName,
    });
  }
  return text.trim();
}
