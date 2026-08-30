/**
 * Generic OpenAI-compatible chat-completions client.
 * Free-lane secondary hosts (Gemma/Nemotron free, Groq free, NIM, etc.).
 * OpenAiCompatError on transport/empty so free-lane can hop to callClaude.
 */
import type { ClaudeMessagesResult } from "./messages";

export interface OpenAiCompatRequest {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
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
  let response: Response;
  try {
    response = await fetchImpl(url, {
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
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);
    throw new OpenAiCompatError(`OpenAI-compat network error: ${msg}`, {
      status: 0,
      durationMs,
      modelName: ledgerModel,
    });
  }

  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new OpenAiCompatError(`OpenAI-compat error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName: ledgerModel,
    });
  }

  let payload: ChatResponse;
  try {
    payload = (await response.json()) as ChatResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new OpenAiCompatError(`OpenAI-compat invalid JSON: ${msg}`, {
      status: response.status,
      durationMs,
      modelName: ledgerModel,
    });
  }

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
