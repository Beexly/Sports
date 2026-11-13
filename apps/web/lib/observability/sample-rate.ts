/**
 * Pure sample-rate resolution for lib/observability/sentry.ts.
 *
 * Extracted so the defaults and env-override validation are unit-testable
 * without importing the Sentry SDK.
 *
 * Defaults: production 0.15 traces (was 0.1 before the telemetry wiring pass),
 * development 1.0. SENTRY_TRACES_SAMPLE_RATE / SENTRY_REPLAY_SAMPLE_RATE
 * override when they parse to a finite number in [0, 1]; anything else
 * (NaN, out-of-range, blank) falls back to the default instead of silently
 * disabling tracing with NaN.
 */

function parseRate(value: string | undefined): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) return undefined;
  return n;
}

/** Traces sample rate: env override > dev 1.0 > prod 0.15. */
export function resolveTracesSampleRate(env: {
  SENTRY_TRACES_SAMPLE_RATE?: string | undefined;
  NODE_ENV?: string | undefined;
}): number {
  return (
    parseRate(env.SENTRY_TRACES_SAMPLE_RATE) ??
    (env.NODE_ENV === "development" ? 1.0 : 0.15)
  );
}

/** Session-replay sample rate: env override > 0.1 (unchanged default). */
export function resolveReplaySampleRate(env: {
  SENTRY_REPLAY_SAMPLE_RATE?: string | undefined;
}): number {
  return parseRate(env.SENTRY_REPLAY_SAMPLE_RATE) ?? 0.1;
}