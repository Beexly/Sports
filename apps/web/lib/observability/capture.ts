/**
 * Error + event capture.
 *
 * captureError(err, context) and captureEvent(name, props) forward to an
 * external observability provider (Sentry-compatible ingest, PostHog) when its
 * env key is present, and are otherwise a SILENT no-op — they never throw,
 * never block, and emit nothing off-box.
 *
 * Inert by default: presence of a provider is decided purely by checking for
 * the existence of its env key. With no key set, both functions still write a
 * local structured log line via the logger so failures remain visible in
 * dev/CI without any network egress. When a key IS present, its value is read
 * ONLY to address/authenticate the provider's own ingest endpoint — it is
 * never logged, never printed, and never included in any local log line. This
 * mirrors the canonical OSS-stack pattern (lib/analytics/posthog.ts,
 * lib/analytics/langfuse.ts).
 *
 * Dispatch is fire-and-forget: a single fetch with a short abort timeout
 * whose failures (network errors, aborts, non-2xx) are swallowed entirely.
 * Capture never throws into the caller's path and never awaits the provider.
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
 * Env keys that, when present, indicate a wired provider. Presence decides
 * enablement; the value is only ever handed to that provider's own ingest
 * endpoint and is never logged or printed by this module.
 */
const ERROR_PROVIDER_KEYS = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

const EVENT_PROVIDER_KEYS = [
  "POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
] as const;

/** Optional PostHog ingest-host override (e.g. an EU or self-hosted region). */
const EVENT_HOST_KEYS = [
  "POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_HOST",
] as const;

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/** Hard cap on how long a provider dispatch may stay in flight. */
const DISPATCH_TIMEOUT_MS = 3_000;

function firstEnvValue(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/** True when an error-tracking provider key is present. Presence only. */
export function isErrorCaptureEnabled(): boolean {
  return firstEnvValue(ERROR_PROVIDER_KEYS) !== undefined;
}

/** True when an event-analytics provider key is present. Presence only. */
export function isEventCaptureEnabled(): boolean {
  return firstEnvValue(EVENT_PROVIDER_KEYS) !== undefined;
}

interface NormalizedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

function normalizeError(err: unknown): NormalizedError {
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
 * POST a payload and forget about it. Both the synchronous fetch call and the
 * eventual promise settlement are failure-swallowed: a provider outage, DNS
 * error, or abort-timeout can never surface to the capture caller.
 */
function postFireAndForget(url: string, body: string, contentType: string): void {
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    }).catch(() => {
      // Provider failures are intentionally invisible to the caller.
    });
  } catch {
    // fetch/AbortSignal construction failures are swallowed too.
  }
}

interface SentryEnvelopeTarget {
  readonly envelopeUrl: string;
  readonly dsn: string;
}

/**
 * Derive the Sentry envelope ingest URL from a DSN of the standard form
 * `{protocol}://{publicKey}@{host}/{pathPrefix?}{projectId}`. Returns null
 * (no egress) when the DSN does not parse — a malformed key must degrade to
 * the local-log-only behavior, never throw.
 */
function resolveSentryTarget(): SentryEnvelopeTarget | null {
  const dsn = firstEnvValue(ERROR_PROVIDER_KEYS);
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const segments = url.pathname.split("/").filter((part) => part.length > 0);
    const projectId = segments.pop();
    if (!url.username || !projectId) return null;
    const basePath = segments.length > 0 ? `/${segments.join("/")}` : "";
    return {
      envelopeUrl: `${url.protocol}//${url.host}${basePath}/api/${projectId}/envelope/`,
      dsn,
    };
  } catch {
    return null;
  }
}

function newEventId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    // Extremely defensive: a capture path must work even without WebCrypto.
    const fallback = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    return fallback.padEnd(32, "0").slice(0, 32);
  }
}

/**
 * Fire a minimal Sentry-compatible error envelope. Authentication rides in
 * the envelope header's `dsn` field (Sentry envelope protocol), so the key
 * only ever travels to the provider's own ingest endpoint.
 */
function dispatchErrorToProvider(
  normalized: NormalizedError,
  context: CaptureContext | undefined
): void {
  const target = resolveSentryTarget();
  if (!target) return;
  const eventId = newEventId();
  const sentAt = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "javascript",
    level: "error",
    exception: {
      values: [{ type: normalized.name, value: normalized.message }],
    },
    extra: {
      ...(context ?? {}),
      ...(normalized.stack ? { stack: normalized.stack } : {}),
    },
  };
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn: target.dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");
  postFireAndForget(target.envelopeUrl, envelope, "application/x-sentry-envelope");
}

/** Fire a minimal PostHog capture call for a named event. */
function dispatchEventToProvider(name: string, props: EventProps | undefined): void {
  const apiKey = firstEnvValue(EVENT_PROVIDER_KEYS);
  if (!apiKey) return;
  const host = (firstEnvValue(EVENT_HOST_KEYS) ?? DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
  const body = JSON.stringify({
    api_key: apiKey,
    event: name,
    distinct_id: "server",
    timestamp: new Date().toISOString(),
    properties: { ...(props ?? {}) },
  });
  postFireAndForget(`${host}/capture/`, body, "application/json");
}

/**
 * Capture an error with optional structured context.
 *
 * No-op-safe: when no provider key is set, this only writes a local error log
 * line — zero network egress. When a provider IS configured, the same
 * normalized payload is additionally dispatched fire-and-forget to the
 * Sentry-compatible ingest endpoint derived from the DSN. Always swallows its
 * own failures; never rethrows; never blocks on the provider.
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
    if (isErrorCaptureEnabled()) {
      dispatchErrorToProvider(normalized, context);
    }
  } catch {
    // Capture must never throw into the caller's path.
  }
}

/**
 * Capture a named analytics/telemetry event with optional properties.
 *
 * No-op-safe: with no provider key set, this only writes a local info log
 * line — zero network egress. When a provider IS configured, the event is
 * additionally dispatched fire-and-forget to the PostHog capture API. Never
 * throws; never blocks on the provider.
 */
export function captureEvent(name: string, props?: EventProps): void {
  try {
    const fields = {
      event: name,
      ...(props ?? {}),
      provider: isEventCaptureEnabled() ? "configured" : "none",
    };
    logger.info("captured_event", fields);
    if (isEventCaptureEnabled()) {
      dispatchEventToProvider(name, props);
    }
  } catch {
    // Capture must never throw into the caller's path.
  }
}
