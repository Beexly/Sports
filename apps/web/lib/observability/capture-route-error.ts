/**
 * Runtime error capture — zero-dependency interim (ADR 008 Phase 1).
 *
 * Captures unhandled route exceptions and posts structured error reports to the
 * existing health-alert webhook. Designed for 3-route pilot before deciding on
 * a full error-monitoring service.
 *
 * SECURITY: Never logs request bodies, headers, tokens, or user email. Route +
 * error class + stack only.
 */

interface ErrorReport {
  readonly timestamp: string;
  readonly route: string;
  readonly errorClass: string;
  readonly message: string;
  readonly stack: string | null;
  readonly severity: "error" | "critical";
}

const REPORT_RATE_LIMIT_MS = 60_000; // 1 minute
const MAX_REPORTS_PER_WINDOW = 10;

// In-memory rate limiter (per-instance; good enough for interim solution)
const reportCounts = new Map<string, { count: number; resetAt: number }>();

function canReportError(route: string, now = Date.now()): boolean {
  const key = `route-error:${route}`;
  const bucket = reportCounts.get(key);

  if (!bucket || now >= bucket.resetAt) {
    reportCounts.set(key, { count: 1, resetAt: now + REPORT_RATE_LIMIT_MS });
    return true;
  }

  if (bucket.count >= MAX_REPORTS_PER_WINDOW) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * Scrub potentially sensitive data from URLs and messages.
 * Removes query params and common PII patterns.
 */
function scrubSensitiveData(text: string): string {
  return text
    .replace(/([?&])(email|token|key|secret|password|session)=[^&]*/gi, "$1$2=***")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "***@***.***")
    .replace(/\b(sk_live|pk_live|rk_live)_[A-Za-z0-9]+/g, "$1_***");
}

/**
 * Post error report to health-alert webhook (if configured).
 * Returns a Promise that resolves when the webhook call completes.
 */
async function postErrorReport(report: ErrorReport): Promise<void> {
  const webhookUrl = process.env["HEALTH_ALERT_WEBHOOK_URL"];
  if (!webhookUrl) {
    // No webhook configured — log to console as fallback
    console.error("[route-error]", JSON.stringify(report));
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "route-error",
        ...report,
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
  } catch (err) {
    // Webhook post failed — don't throw (would cause recursive error reporting)
    console.error("[route-error] Failed to post to webhook:", err instanceof Error ? err.message : String(err));
  }
}

// Track pending reports for testing
const pendingReports: Promise<void>[] = [];

/**
 * Capture and report a route error.
 *
 * @param error      The caught exception
 * @param route      API route path (e.g., "/api/subscriptions/checkout")
 * @param severity   "error" (non-critical) or "critical" (payment/data loss)
 *
 * USAGE in route handler:
 * ```ts
 * try {
 *   // ... route logic
 * } catch (err) {
 *   captureRouteError(err, "/api/subscriptions/checkout", "critical");
 *   return NextResponse.json({ error: "Internal error" }, { status: 500 });
 * }
 * ```
 */
export function captureRouteError(
  error: unknown,
  route: string,
  severity: "error" | "critical" = "error",
): void {
  if (!canReportError(route)) {
    // Rate limit exceeded — drop the report
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  const report: ErrorReport = {
    timestamp: new Date().toISOString(),
    route: scrubSensitiveData(route),
    errorClass: err.name || "Error",
    message: scrubSensitiveData(err.message || "Unknown error"),
    stack: err.stack ? scrubSensitiveData(err.stack.slice(0, 2000)) : null, // Cap stack at 2K chars
    severity,
  };

  // Fire-and-forget async post (doesn't block the response)
  const promise = postErrorReport(report);
  pendingReports.push(promise);
  promise.finally(() => {
    const idx = pendingReports.indexOf(promise);
    if (idx >= 0) pendingReports.splice(idx, 1);
  });
}

/**
 * Wait for all pending error reports to complete (test-only helper).
 */
export async function flushPendingReports(): Promise<void> {
  await Promise.all(pendingReports);
}

/**
 * Clear rate limiter state (test-only helper).
 */
export function clearRateLimiter(): void {
  reportCounts.clear();
}

/**
 * Wrap a route handler with automatic error capture.
 *
 * @param route     API route path
 * @param handler   The actual route handler
 * @param severity  Error severity for this route
 *
 * USAGE:
 * ```ts
 * export const POST = withErrorCapture(
 *   "/api/subscriptions/checkout",
 *   async (req: NextRequest) => {
 *     // ... your logic
 *     return NextResponse.json({ success: true });
 *   },
 *   "critical"
 * );
 * ```
 */
export function withErrorCapture<T extends (...args: never[]) => Promise<Response>>(
  route: string,
  handler: T,
  severity: "error" | "critical" = "error",
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      captureRouteError(err, route, severity);
      // Re-throw so Next.js error boundaries still work
      throw err;
    }
  }) as T;
}
