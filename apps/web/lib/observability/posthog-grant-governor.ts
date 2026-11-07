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
