/**
 * Cerebras Inference provider — an OpenAI-compatible chat-completions endpoint.
 *
 * Returns the SAME shape as callClaudeMessages (ClaudeMessagesResult) so it is a
 * drop-in for content surfaces and all downstream governance (claim / brand-safety
 * scanners, cost recording) runs unchanged. AI output is Tier 6 / content-only
 * regardless of provider — see docs/models/local-model-lane.md.
 *
 * Chosen over OpenRouter's free tier specifically because Cerebras does not retain
 * or train on request data, satisfying the data-sovereignty constraint in the
 * model doctrine. Used only via the free-lane dispatcher, never directly.
 */
import type { ClaudeMessagesResult } from "../messages";

/** Free-tier default. gpt-oss-120b is on the Cerebras free trial as of 2026-06. */
export const DEFAULT_CEREBRAS_MODEL = "gpt-oss-120b";

export interface CerebrasMessagesRequest {
  readonly apiKey: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  /** Defaults to DEFAULT_CEREBRAS_MODEL. */
  readonly model?: string;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
}

interface CerebrasChatResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

export class CerebrasMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(
    message: string,
    args: { readonly status: number; readonly durationMs: number; readonly modelName: string }
  ) {
    super(message);
    this.name = "CerebrasMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

export async function callCerebrasMessages(
  request: CerebrasMessagesRequest
): Promise<ClaudeMessagesResult> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const modelName = request.model ?? DEFAULT_CEREBRAS_MODEL;
  const startedAt = Date.now();

  const response = await fetchImpl("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
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
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new CerebrasMessagesError(`Cerebras API error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName,
    });
  }

  const payload = (await response.json()) as CerebrasChatResponse;
  const text = extractText(payload);

  return {
    text,
    modelName,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    durationMs,
  };
}

function extractText(response: CerebrasChatResponse): string {
  const text = response.choices?.[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("Cerebras response did not include text content.");
  }
  return text.trim();
}
