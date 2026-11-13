/**
 * Vercel Cron monitoring WITHOUT withSentryConfig.
 *
 * In @sentry/nextjs 10.76.2 `vercelCronsMonitoring` is NOT a Sentry.init
 * option — it exists only as the build-time flag
 * `withSentryConfig({ _experimental: { vercelCronsMonitoring: true } })`
 * (see node_modules/@sentry/nextjs/build/types/config/types.d.ts, the
 * `_experimental` block). This repo deliberately avoids withSentryConfig /
 * the Sentry webpack plugin, so we enable the SDK's OWN runtime equivalent:
 *
 *  - The build plugin's only job for this flag is injecting
 *    `globalThis._sentryVercelCronsConfig = JSON.stringify(vercel.json crons)`
 *    (build/esm/config/webpack.js, `_sentryVercelCronsConfig` server value).
 *  - The server SDK registers `spanStart -> handleOnSpanStart` and
 *    `spanEnd -> maybeCompleteCronCheckIn` UNCONDITIONALLY
 *    (build/esm/server/index.js). handleOnSpanStart calls
 *    maybeStartCronCheckIn, which reads that global, matches the request
 *    route against a configured cron path when the user-agent contains
 *    "vercel-cron", and emits captureCheckIn(in_progress) followed by
 *    captureCheckIn(ok|error) with the crontab schedule and a 12h maxRuntime.
 *
 * Setting the same global from vercel.json at init time therefore enables
 * the exact documented check-in behaviour with no webpack plugin, no
 * SENTRY_AUTH_TOKEN, and no changes to any cron route handler.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type VercelCron = { path: string; schedule: string };

/**
 * Pure: extract a valid crons array from vercel.json text and return the
 * JSON string the SDK expects, or undefined when nothing usable exists.
 * Invalid entries (missing/blank path or schedule, wrong types) are dropped
 * rather than failing the whole config — a malformed cron must never break
 * startup or disable monitoring for the valid ones.
 */
export function buildVercelCronsConfig(rawJson: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const crons = (parsed as { crons?: unknown }).crons;
  if (!Array.isArray(crons)) return undefined;

  const valid: VercelCron[] = [];
  for (const entry of crons) {
    if (typeof entry !== "object" || entry === null) continue;
    const { path, schedule } = entry as { path?: unknown; schedule?: unknown };
    if (
      typeof path === "string" &&
      path.trim().length > 0 &&
      typeof schedule === "string" &&
      schedule.trim().length > 0
    ) {
      valid.push({ path, schedule });
    }
  }
  return valid.length > 0 ? JSON.stringify(valid) : undefined;
}

/**
 * Server-only: read vercel.json (app dir first — Vercel's rootDirectory —
 * then the monorepo root for local runs) and publish the crons config on
 * globalThis for the SDK's span hooks. Never overwrites a value the build
 * plugin may already have injected. Best-effort: any failure is a silent
 * no-op, exactly like the rest of the observability layer without a DSN.
 */
export function enableVercelCronsMonitoring(): void {
  const g = globalThis as typeof globalThis & {
    _sentryVercelCronsConfig?: string;
  };
  if (g._sentryVercelCronsConfig) return;

  const candidates = [
    join(process.cwd(), "vercel.json"),
    join(process.cwd(), "..", "..", "vercel.json"),
  ];
  for (const file of candidates) {
    try {
      const config = buildVercelCronsConfig(readFileSync(file, "utf8"));
      if (config) {
        g._sentryVercelCronsConfig = config;
        return;
      }
    } catch {
      // Missing/unreadable file — try the next candidate.
    }
  }
}