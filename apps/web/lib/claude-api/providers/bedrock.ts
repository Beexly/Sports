/**
 * AWS Bedrock provider for Claude — the credits play.
 *
 * Claude on Bedrock is the SAME model family at pricing identical to the direct
 * Anthropic API, but the spend is billable to AWS Activate GenAI credits. This
 * adapter lets our biggest variable cost (LLM inference) be paid with credits
 * instead of cash, extending runway, WITHOUT changing the output contract: it
 * returns the exact `ClaudeMessagesResult` shape `callClaudeMessages` returns, so
 * every downstream governance step (claim/brand scanners, cost + usage recording)
 * runs unchanged. AI output stays Tier-6 / content-only regardless of provider.
 *
 * Inert by default — mirrors cerebras.ts / internal-llm.ts. With no AWS creds and
 * no `CLAUDE_PROVIDER=bedrock`, nothing here runs and behavior is byte-identical.
 * Only the provider-dispatch layer decides when to use it, and it falls back to
 * Anthropic on any error, so reliability never regresses.
 *
 * NO FABRICATED MODEL IDS: Bedrock model ids are account- and region-specific and
 * must be confirmed in the Bedrock console once model access is granted. We do not
 * ship guessed defaults — the operator supplies a verified `BEDROCK_MODEL_MAP`
 * (anthropic id → bedrock id). An unmapped model throws rather than guesses.
 */
import { signRequest, awsUriEncode } from "./aws-sigv4";
import {
  buildSystemField,
  parseAnthropicUsage,
  type AnthropicUsageShape,
  type ClaudeMessagesResult,
} from "../messages";

type Env = Record<string, string | undefined>;

/** Bedrock request/response uses this fixed anthropic version string. */
const BEDROCK_ANTHROPIC_VERSION = "bedrock-2023-05-31";

export interface BedrockConfig {
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken?: string;
}

/** Resolve AWS credentials + region from the environment, or null if incomplete. */
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

/**
 * Explicit opt-in: Bedrock is used ONLY when the operator sets
 * `CLAUDE_PROVIDER=bedrock` AND full AWS credentials are present. Absent either,
 * we stay on the direct Anthropic API.
 */
export function isBedrockProviderSelected(env: Env = process.env): boolean {
  return env["CLAUDE_PROVIDER"]?.trim().toLowerCase() === "bedrock" && isBedrockConfigured(env);
}

export class BedrockConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BedrockConfigError";
  }
}

export class BedrockMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;
  constructor(
    message: string,
    args: { readonly status: number; readonly durationMs: number; readonly modelName: string },
  ) {
    super(message);
    this.name = "BedrockMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

/**
 * Map an Anthropic model id (what our call sites use) to the Bedrock model id for
 * this account/region. Sourced only from `BEDROCK_MODEL_MAP` (JSON) — no guessed
 * built-in defaults, because Bedrock ids vary by account and must be verified in
 * the console. Throws if unmapped so a misconfiguration is loud, not silent.
 */
export function resolveBedrockModelId(anthropicModelId: string, env: Env = process.env): string {
  const raw = env["BEDROCK_MODEL_MAP"]?.trim();
  if (raw) {
    let map: Record<string, unknown>;
    try {
      map = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new BedrockConfigError("BEDROCK_MODEL_MAP is not valid JSON.");
    }
    const mapped = map[anthropicModelId];
    if (typeof mapped === "string" && mapped.trim()) return mapped.trim();
  }
  throw new BedrockConfigError(
    `No Bedrock model id mapped for "${anthropicModelId}". Set BEDROCK_MODEL_MAP ` +
      `(e.g. {"claude-sonnet-4-6":"<verified-bedrock-id>"}) with ids confirmed in the Bedrock console.`,
  );
}

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}
interface BedrockInvokeResponse {
  readonly content?: readonly AnthropicTextBlock[];
  readonly usage?: AnthropicUsageShape;
}

export interface BedrockMessagesRequest {
  /** Anthropic model id (e.g. claude-sonnet-4-6); mapped to the Bedrock id internally. */
  readonly anthropicModelId: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly fetchImpl?: typeof fetch;
  /** Opt-in prompt caching on the system prompt (Bedrock supports cache_control). */
  readonly cache?: { readonly system?: boolean };
  /** Injected clock for deterministic signing in tests. Defaults to now. */
  readonly now?: Date;
}

/**
 * Invoke Claude on Bedrock via the InvokeModel API, SigV4-signed. Returns the same
 * result shape as callClaudeMessages. `modelName` on the result is the Bedrock id,
 * so the cost/usage ledger records that this spend hit credits (observability: a
 * silent fallback to Anthropic shows an Anthropic id instead).
 */
export async function callBedrockClaudeMessages(
  request: BedrockMessagesRequest,
  env: Env = process.env,
): Promise<ClaudeMessagesResult> {
  const config = bedrockConfig(env);
  if (!config) throw new BedrockConfigError("AWS credentials/region not configured for Bedrock.");

  const bedrockModelId = resolveBedrockModelId(request.anthropicModelId, env);
  const fetchImpl = request.fetchImpl ?? fetch;
  const now = request.now ?? new Date();

  const host = `bedrock-runtime.${config.region}.amazonaws.com`;
  // Model id contains ':' which must be percent-encoded in the path — both on the
  // wire and in the signature — so we encode once and use the same string for both.
  const canonicalUri = `/model/${awsUriEncode(bedrockModelId, true)}/invoke`;
  const endpoint = `https://${host}${canonicalUri}`;

  const systemField = buildSystemField(request.system, request.cache);

  const body = JSON.stringify({
    anthropic_version: BEDROCK_ANTHROPIC_VERSION,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    system: systemField,
    messages: [{ role: "user", content: request.user }],
  });

  const signed = signRequest({
    method: "POST",
    url: endpoint,
    canonicalUri,
    region: config.region,
    service: "bedrock",
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    headers: { "content-type": "application/json" },
    body,
    now,
  });

  const startedAt = Date.now();
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...signed },
    body,
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const errorText = await response.text();
    throw new BedrockMessagesError(`Bedrock API error: ${response.status} - ${errorText}`, {
      status: response.status,
      durationMs,
      modelName: bedrockModelId,
    });
  }

  const payload = (await response.json()) as BedrockInvokeResponse;
  const text = payload.content?.find((b) => b.type === "text" && typeof b.text === "string")?.text;
  if (!text?.trim()) {
    throw new BedrockMessagesError("Bedrock response did not include text content.", {
      status: response.status,
      durationMs,
      modelName: bedrockModelId,
    });
  }

  const usage = parseAnthropicUsage(payload.usage);

  return {
    text: text.trim(),
    modelName: bedrockModelId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationInputTokens: usage.cacheCreationInputTokens,
    cacheReadInputTokens: usage.cacheReadInputTokens,
    durationMs,
  };
}
