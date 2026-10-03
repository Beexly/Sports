/**
 * Cerebras Inference provider — OpenAI-compatible chat-completions.
 *
 * Returns the SAME shape as callClaudeMessages (ClaudeMessagesResult) so free-lane
 * is a drop-in for content surfaces; governance (claim/brand scanners, cost ledger)
 * is unchanged. Free-lane only — never call directly for product trust surfaces.
 *
 * Data posture: Cerebras does not retain/train on request data (see free-lane policy).
 * Default free model: gpt-oss-120b.
 *
 * Errors: HTTP/API failures and empty content throw CerebrasMessagesError so
 * free-lane can hop to secondary free host or callClaude. Unexpected bugs still
 * throw generic Error and abort the chain (no silent swallow).
 */
import type { ClaudeMessagesResult } from "../messages";

// Error classes live outside `providers/` so consumers can classify
// failures without importing a raw provider client. Re-exported here so
// this module's public API is unchanged. See ../provider-errors.ts.
import { CerebrasMessagesError } from "../provider-errors";
export { CerebrasMessagesError };

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

export async function callCerebrasMessages(
  request: CerebrasMessagesRequest,
): Promise<ClaudeMessagesResult> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const modelName = request.model ?? DEFAULT_CEREBRAS_MODEL;
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetchImpl("https://api.cerebras.ai/v1/chat/completions", {
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
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);
    throw new CerebrasMessagesError(`Cerebras network error: ${msg}`, {
      status: 0,
      durationMs,
      modelName,
    });
  }

  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new CerebrasMessagesError(`Cerebras API error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName,
    });
  }

  let payload: CerebrasChatResponse;
  try {
    payload = (await response.json()) as CerebrasChatResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new CerebrasMessagesError(`Cerebras invalid JSON: ${msg}`, {
      status: response.status,
      durationMs,
      modelName,
    });
  }

  const text = extractText(payload);
  if (!text) {
    throw new CerebrasMessagesError("Cerebras response did not include text content.", {
      status: response.status,
      durationMs,
      modelName,
    });
  }

  return {
    text,
    modelName,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    durationMs,
  };
}

function extractText(response: CerebrasChatResponse): string | null {
  const text = response.choices?.[0]?.message?.content;
  if (!text?.trim()) return null;
  return text.trim();
}
