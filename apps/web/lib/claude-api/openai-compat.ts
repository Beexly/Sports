/**
 * Generic OpenAI-compatible chat-completions client.
 * Used by free-lane secondary hosts (Groq free, NVIDIA NIM free, OpenRouter free,
 * self-hosted Gemma/Nemotron) — same result shape as ClaudeMessagesResult.
 */
import type { ClaudeMessagesResult } from "./messages";

export interface OpenAiCompatRequest {
  readonly baseUrl: string; // e.g. https://api.groq.com/openai/v1
  readonly apiKey?: string;
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
  /** Prefix for ledger modelName (e.g. free-groq/, free-nim/). */
  readonly ledgerPrefix?: string;
}

interface ChatResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

export class OpenAiCompatError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;
  constructor(
    message: string,
    args: { readonly status: number; readonly durationMs: number; readonly modelName: string },
  ) {
    super(message);
    this.name = "OpenAiCompatError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

export async function callOpenAiCompatMessages(
  request: OpenAiCompatRequest,
): Promise<ClaudeMessagesResult> {
  const base = request.baseUrl.replace(/\/+$/, "");
  const url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  const ledgerModel = `${request.ledgerPrefix ?? "free-compat/"}${request.model}`;
  const fetchImpl = request.fetchImpl ?? fetch;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (request.apiKey?.trim()) {
    headers.Authorization = `Bearer ${request.apiKey.trim()}`;
  }

  const startedAt = Date.now();
  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    }),
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new OpenAiCompatError(`OpenAI-compat error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName: ledgerModel,
    });
  }

  const payload = (await response.json()) as ChatResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new OpenAiCompatError("OpenAI-compat response had no text content.", {
      status: response.status,
      durationMs,
      modelName: ledgerModel,
    });
  }

  return {
    text,
    modelName: ledgerModel,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    durationMs,
  };
}
