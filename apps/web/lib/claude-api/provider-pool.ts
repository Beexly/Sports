/**
 * Free-provider pool — health-aware round-robin + failover.
 *
 * Spreads LLM load across every available free provider so none is hammered
 * (and none hits its free-tier ceiling), failing over to the next on any error
 * or timeout. The platform answers with ZERO paid key because the keyless
 * Pollinations provider is always available; configured keyed-free providers
 * simply widen the rotation.
 *
 * Integrity:
 *   - The returned ClaudeMessagesResult carries the REAL provider/model used, so
 *     the cost ledger records what actually answered (never a placeholder).
 *   - If every free provider fails AND no Anthropic key is set, throws
 *     PoolExhaustedError. The caller renders an honest-degrade message; this
 *     module NEVER fabricates a response.
 *
 * Pure/injectable: fetchImpl, env, and now are all overridable for tests. The
 * rotating start index and the in-memory health map are module-level (process
 * lifetime) so load genuinely spreads across requests; both can be reset for
 * tests via __resetPoolStateForTests().
 */
import { callClaudeMessages, ClaudeMessagesError, type ClaudeMessagesResult } from "./messages";
import { callOpenAICompatible, OpenAICompatibleError } from "./providers/openai-compatible";
import {
  availableProviders,
  providerApiKey,
  type Provider,
} from "./providers/registry";

type Env = Record<string, string | undefined>;

export interface PoolRequest {
  readonly system: string;
  readonly user: string;
  readonly maxTokens: number;
  readonly temperature?: number;
}

export interface PoolOptions {
  readonly env?: Env;
  readonly fetchImpl?: typeof fetch;
  /** Injectable clock (ms epoch) for deterministic cooldown tests. */
  readonly now?: () => number;
}

/** Thrown only when EVERY free provider failed and Anthropic is unavailable too. */
export class PoolExhaustedError extends Error {
  /** Per-provider failure detail, in the order attempted. */
  readonly attempts: ReadonlyArray<{ readonly id: string; readonly reason: string }>;

  constructor(attempts: ReadonlyArray<{ readonly id: string; readonly reason: string }>) {
    super(
      `All LLM providers are unavailable (tried: ${
        attempts.map((a) => a.id).join(", ") || "none"
      }).`
    );
    this.name = "PoolExhaustedError";
    this.attempts = attempts;
  }
}

/** Cooldown applied to a provider after a failure before it is preferred again. */
const COOLDOWN_MS = 60_000;

interface Health {
  /** Epoch ms until which the provider is considered unhealthy. 0 = healthy. */
  unhealthyUntil: number;
}

const healthByProvider = new Map<string, Health>();
let rotationCursor = 0;

/** Test hook — clears the rotating cursor and the in-memory health map. */
export function __resetPoolStateForTests(): void {
  healthByProvider.clear();
  rotationCursor = 0;
}

function isHealthy(id: string, now: number): boolean {
  const h = healthByProvider.get(id);
  return !h || h.unhealthyUntil <= now;
}

function markUnhealthy(id: string, now: number): void {
  healthByProvider.set(id, { unhealthyUntil: now + COOLDOWN_MS });
}

function markHealthy(id: string): void {
  healthByProvider.delete(id);
}

/**
 * Order providers for this attempt:
 *   1. rotate the start index so load spreads (no provider is always first);
 *   2. prefer currently-healthy providers, but keep unhealthy ones as a last
 *      resort so we still try them if every healthy one fails.
 */
function orderForAttempt(providers: Provider[], now: number): Provider[] {
  if (providers.length === 0) return [];
  const start = rotationCursor % providers.length;
  rotationCursor = (rotationCursor + 1) % providers.length;

  const rotated: Provider[] = [];
  for (let i = 0; i < providers.length; i += 1) {
    rotated.push(providers[(start + i) % providers.length]!);
  }
  const healthy = rotated.filter((p) => isHealthy(p.id, now));
  const cooling = rotated.filter((p) => !isHealthy(p.id, now));
  return [...healthy, ...cooling];
}

/**
 * Call the free pool with round-robin + failover, falling back to Anthropic,
 * else throwing PoolExhaustedError. Returns the real provider/model used.
 */
export async function callViaPool(
  request: PoolRequest,
  opts: PoolOptions = {}
): Promise<ClaudeMessagesResult> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? Date.now;
  const fetchImpl = opts.fetchImpl;

  const providers = availableProviders(env);
  const attempts: Array<{ id: string; reason: string }> = [];

  for (const provider of orderForAttempt(providers, now())) {
    try {
      const result = await callOpenAICompatible({
        baseUrl: provider.baseUrl,
        model: provider.model,
        apiKey: providerApiKey(provider, env),
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        fetchImpl,
      });
      markHealthy(provider.id);
      return result;
    } catch (error) {
      markUnhealthy(provider.id, now());
      attempts.push({ id: provider.id, reason: failureReason(error) });
      // Fall through to the next provider.
    }
  }

  // All free providers failed (or none were available). Fall back to Anthropic
  // IF a paid key is configured.
  const anthropicKey = env["ANTHROPIC_API_KEY"];
  if (anthropicKey && anthropicKey.trim() !== "") {
    try {
      return await callClaudeMessages({
        apiKey: anthropicKey,
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        surface: "brief",
        fetchImpl,
      });
    } catch (error) {
      attempts.push({ id: "anthropic", reason: failureReason(error) });
    }
  }

  // Nothing answered — honest exhaustion. The caller degrades honestly; we
  // never fabricate a response.
  throw new PoolExhaustedError(attempts);
}

function failureReason(error: unknown): string {
  if (error instanceof OpenAICompatibleError) return `HTTP_${error.status}`;
  if (error instanceof ClaudeMessagesError) return `HTTP_${error.status}`;
  if (error instanceof Error) return error.name;
  return "UNKNOWN";
}
