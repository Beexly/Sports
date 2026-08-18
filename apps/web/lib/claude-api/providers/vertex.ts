/**
 * Google Vertex AI provider for Claude — the $10k partner-credit play.
 *
 * Claude on Vertex (Model Garden, publisher "anthropic") is the same model family;
 * the separate Google-for-Startups $10k Anthropic partner-model credit can pay for
 * it. A drop-in sibling to the Bedrock adapter behind the same seam: it returns the
 * identical `ClaudeMessagesResult`, so governance + the cost/usage ledger are
 * unchanged. Auth is a service-account OAuth2 bearer (see google-oauth.ts) instead
 * of SigV4.
 *
 * Inert by default (mirrors bedrock.ts): used only when the operator sets
 * `CLAUDE_PROVIDER=vertex` AND full Vertex config is present. NO fabricated model
 * ids — Vertex ids (e.g. `claude-3-5-sonnet-v2@20241022`) are supplied via a
 * verified `VERTEX_MODEL_MAP`; an unmapped model throws rather than guesses.
 */
import { parseServiceAccountJson, fetchAccessToken, type ServiceAccountKey } from "./google-oauth";
import type { ClaudeMessagesResult } from "../messages";

// Error classes live outside `providers/` so consumers can classify
// failures without importing a raw provider client. Re-exported here so
// this module's public API is unchanged. See ../provider-errors.ts.
import { VertexConfigError, VertexMessagesError } from "../provider-errors";
export { VertexConfigError, VertexMessagesError };

type Env = Record<string, string | undefined>;

const VERTEX_ANTHROPIC_VERSION = "vertex-2023-10-16";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

export interface VertexConfig {
  readonly project: string;
  readonly region: string;
  readonly key: ServiceAccountKey;
}

export function vertexConfig(env: Env = process.env): VertexConfig | null {
  const project = env["GOOGLE_VERTEX_PROJECT"]?.trim();
  const region = env["GOOGLE_VERTEX_REGION"]?.trim();
  const saJson = env["GOOGLE_APPLICATION_CREDENTIALS_JSON"]?.trim();
  if (!project || !region || !saJson) return null;
  const key = parseServiceAccountJson(saJson);
  if (!key) return null;
  return { project, region, key };
}

export function isVertexConfigured(env: Env = process.env): boolean {
  return vertexConfig(env) !== null;
}

export function isVertexProviderSelected(env: Env = process.env): boolean {
  return env["CLAUDE_PROVIDER"]?.trim().toLowerCase() === "vertex" && isVertexConfigured(env);
}

export function resolveVertexModelId(anthropicModelId: string, env: Env = process.env): string {
  const raw = env["VERTEX_MODEL_MAP"]?.trim();
  if (raw) {
    let map: Record<string, unknown>;
    try {
      map = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new VertexConfigError("VERTEX_MODEL_MAP is not valid JSON.");
    }
    const mapped = map[anthropicModelId];
    if (typeof mapped === "string" && mapped.trim()) return mapped.trim();
  }
  throw new VertexConfigError(
    `No Vertex model id mapped for "${anthropicModelId}". Set VERTEX_MODEL_MAP ` +
      `(e.g. {"claude-sonnet-4-6":"claude-3-5-sonnet-v2@20241022"}) with ids confirmed in Model Garden.`,
  );
}

// Small in-memory access-token cache, keyed by project+client_email. A token is
// reused until 60s before expiry so we don't mint one per Claude call.
const tokenCache = new Map<string, { token: string; expiresAtMs: number }>();

/** Test-only: clear the module-level token cache. */
export function resetVertexTokenCacheForTests(): void {
  tokenCache.clear();
}

async function getVertexAccessToken(
  config: VertexConfig,
  opts: { now: Date; fetchImpl?: typeof fetch },
): Promise<string> {
  const cacheKey = `${config.project}:${config.key.client_email}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs - 60_000 > opts.now.getTime()) return cached.token;

  const fetched = await fetchAccessToken(config.key, {
    scope: CLOUD_PLATFORM_SCOPE,
    now: opts.now,
    ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
  });
  tokenCache.set(cacheKey, { token: fetched.token, expiresAtMs: fetched.expiresAtMs });
  return fetched.token;
}

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}
interface VertexResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: { readonly input_tokens?: number; readonly output_tokens?: number };
}

export interface VertexMessagesRequest {
  readonly anthropicModelId: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
  readonly cache?: { readonly system?: boolean };
  readonly now?: Date;
}

/**
 * Invoke Claude on Vertex via rawPredict, using a service-account bearer token.
 * Returns the same shape as callClaudeMessages; `modelName` is the Vertex id so the
 * cost/usage ledger records that this spend hit the Vertex partner credit.
 */
export async function callVertexClaudeMessages(
  request: VertexMessagesRequest,
  env: Env = process.env,
): Promise<ClaudeMessagesResult> {
  const config = vertexConfig(env);
  if (!config) throw new VertexConfigError("Vertex project/region/credentials not configured.");

  const modelId = resolveVertexModelId(request.anthropicModelId, env);
  const fetchImpl = request.fetchImpl ?? fetch;
  const now = request.now ?? new Date();

  const token = await getVertexAccessToken(config, {
    now,
    ...(request.fetchImpl ? { fetchImpl: request.fetchImpl } : {}),
  });

  const endpoint =
    `https://${config.region}-aiplatform.googleapis.com/v1/projects/${config.project}` +
    `/locations/${config.region}/publishers/anthropic/models/${modelId}:rawPredict`;

  const systemField = request.cache?.system
    ? [{ type: "text" as const, text: request.system, cache_control: { type: "ephemeral" as const } }]
    : request.system;

  const body = JSON.stringify({
    anthropic_version: VERTEX_ANTHROPIC_VERSION,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    system: systemField,
    messages: [{ role: "user", content: request.user }],
  });

  const startedAt = Date.now();
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body,
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new VertexMessagesError(`Vertex API error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName: modelId,
    });
  }

  const payload = (await response.json()) as VertexResponse;
  const text = payload.content?.find((b) => b.type === "text" && typeof b.text === "string")?.text;
  if (!text?.trim()) {
    throw new VertexMessagesError("Vertex response did not include text content.", {
      status: response.status,
      durationMs,
      modelName: modelId,
    });
  }

  return {
    text: text.trim(),
    modelName: modelId,
    inputTokens: payload.usage?.input_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? 0,
    durationMs,
  };
}
