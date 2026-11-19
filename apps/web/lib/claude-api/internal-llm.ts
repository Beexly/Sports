/**
 * Internal-LLM tier — route NON-user-facing LLM work (classification, normalization,
 * dedup, JSON extraction, draft-then-Claude-polish) to a cheap/free OpenAI-compatible
 * endpoint (Ollama self-hosted, or Groq's free API), keeping Claude for user-facing
 * quality. This is the structural cut to the biggest variable cost.
 *
 * Opt-in + env-gated: with no INTERNAL_LLM_BASE_URL configured, `isInternalLlmConfigured`
 * is false and callers fall back to Claude — zero behavior change until you turn it on.
 * NEVER use this for content shipped to users (CLAUDE.md: facts-backed, quality-gated).
 *
 * Owner action to enable (see OWNER_ACTION_ITEMS.md):
 *   INTERNAL_LLM_BASE_URL  e.g. http://localhost:11434/v1 (Ollama) or https://api.groq.com/openai/v1
 *   INTERNAL_LLM_MODEL     e.g. llama-3.3-70b-versatile
 *   INTERNAL_LLM_API_KEY   (Groq key; omit for local Ollama)
 */

import {
  DEFAULT_NOUS_BASE_URL,
  resolveNousPromoModel,
} from "./free-lane-policy";

const ALIBABA_COMPAT_DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const ALIBABA_COMPAT_DEFAULT_MODEL = "qwen-plus";

export type InternalLlmConfig = { baseUrl: string; model: string; apiKey?: string };

export function internalLlmConfig(env: Record<string, string | undefined> = process.env): InternalLlmConfig | null {
  const baseUrl = env["INTERNAL_LLM_BASE_URL"]?.trim();
  const model = env["INTERNAL_LLM_MODEL"]?.trim();
  if (baseUrl && model) {
    const apiKey = env["INTERNAL_LLM_API_KEY"]?.trim();
    return { baseUrl: baseUrl.replace(/\/$/, ""), model, ...(apiKey ? { apiKey } : {}) };
  }
  const nousKey = env["NOUS_API_KEY"]?.trim() || env["NOUS_PORTAL_API_KEY"]?.trim();
  if (nousKey && env["NOUS_QWEN4_MAX_FREE_PROMO_ENABLED"] === "true") {
    const promoModel = resolveNousPromoModel(env["NOUS_MODEL"], env);
    if (promoModel) {
      const nousBase = (env["NOUS_BASE_URL"]?.trim() || DEFAULT_NOUS_BASE_URL).replace(/\/+$/, "");
      return { baseUrl: nousBase, model: promoModel, apiKey: nousKey };
    }
  }
  const alibabaKey = env["ALIBABA_API_KEY"]?.trim() || env["DASHSCOPE_API_KEY"]?.trim();
  if (alibabaKey) {
    const alibabaBaseUrl = (
      env["ALIBABA_BASE_URL"]?.trim() ||
      env["DASHSCOPE_BASE_URL"]?.trim() ||
      ALIBABA_COMPAT_DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    const alibabaModel =
      env["ALIBABA_INTERNAL_MODEL"]?.trim() ||
      env["ALIBABA_MODEL"]?.trim() ||
      env["DASHSCOPE_MODEL"]?.trim() ||
      ALIBABA_COMPAT_DEFAULT_MODEL;
    return { baseUrl: alibabaBaseUrl, model: alibabaModel, apiKey: alibabaKey };
  }
  return null;
}

export function isInternalLlmConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return internalLlmConfig(env) !== null;
}

export interface InternalLlmRequest {
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly env?: Record<string, string | undefined>;
  /** Override the configured model (e.g. a smaller one for trivial jobs). */
  readonly model?: string;
}

export interface InternalLlmResult {
  readonly text: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
}

export class InternalLlmError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "InternalLlmError";
    this.status = status;
  }
}

interface OpenAiChatResponse {
  readonly choices?: ReadonlyArray<{ message?: { content?: string } }>;
  readonly usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Call the internal OpenAI-compatible chat endpoint. Throws if the tier isn't configured
 * (callers should check `isInternalLlmConfigured` and fall back to Claude).
 */
export async function callInternalLlm(request: InternalLlmRequest): Promise<InternalLlmResult> {
  const config = internalLlmConfig(request.env);
  if (!config) throw new InternalLlmError("Internal LLM tier is not configured", 0);

  let model = request.model ?? config.model;
  if (config.baseUrl.toLowerCase().includes("nousresearch")) {
    const validated = resolveNousPromoModel(model, request.env);
    if (!validated) {
      throw new InternalLlmError(
        `Model '${model}' blocked by Nous free-promo allowlist policy.`,
        403,
      );
    }
    model = validated;
  }

  const doFetch = request.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? 30000);
  const startedAt = Date.now();

  try {
    const res = await doFetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new InternalLlmError(`Internal LLM error: ${res.status} - ${body}`, res.status);
    }
    const payload = (await res.json()) as OpenAiChatResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new InternalLlmError("Internal LLM returned no content", res.status);
    return {
      text,
      model,
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
