/**
 * Langfuse tracing for Claude API calls — isolated OTel provider, serverless-safe.
 *
 * Round 5 of the repo-leverage audit (docs/ai/airwave/GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md)
 * found:
 *   - Langfuse's current SDK is `@langfuse/otel` + `@langfuse/tracing` (a full OTel-based
 *     rewrite), not the legacy unscoped `langfuse` package most older docs describe.
 *   - No Anthropic auto-instrumentation exists — the call must be hand-wrapped with
 *     `startObservation(name, attrs, {asType: "generation"})`.
 *   - On Vercel serverless there is no free option: `exportMode: "immediate"` plus an
 *     awaited flush before the route returns trades a bounded added latency (bounded by
 *     the default 5s request timeout) for avoiding silent trace loss when a function
 *     freezes right after responding.
 *   - Cleanest redaction fit for GSE: never attach prompt/response text to the span —
 *     only model, token/cost usage, and non-sensitive metadata. Enforced here by
 *     construction: this file never sets `input`/`output` on a generation's attributes.
 *
 * Uses an ISOLATED TracerProvider (`setLangfuseTracerProvider`), not the global OTel
 * provider, so this can never contend with any other OpenTelemetry usage added later —
 * `getLangfuseTracerProvider()` only falls back to the global provider if this module's
 * provider is never set.
 *
 * Inert by default: zero span creation, zero network calls, unless both
 * LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set — flip those two Vercel env vars
 * and tracing turns on with no further code change.
 */

import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { setLangfuseTracerProvider, startObservation } from "@langfuse/tracing";

type Env = Record<string, string | undefined>;

let cachedProvider: BasicTracerProvider | undefined;

function ensureInitialized(env: Env): BasicTracerProvider | undefined {
  const publicKey = env["LANGFUSE_PUBLIC_KEY"]?.trim();
  const secretKey = env["LANGFUSE_SECRET_KEY"]?.trim();
  if (!publicKey || !secretKey) return undefined;
  if (cachedProvider) return cachedProvider;

  const processor = new LangfuseSpanProcessor({
    publicKey,
    secretKey,
    baseUrl: env["LANGFUSE_BASE_URL"]?.trim() || undefined,
    // Serverless-safe: exports each span immediately rather than batching, so a
    // frozen/terminated Vercel function can't silently drop an in-flight export.
    exportMode: "immediate",
  });
  cachedProvider = new BasicTracerProvider({ spanProcessors: [processor] });
  // Isolated provider — deliberately never touches the global OTel tracer provider.
  setLangfuseTracerProvider(cachedProvider);
  return cachedProvider;
}

export interface LangfuseClaudeTraceParams {
  readonly surfaceName: string;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
  readonly durationMs: number;
}

/**
 * Record a completed Claude call as a Langfuse generation. Never attaches prompt or
 * response text — only model, token/cost usage, and duration metadata. A complete
 * no-op (no span, no network call) unless LANGFUSE_PUBLIC_KEY/SECRET_KEY are set.
 * Never throws — a tracing problem must never turn a successful Claude call into a
 * failed one.
 */
export async function traceClaudeCallToLangfuse(
  params: LangfuseClaudeTraceParams,
  env: Env = process.env,
): Promise<void> {
  const provider = ensureInitialized(env);
  if (!provider) return;

  try {
    const generation = startObservation(
      params.surfaceName,
      {
        model: params.modelName,
        usageDetails: {
          input: params.inputTokens,
          output: params.outputTokens,
        },
        costDetails: {
          total: params.costUsd,
        },
        metadata: {
          durationMs: params.durationMs,
        },
      },
      { asType: "generation" },
    );
    generation.end();
    // Serverless-safe flush, bounded by the processor's request timeout (default 5s)
    // — an accepted latency tradeoff, see header.
    await provider.forceFlush();
  } catch (error) {
    console.warn(
      `Langfuse tracing failed (non-fatal — the Claude call already completed): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
