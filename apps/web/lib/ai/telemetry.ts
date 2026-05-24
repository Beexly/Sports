/**
 * withTelemetry — uniform Claude-call observability.
 *
 * Wraps any Anthropic SDK call site, capturing usage (including cache
 * hit/creation tokens), model, latency, and status. Always emits a
 * structured JSON line to stdout (Vercel captures it). Also appends
 * to `_logs/claude-usage.log` when not running on Vercel (filesystem
 * is ephemeral there — local dev + the GitHub Action get the queryable
 * file).
 *
 * Error path: records `{status: "error", errorClass}` then re-throws.
 * Never swallows.
 *
 * Mirrors the append-only / grep-friendly philosophy of
 * apps/web/lib/cockpit/jarvis-audit-log.ts.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { db, isStubMode } from "@sports/db";

const LOG_PATH = resolve(process.cwd(), "_logs", "claude-usage.log");

export interface TelemetryContext {
  /** Stable identifier for the call site (e.g. "draft-reviewer"). */
  readonly callSite: string;
  /** The Claude model alias being invoked. */
  readonly model: string;
}

export interface TelemetryRecord {
  readonly ts: string;
  readonly callSite: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly status: "ok" | "error";
  readonly errorClass?: string;
}

interface AnthropicUsageShape {
  input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  output_tokens?: number | null;
}

interface AnthropicMessageShape {
  usage?: AnthropicUsageShape | null;
}

function numericOr(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function emit(record: TelemetryRecord): Promise<void> {
  const line = JSON.stringify(record);

  // Always log to stdout — Vercel captures it.
  if (record.status === "error") {
    // Error-class records go to stderr so they surface in `npm test -- -t` runs.
    console.error(line);
  } else {
    console.log(line);
  }

  // Best-effort DB write — works on Vercel where the filesystem is ephemeral.
  if (!isStubMode()) {
    try {
      await db.claudeUsageLog.create({
        data: {
          ts: new Date(record.ts),
          callSite: record.callSite,
          model: record.model,
          inputTokens: record.inputTokens,
          cacheCreationInputTokens: record.cacheCreationInputTokens,
          cacheReadInputTokens: record.cacheReadInputTokens,
          outputTokens: record.outputTokens,
          latencyMs: record.latencyMs,
          status: record.status,
          errorClass: record.errorClass ?? null,
        },
      });
    } catch {
      // Intentionally swallowed: DB telemetry failures must never crash
      // the caller. The stdout line is still captured upstream.
    }
  }

  if (process.env["VERCEL"] === "1") return;

  // Best-effort file append — local dev + GitHub Actions.
  try {
    await mkdir(dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, line + "\n", "utf8");
  } catch {
    // Intentionally swallowed: telemetry write failures must never crash
    // the caller. The stdout line is still captured upstream.
  }
}

/**
 * Wrap an Anthropic SDK call with telemetry capture. The callback should
 * return the SDK's Message response (which has the `.usage` field this
 * helper reads). Other return shapes work too — usage just defaults to 0.
 */
export async function withTelemetry<T extends AnthropicMessageShape>(
  ctx: TelemetryContext,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const usage = result.usage ?? {};
    await emit({
      ts: new Date().toISOString(),
      callSite: ctx.callSite,
      model: ctx.model,
      inputTokens: numericOr(usage.input_tokens),
      cacheCreationInputTokens: numericOr(usage.cache_creation_input_tokens),
      cacheReadInputTokens: numericOr(usage.cache_read_input_tokens),
      outputTokens: numericOr(usage.output_tokens),
      latencyMs: Date.now() - start,
      status: "ok",
    });
    return result;
  } catch (err) {
    await emit({
      ts: new Date().toISOString(),
      callSite: ctx.callSite,
      model: ctx.model,
      inputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      status: "error",
      errorClass: err instanceof Error ? err.constructor.name : "Unknown",
    });
    throw err;
  }
}
