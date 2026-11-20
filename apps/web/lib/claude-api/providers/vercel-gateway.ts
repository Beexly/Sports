/**
 * Vercel AI Gateway provider — unified OpenAI-compatible control-plane transport.
 *
 * Strictly confined inside the AST-guarded adapter allowlist
 * (`scripts/guardrails/ai-transport-import-boundary.mjs`) and invoked only via
 * `apps/web/lib/ai-control-plane/dispatch.ts`. Reads `AI_GATEWAY_API_KEY` (or
 * `VERCEL_AI_GATEWAY_API_KEY`) and optional `AI_GATEWAY_BASE_URL` (defaulting
 * to Vercel's AI Gateway endpoint).
 */
import type { ClaudeMessagesResult } from "../messages";
import { VercelGatewayConfigError, VercelGatewayMessagesError } from "../provider-errors";
export { VercelGatewayConfigError, VercelGatewayMessagesError };

type Env = Record<string, string | undefined>;

export const DEFAULT_VERCEL_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
export const DEFAULT_VERCEL_GATEWAY_MODEL = "anthropic/claude-sonnet-4-6";

export interface VercelGatewayConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
}

export function resolveVercelGatewayConfig(env: Env = process.env): VercelGatewayConfig | null {
  const apiKey = (env["AI_GATEWAY_API_KEY"] ?? env["VERCEL_AI_GATEWAY_API_KEY"] ?? "").trim();
  if (!apiKey) return null;
  const baseUrl = (env["AI_GATEWAY_BASE_URL"]?.trim() || DEFAULT_VERCEL_GATEWAY_BASE_URL).replace(
    /\/+$/,
    "",
  );
  return { apiKey, baseUrl };
}

export function isVercelGatewayConfigured(env: Env = process.env): boolean {
  return resolveVercelGatewayConfig(env) !== null;
}

export interface VercelGatewayMessagesRequest {
  readonly model?: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
}

interface GatewayChatResponse {
  readonly model?: string;
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

export async function callVercelGatewayMessages(
  request: VercelGatewayMessagesRequest,
  env: Env = process.env,
): Promise<ClaudeMessagesResult> {
  const config = resolveVercelGatewayConfig(env);
  if (!config) {
    throw new VercelGatewayConfigError(
      "Vercel AI Gateway is not configured (set AI_GATEWAY_API_KEY or VERCEL_AI_GATEWAY_API_KEY).",
    );
  }

  const rawModel = request.model?.trim() || DEFAULT_VERCEL_GATEWAY_MODEL;
  // Normalize bare Anthropic model names onto Vercel AI Gateway slug format unless already scoped.
  const modelId = rawModel.includes("/")
    ? rawModel
    : rawModel.startsWith("claude-")
      ? `anthropic/${rawModel}`
      : rawModel;
  const endpoint = config.baseUrl.endsWith("/chat/completions")
    ? config.baseUrl
    : `${config.baseUrl}/chat/completions`;

  const fetchImpl = request.fetchImpl ?? fetch;
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: request.maxTokens,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    throw new VercelGatewayMessagesError(
      `Vercel AI Gateway network error: ${err instanceof Error ? err.message : String(err)}`,
      { status: 0, durationMs, modelName: modelId },
    );
  }

  const durationMs = Date.now() - startedAt;
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new VercelGatewayMessagesError(
      `Vercel AI Gateway API error: ${response.status} - ${errText}`,
      { status: response.status, durationMs, modelName: modelId },
    );
  }

  let payload: GatewayChatResponse;
  try {
    payload = (await response.json()) as GatewayChatResponse;
  } catch (err) {
    throw new VercelGatewayMessagesError(
      `Vercel AI Gateway invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      { status: response.status, durationMs, modelName: modelId },
    );
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new VercelGatewayMessagesError("Vercel AI Gateway response contained empty content.", {
      status: response.status,
      durationMs,
      modelName: modelId,
    });
  }

  return {
    text,
    modelName: payload.model?.trim() || modelId,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    durationMs,
  };
}
