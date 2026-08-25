/**
 * Provider CONFIG RESOLUTION — env-shape checks, deliberately outside `providers/`.
 *
 * WHY THIS FILE EXISTS (ai-transport-import-boundary):
 *   The guard forbids any non-adapter file from importing a raw provider client
 *   (`claude-api/providers/*`), because those modules can issue model transport.
 *   But routing/planning code legitimately needs to know *which providers are
 *   configured* — a pure env-shape question that carries no transport capability.
 *   Co-locating that inert surface with the dangerous surface forced planners like
 *   `jynx.ts` to import a provider client just to read three booleans.
 *
 *   So config resolution lives here instead. This module imports NO transport, NO
 *   provider client, and NO vendor SDK — it reads `env` and (for Vertex) parses a
 *   service-account JSON via `./google-oauth`, which is itself a self-contained
 *   signing/OAuth utility (`node:crypto` only, no transport). Consumers get the
 *   booleans without touching the transport layer, and the guard keeps full strength.
 *
 *   This is the same fix already applied to the provider ERROR classes in
 *   `./provider-errors.ts` — separate the inert from the dangerous rather than
 *   widening the adapter allowlist (a blanket exemption would grant `jynx.ts`
 *   unrestricted provider access *including* transport, which is strictly worse).
 *
 * PUBLIC API IS UNCHANGED: each `providers/*.ts` re-exports the symbols it used to
 * define, so every existing import site keeps working byte-identically.
 */

import { parseServiceAccountJson, type ServiceAccountKey } from "./google-oauth";

type Env = Record<string, string | undefined>;

// ── Bedrock ──────────────────────────────────────────────────────────────────

export interface BedrockConfig {
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken?: string;
}

export function bedrockConfig(env: Env = process.env): BedrockConfig | null {
  const region = (env["AWS_BEDROCK_REGION"] ?? env["AWS_REGION"])?.trim();
  const accessKeyId = env["AWS_ACCESS_KEY_ID"]?.trim();
  const secretAccessKey = env["AWS_SECRET_ACCESS_KEY"]?.trim();
  if (!region || !accessKeyId || !secretAccessKey) return null;
  const sessionToken = env["AWS_SESSION_TOKEN"]?.trim();
  return { region, accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
}

export function isBedrockConfigured(env: Env = process.env): boolean {
  return bedrockConfig(env) !== null;
}

// ── Vertex ───────────────────────────────────────────────────────────────────

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

// ── Azure Foundry ────────────────────────────────────────────────────────────

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
