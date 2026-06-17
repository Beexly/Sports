/**
 * Dead-man's-switch ping helper (Healthchecks.io-style).
 *
 * A job calls this to tell an external "did the cron actually run?" monitor
 * that it started / succeeded / failed. The monitor pages a human only when an
 * EXPECTED ping does not arrive in time — so it catches a refresh job that
 * silently stopped running (the case in-process health checks can never see,
 * because a dead job emits nothing).
 *
 * Protocol (Healthchecks.io and compatible services):
 *   - success → GET  <pingUrl>
 *   - start   → GET  <pingUrl>/start
 *   - fail    → GET  <pingUrl>/fail
 *
 * SAFETY CONTRACT:
 *   - If `pingUrl` is falsy, this is a COMPLETE no-op (does not touch the
 *     network). In production it stays a no-op until the env var is set, so
 *     wiring it in ships zero behavior change.
 *   - It NEVER throws. All network/abort errors are swallowed. Telemetry must
 *     never be able to break the job it is observing.
 *   - The fetch is ALWAYS bounded. If the caller does not supply its own
 *     AbortSignal, an internal 5s timeout (`AbortSignal.timeout`) is used so a
 *     stalled Healthchecks.io endpoint or DNS hang can never block the calling
 *     cron up to its maxDuration. A resulting AbortError is swallowed like any
 *     other network error.
 *
 * Kept generic (takes the URL directly, no env read) so it is trivially
 * unit-testable and reusable for other jobs (settlement, content, etc.).
 */

export type HealthcheckSignal = "start" | "success" | "fail";

export async function pingHealthcheck(
  pingUrl: string | undefined,
  signal: HealthcheckSignal = "success",
  fetchSignal?: AbortSignal,
): Promise<void> {
  if (!pingUrl) return; // env-gated no-op

  const suffix = signal === "success" ? "" : `/${signal}`;
  const url = `${pingUrl}${suffix}`;

  // Bound the request: use the caller's signal if provided, otherwise an
  // internal 5s timeout so a stalled endpoint/DNS can never hang the caller.
  const abortSignal = fetchSignal ?? AbortSignal.timeout(5000);

  try {
    await fetch(url, { method: "GET", signal: abortSignal });
  } catch {
    // Swallow ALL errors (including AbortError on timeout) — a monitoring ping
    // must never break the job.
  }
}
