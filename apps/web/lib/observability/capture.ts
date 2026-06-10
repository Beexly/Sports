/**
 * Error + event capture.
 *
 * captureError(err, context) and captureEvent(name, props) forward to an
 * external observability provider (e.g. Sentry-compatible ingest, PostHog)
 * when its env key is present, and are otherwise a SILENT no-op — they never
 * throw, never block, and emit nothing off-box.
 *
 * Inert by default: presence of a provider is decided purely by checking for
 * the existence of its env key (we read presence only — never the value, never
 * printed, never logged). With no key set, both functions still write a local
 * structured log line via the logger so failures remain visible in dev/CI
 * without any network egress. This mirrors the canonical OSS-stack pattern
 * (lib/analytics/posthog.ts, lib/analytics/langfuse.ts).
 *
 * Usage:
 *   import { captureError, captureEvent } from "@/lib/observability/capture";
 *   try { ... } catch (err) { captureError(err, { surface: "picks" }); }
 *   captureEvent("pick_published", { pickId });
 */
import { logger } from "./logger";

export interface CaptureContext {
  readonly [key: string]: unknown;
}

export interface EventProps {
  readonly [key: string]: unknown;
}

/**
 * Env keys that, when present, indicate a wired provider. We only check
 * presence — the value is never read, logged, or transmitted by this module.
 */
const ERROR_PROVIDER_KEYS = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

const EVENT_PROVIDER_KEYS = [
  "POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
] as const;

function hasAnyEnv(keys: readonly string[]): boolean {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) return true;
  }
  return false;
}

/** True when an error-tracking provider key is present. Presence only. */
export function isErrorCaptureEnabled(): boolean {
  return hasAnyEnv(ERROR_PROVIDER_KEYS);
}

/** True when an event-analytics provider key is present. Presence only. */
export function isEventCaptureEnabled(): boolean {
  return hasAnyEnv(EVENT_PROVIDER_KEYS);
}

function normalizeError(err: unknown): {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
} {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(err.stack ? { stack: err.stack } : {}),
    };
  }
  return { name: "NonError", message: String(err) };
}

/**
 * Capture an error with optional structured context.
 *
 * No-op-safe: when no provider key is set, this only writes a local error log
 * line. When a provider IS configured, the same normalized payload would be
 * forwarded — wiring the concrete client is intentionally deferred so this
 * module stays import-only and side-effect-free until a founder enables it.
 * Always swallows its own failures; never rethrows.
 */
export function captureError(err: unknown, context?: CaptureContext): void {
  try {
    const normalized = normalizeError(err);
    const fields = {
      ...normalized,
      ...(context ?? {}),
      provider: isErrorCaptureEnabled() ? "configured" : "none",
    };
    logger.error("captured_error", fields);
    // When a provider is wired, dispatch `fields` to it here. Inert by design
    // until ERROR_PROVIDER_KEYS is populated; no client is instantiated.
  } catch {
    // Capture must never throw into the caller's path.
  }
}

/**
 * Capture a named analytics/telemetry event with optional properties.
 *
 * No-op-safe: with no provider key set, this only writes a local info log
 * line. Never throws.
 */
export function captureEvent(name: string, props?: EventProps): void {
  try {
    const fields = {
      event: name,
      ...(props ?? {}),
      provider: isEventCaptureEnabled() ? "configured" : "none",
    };
    logger.info("captured_event", fields);
    // When a provider is wired, dispatch `fields` to it here. Inert by design
    // until EVENT_PROVIDER_KEYS is populated; no client is instantiated.
  } catch {
    // Capture must never throw into the caller's path.
  }
}
