/**
 * Observability — Sentry integration for Galaxy Sports Edge.
 *
 * Runtime-only: we deliberately do NOT use withSentryConfig / the Sentry webpack
 * plugin so the build stays deterministic and requires no SENTRY_AUTH_TOKEN.
 *
 * Server reads SENTRY_DSN.
 * Client reads NEXT_PUBLIC_SENTRY_DSN.
 *
 * Sentry for Startups org: "galaxy-sports-edge".
 * Supports:
 *  - Distributed tracing & spans
 *  - AI Agent Monitoring (Hermes, Jev, model evaluation, tool execution, token accounting)
 *  - Error triage & context attachment
 *  - Session Replay configuration (client-side)
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

  const tracesSampleRate =
    typeof process !== "undefined" && process.env["SENTRY_TRACES_SAMPLE_RATE"]
      ? parseFloat(process.env["SENTRY_TRACES_SAMPLE_RATE"])
      : process.env["NODE_ENV"] === "development"
        ? 1.0
        : 0.1;

  const replaysSessionSampleRate =
    typeof process !== "undefined" && process.env["SENTRY_REPLAY_SAMPLE_RATE"]
      ? parseFloat(process.env["SENTRY_REPLAY_SAMPLE_RATE"])
      : 0.1;

  Sentry.init({
    dsn,
    tracesSampleRate,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env["NODE_ENV"] ?? "development",
    initialScope: {
      tags: {
        org: process.env["SENTRY_ORG"] ?? "galaxy-sports-edge",
        service: "sports-web",
      },
    },
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
 * AI Agent Monitoring — Trace an agent execution session or turn.
 *
 * Creates a distributed span with standard GenAI semantic conventions.
 * If Sentry is not initialized, cleanly executes the function directly.
 */
export async function traceAIAgentRun<T>(
  options: {
    agentName: string;
    model?: string;
    conversationId?: string;
    prompt?: string;
  },
  fn: () => Promise<T> | T,
): Promise<T> {
  if (!_initialized) {
    return await fn();
  }

  return Sentry.startSpan(
    {
      name: `ai.agent.${options.agentName}`,
      op: "gen_ai.agent",
      attributes: {
        "gen_ai.agent.name": options.agentName,
        "gen_ai.request.model": options.model ?? "unknown",
        "gen_ai.conversation.id": options.conversationId ?? "default",
        ...(options.prompt ? { "gen_ai.prompt": options.prompt.slice(0, 500) } : {}),
      },
    },
    async () => await fn(),
  );
}

/**
 * AI Agent Monitoring — Trace an agent tool execution call.
 *
 * Creates a sub-span within the active agent trace.
 * If Sentry is not initialized, cleanly executes the function directly.
 */
export async function traceAIToolCall<T>(
  options: {
    toolName: string;
    args?: unknown;
  },
  fn: () => Promise<T> | T,
): Promise<T> {
  if (!_initialized) {
    return await fn();
  }

  return Sentry.startSpan(
    {
      name: `ai.tool.${options.toolName}`,
      op: "gen_ai.tool_call",
      attributes: {
        "gen_ai.tool.name": options.toolName,
        ...(options.args
          ? { "gen_ai.tool.args": JSON.stringify(options.args).slice(0, 1000) }
          : {}),
      },
    },
    async () => await fn(),
  );
}

/**
 * AI Agent Monitoring — Record token usage and model spend on the active span.
 *
 * No-ops cleanly when Sentry is not initialized.
 */
export function recordAITokenUsage(options: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
}): void {
  if (!_initialized) return;

  const activeSpan = Sentry.getActiveSpan();
  if (activeSpan) {
    if (options.inputTokens !== undefined) {
      activeSpan.setAttribute("gen_ai.usage.input_tokens", options.inputTokens);
    }
    if (options.outputTokens !== undefined) {
      activeSpan.setAttribute("gen_ai.usage.output_tokens", options.outputTokens);
    }
    if (options.totalTokens !== undefined) {
      activeSpan.setAttribute("gen_ai.usage.total_tokens", options.totalTokens);
    }
    if (options.model !== undefined) {
      activeSpan.setAttribute("gen_ai.response.model", options.model);
    }
  }
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
