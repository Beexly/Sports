/**
 * PostHog $50,000 Startup Grant Telemetry Governor (`posthog-grant-governor.ts`)
 *
 * Enforces the Uncompressed-Intelligence Zero-Waste Cost Doctrine:
 *   - 10% deterministic production event/session-replay sampling (`sampleRate: 0.10`)
 *   - Static health-check & internal cron ping suppression so grant credits are never
 *     burned on non-user synthetic traffic (`Project 516325`).
 */

export interface PostHogGovernorConfig {
  readonly projectId: string;
  readonly grantCreditUsd: number;
  readonly productionSampleRate: number;
  readonly suppressInternalHealthPings: boolean;
}

export const DEFAULT_POSTHOG_GOVERNOR_CONFIG: PostHogGovernorConfig = {
  projectId: "516325",
  grantCreditUsd: 50000,
  productionSampleRate: 0.1,
  suppressInternalHealthPings: true,
};

const INTERNAL_PING_PREFIXES = [
  "/api/health",
  "/api/cron/",
  "/_next/static/",
  "/favicon.ico",
] as const;

export function shouldCapturePostHogEvent(
  pathname: string,
  deterministicHashFraction: number,
  config: PostHogGovernorConfig = DEFAULT_POSTHOG_GOVERNOR_CONFIG
): {
  readonly capture: boolean;
  readonly reason: "SUPPRESSED_INTERNAL_PING" | "SAMPLED_IN" | "SAMPLED_OUT";
  readonly sampleRateApplied: number;
} {
  if (
    config.suppressInternalHealthPings &&
    INTERNAL_PING_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return {
      capture: false,
      reason: "SUPPRESSED_INTERNAL_PING",
      sampleRateApplied: 0,
    };
  }

  const clampedFraction = Math.max(0, Math.min(1, deterministicHashFraction));
  const capture = clampedFraction < config.productionSampleRate;
  return {
    capture,
    reason: capture ? "SAMPLED_IN" : "SAMPLED_OUT",
    sampleRateApplied: config.productionSampleRate,
  };
}

/**
 * PostHog AI / LLM Observability (`$ai_generation`) Event Schema (`https://posthog.com/r/ai-observability`)
 * Governed by the $50,000 Startup Grant Governor (`Project 516325`).
 */
export interface PostHogAiGenerationInput {
  readonly traceId: string;
  readonly spanId?: string;
  readonly spanName?: string;
  readonly model: string;
  readonly provider?: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencySeconds: number;
  readonly timeToFirstTokenSeconds?: number;
  readonly interTokenLatencyMs?: number;
  readonly totalCostUsd?: number;
  readonly isError?: boolean;
  readonly httpStatus?: number;
  readonly distinctId?: string;
  readonly pathname?: string;
  readonly deterministicHashFraction?: number;
}

export interface PostHogAiGenerationEvent {
  readonly event: "$ai_generation";
  readonly distinct_id: string;
  readonly properties: {
    readonly $ai_trace_id: string;
    readonly $ai_span_id: string;
    readonly $ai_span_name: string;
    readonly $ai_model: string;
    readonly $ai_provider: string;
    readonly $ai_input_tokens: number;
    readonly $ai_output_tokens: number;
    readonly $ai_latency: number;
    readonly $ai_time_to_first_token: number;
    readonly $ai_inter_token_latency_ms: number;
    readonly $ai_total_cost_usd: number;
    readonly $ai_is_error: boolean;
    readonly $ai_http_status: number;
    readonly gse_posthog_project_id: string;
    readonly gse_grant_credit_usd: number;
    readonly gse_sample_rate_applied: number;
    readonly gse_governor_reason: "SUPPRESSED_INTERNAL_PING" | "SAMPLED_IN" | "SAMPLED_OUT";
  };
}

export function buildPostHogAiGenerationEvent(
  input: PostHogAiGenerationInput,
  config: PostHogGovernorConfig = DEFAULT_POSTHOG_GOVERNOR_CONFIG
): PostHogAiGenerationEvent {
  const gov = shouldCapturePostHogEvent(
    input.pathname ?? "/api/cockpit/jarvis/jynx-brain",
    input.deterministicHashFraction ?? 0.05,
    config
  );
  const inputTokens = Math.max(0, Math.round(input.inputTokens));
  const outputTokens = Math.max(0, Math.round(input.outputTokens));
  const defaultCost =
    input.model.includes("alpha") || input.model.includes("free")
      ? 0
      : Number(((inputTokens * 1.5 + outputTokens * 6.0) / 1_000_000).toFixed(8));

  return {
    event: "$ai_generation",
    distinct_id: input.distinctId ?? "gse-autonomous-brain",
    properties: {
      $ai_trace_id: input.traceId,
      $ai_span_id: input.spanId ?? `${input.traceId}-span-01`,
      $ai_span_name: input.spanName ?? "stealth_skeleton_inference",
      $ai_model: input.model,
      $ai_provider: input.provider ?? "gse-stealth-skeleton",
      $ai_input_tokens: inputTokens,
      $ai_output_tokens: outputTokens,
      $ai_latency: Number(Math.max(0, input.latencySeconds).toFixed(6)),
      $ai_time_to_first_token: Number(
        Math.max(0, input.timeToFirstTokenSeconds ?? input.latencySeconds * 0.35).toFixed(6)
      ),
      $ai_inter_token_latency_ms: Number(
        Math.max(0, input.interTokenLatencyMs ?? (outputTokens > 1 ? (input.latencySeconds * 650) / outputTokens : 0)).toFixed(4)
      ),
      $ai_total_cost_usd: input.totalCostUsd ?? defaultCost,
      $ai_is_error: Boolean(input.isError),
      $ai_http_status: input.httpStatus ?? (input.isError ? 500 : 200),
      gse_posthog_project_id: config.projectId,
      gse_grant_credit_usd: config.grantCreditUsd,
      gse_sample_rate_applied: gov.sampleRateApplied,
      gse_governor_reason: gov.reason,
    },
  };
}

export async function capturePostHogAiGeneration(
  input: PostHogAiGenerationInput,
  options?: {
    readonly apiKey?: string;
    readonly host?: string;
    readonly config?: PostHogGovernorConfig;
  }
): Promise<{
  readonly event: PostHogAiGenerationEvent;
  readonly sampled: boolean;
  readonly dispatched: boolean;
}> {
  const cfg = options?.config ?? DEFAULT_POSTHOG_GOVERNOR_CONFIG;
  const event = buildPostHogAiGenerationEvent(input, cfg);
  const sampled = event.properties.gse_governor_reason === "SAMPLED_IN";
  const apiKey =
    options?.apiKey ??
    process.env["POSTHOG_PROJECT_API_KEY"] ??
    process.env["NEXT_PUBLIC_POSTHOG_KEY"];

  if (!sampled || !apiKey) {
    return { event, sampled, dispatched: false };
  }

  const host = (options?.host ?? process.env["NEXT_PUBLIC_POSTHOG_HOST"] ?? "https://us.i.posthog.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: event.event,
        distinct_id: event.distinct_id,
        properties: event.properties,
      }),
    });
    return { event, sampled, dispatched: res.ok };
  } catch {
    return { event, sampled, dispatched: false };
  }
}
