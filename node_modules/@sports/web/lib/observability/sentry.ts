/**
 * Observability — Sentry integration.
 *
 * Runtime-only: we deliberately do NOT use withSentryConfig / the Sentry webpack
 * plugin so the build stays deterministic and requires no SENTRY_AUTH_TOKEN.
 *
 * Server reads SENTRY_DSN.
 * Client reads NEXT_PUBLIC_SENTRY_DSN.
 *
 * When the DSN is absent everything is a clean no-op — the build must pass and
 * the app must run without any Sentry credentials in the environment.
 */

import * as Sentry from "@sentry/nextjs";

/** True when a DSN has been configured for this process. */
let _initialized = false;

/**
 * Initialise Sentry if a DSN is present.
 *
 * Call from instrumentation.ts (server) or a client init component (client).
 * Safe to call multiple times — only initialises once.
 */
export function initObservability(): void {
  // Prefer the runtime-appropriate variable. In a Node.js server context
  // NEXT_PUBLIC_* vars are also accessible via process.env, but we check both
  // so the function works correctly regardless of the call site.
  const dsn =
    (typeof process !== "undefined" && process.env["SENTRY_DSN"]) ||
    (typeof process !== "undefined" && process.env["NEXT_PUBLIC_SENTRY_DSN"]) ||
    undefined;

  if (!dsn) {
    // Only emit the "not wired" line on the server side to avoid console noise
    // from every client bundle load.
    if (typeof window === "undefined") {
      // eslint-disable-next-line no-console
      console.info("observability: not wired (no DSN)");
    }
    return;
  }

  if (_initialized) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env["NODE_ENV"] ?? "development",
    // No source-map upload — we intentionally skip the Sentry webpack plugin.
    // Errors still capture and are reported; stack frames reference minified
    // source without upload, which is acceptable for a first-pass integration.
  });

  _initialized = true;
}

/**
 * Capture an error.
 *
 * No-ops cleanly when Sentry is not initialised (no DSN). Pass an optional
 * context bag for tags/extra that aid triage.
 */
export function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!_initialized) return;

  Sentry.captureException(err, context ? { extra: context } : undefined);
}

/**
 * Derive an honest observability posture string for dashboards / cockpit.
 * Reads env at call time — never cached — so it reflects the live state.
 */
export function observabilityPosture(): string {
  const dsn =
    (typeof process !== "undefined" && process.env["SENTRY_DSN"]) ||
    (typeof process !== "undefined" && process.env["NEXT_PUBLIC_SENTRY_DSN"]);
  return dsn
    ? "error tracking: wired (DSN set)"
    : "error tracking: not wired (no DSN)";
}
