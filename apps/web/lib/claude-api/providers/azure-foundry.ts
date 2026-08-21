/**
 * Microsoft Azure AI Foundry provider for Claude.
 *
 * Claude on Foundry exposes the Anthropic Messages API at:
 *   https://{resource}.services.ai.azure.com/anthropic/v1/messages
 * (or a full base URL ending in /anthropic). Auth is API key (or Entra token as key).
 *
 * Spend bills to the Azure subscription / Foundry deployment — which may be
 * offset by Microsoft for Startups / Founders Hub / other Azure credits **if
 * the founder’s credit SKU allows Claude Foundry inference**. Older sponsorship
 * SKUs excluded Anthropic; the founder must verify their offer. This adapter
 * never invents eligibility.
 *
 * Inert unless CLAUDE_PROVIDER=azure|azure-foundry AND resource/base + key +
 * model map are present. Any config/API error falls back via callClaude.
 * NO guessed model ids — AZURE_FOUNDRY_MODEL_MAP only.
 */
import type { ClaudeMessagesResult } from "../messages";

// Error classes live outside `providers/` so consumers can classify
// failures without importing a raw provider client. Re-exported here so
// this module's public API is unchanged. See ../provider-errors.ts.
import { AzureFoundryConfigError, AzureFoundryMessagesError } from "../provider-errors";
export { AzureFoundryConfigError, AzureFoundryMessagesError };

type Env = Record<string, string | undefined>;

const ANTHROPIC_VERSION = "2023-06-01";

export interface AzureFoundryConfig {
  /** Full Messages endpoint, e.g. https://myres.services.ai.azure.com/anthropic/v1/messages */
  readonly messagesUrl: string;
  readonly apiKey: string;
}

function normalizeMessagesUrl(baseRaw: string): string {
  const base = baseRaw.trim().replace(/\/+$/, "");
  if (base.endsWith("/v1/messages")) return base;
  if (base.endsWith("/anthropic")) return `${base}/v1/messages`;
  if (base.endsWith("/anthropic/v1")) return `${base}/messages`;
  // Full Foundry host without path
  if (/^https:\/\/[a-zA-Z0-9.-]+\.services\.ai\.azure\.com$/i.test(base)) {
    return `${base}/anthropic/v1/messages`;
  }
  // Last resort: append standard path
  return `${base}/anthropic/v1/messages`;
}

/**
 * Resolve endpoint from either:
 * - AZURE_FOUNDRY_BASE_URL (https://…/anthropic or full host)
 * - AZURE_FOUNDRY_RESOURCE (resource name only)
 * plus AZURE_FOUNDRY_API_KEY.
 */
export function azureFoundryConfig(env: Env = process.env): AzureFoundryConfig | null {
  const apiKey = env["AZURE_FOUNDRY_API_KEY"]?.trim();
  if (!apiKey) return null;

  const baseRaw = env["AZURE_FOUNDRY_BASE_URL"]?.trim();
  const resource = env["AZURE_FOUNDRY_RESOURCE"]?.trim();

  let messagesUrl: string | null = null;
  if (baseRaw) {
    if (!/^https:\/\//i.test(baseRaw)) return null;
    messagesUrl = normalizeMessagesUrl(baseRaw);
  } else if (resource) {
    // Resource name only — no protocol/host injection of untrusted full URLs.
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(resource)) return null;
    messagesUrl = `https://${resource}.services.ai.azure.com/anthropic/v1/messages`;
  }

  if (!messagesUrl) return null;
  return { messagesUrl, apiKey };
}

export function isAzureFoundryConfigured(env: Env = process.env): boolean {
  return azureFoundryConfig(env) !== null && Boolean(env["AZURE_FOUNDRY_MODEL_MAP"]?.trim());
}

/** CLAUDE_PROVIDER=azure or azure-foundry + full config. */
export function isAzureFoundryProviderSelected(env: Env = process.env): boolean {
  const p = env["CLAUDE_PROVIDER"]?.trim().toLowerCase() ?? "";
  return (p === "azure" || p === "azure-foundry") && isAzureFoundryConfigured(env);
}

/**
 * Map Anthropic model id → Foundry deployment / model name.
 * Verified ids only — no defaults.
 */
export function resolveAzureFoundryModelId(anthropicModelId: string, env: Env = process.env): string {
  const raw = env["AZURE_FOUNDRY_MODEL_MAP"]?.trim();
  if (raw) {
    let map: Record<string, unknown>;
    try {
      map = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new AzureFoundryConfigError("AZURE_FOUNDRY_MODEL_MAP is not valid JSON.");
    }
    const mapped = map[anthropicModelId];
    if (typeof mapped === "string" && mapped.trim()) return mapped.trim();
  }
  throw new AzureFoundryConfigError(
    `No Azure Foundry model mapped for "${anthropicModelId}". Set AZURE_FOUNDRY_MODEL_MAP ` +
      `(e.g. {"claude-sonnet-4-6":"<foundry-deployment-or-model-id>"}) from the Foundry portal.`,
  );
}

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}
interface FoundryMessagesResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: { readonly input_tokens?: number; readonly output_tokens?: number };
}

export interface AzureFoundryMessagesRequest {
  readonly anthropicModelId: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
  readonly cache?: { readonly system?: boolean };
}

/**
 * Invoke Claude via Azure Foundry Messages API. modelName is prefixed
 * `azure-foundry/` so credit-pool attribution never confuses it with cash Anthropic.
 */
export async function callAzureFoundryClaudeMessages(
  request: AzureFoundryMessagesRequest,
  env: Env = process.env,
): Promise<ClaudeMessagesResult> {
  const config = azureFoundryConfig(env);
  if (!config) {
    throw new AzureFoundryConfigError(
      "Azure Foundry not configured (need AZURE_FOUNDRY_API_KEY + RESOURCE or BASE_URL).",
    );
  }

  const foundryModelId = resolveAzureFoundryModelId(request.anthropicModelId, env);
  const ledgerModelName = `azure-foundry/${foundryModelId}`;
  const fetchImpl = request.fetchImpl ?? fetch;

  const systemField = request.cache?.system
    ? [{ type: "text" as const, text: request.system, cache_control: { type: "ephemeral" as const } }]
    : request.system;

  const body = JSON.stringify({
    model: foundryModelId,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    system: systemField,
    messages: [{ role: "user", content: request.user }],
  });

  const startedAt = Date.now();
  const response = await fetchImpl(config.messagesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
      // Foundry Messages API: api-key only (not Anthropic x-api-key — keeps claude-api-usage guardrail clean).
      "api-key": config.apiKey,
    },
    body,
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new AzureFoundryMessagesError(
      `Azure Foundry API error: ${response.status} - ${errorText}`,
      { status: response.status, durationMs, modelName: ledgerModelName },
    );
  }

  const payload = (await response.json()) as FoundryMessagesResponse;
  const text = payload.content?.find((b) => b.type === "text" && typeof b.text === "string")?.text;
  if (!text?.trim()) {
    throw new AzureFoundryMessagesError("Azure Foundry response did not include text content.", {
      status: response.status,
      durationMs,
      modelName: ledgerModelName,
    });
  }

  return {
    text: text.trim(),
    modelName: ledgerModelName,
    inputTokens: payload.usage?.input_tokens ?? 0,
    outputTokens: payload.usage?.output_tokens ?? 0,
    durationMs,
  };
}
