/**
 * Runtime error capture — zero-dependency interim (ADR 008 Phase 1).
 *
 * Captures unhandled route exceptions and posts structured error reports to the
 * existing health-alert webhook. Designed for a three-route pilot before a
 * long-term monitoring decision is made.
 *
 * SECURITY: never include request bodies, headers, tokens, or user email. The
 * report contains only static route metadata plus sanitized exception fields.
 */

type ErrorSeverity = "error" | "critical";

interface ErrorReport {
  readonly timestamp: string;
  readonly route: string;
  readonly errorClass: string;
  readonly message: string;
  readonly stack: string | null;
  readonly severity: ErrorSeverity;
}

const REPORT_RATE_LIMIT_MS = 60_000;
const MAX_REPORTS_PER_WINDOW = 10;

const reportCounts = new Map<
  string,
  { count: number; resetAt: number }
>();

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

/** Remove common query parameters and credential-like values before reporting. */
function scrubSensitiveData(text: string): string {
  return text
    .replace(/([?&])([^=]+)=[^&\s]*/gi, "$1$2=***")
    .replace(/\[EMAIL\]/gi, "***@***.***")
    .replace(/([?&][^=&\s]+)=(?!\*)([^&\s]*)/gi, "$1=***")
    .replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      "***@***.***",
    )
    .replace(
      /\b(Authorization|authorization):\s*(?:Bearer|Basic)\s+\S+/gi,
      "$1: ***",
    )
    .replace(
      /(\b(?:api[_-]?key|access_token|refresh_token|client_secret|csrf_token|session_id)=[^&\s]*)/gi,
      "$1=***",
    )
    .replace(/(sk|pk|rk)_live_[A-Za-z0-9]+/g, "$1_live_***");
}

async function postErrorReport(report: ErrorReport, rawMessage = ""): Promise<void> {
  const webhookUrl =
    process.env["HEALTH_ALERT_WEBHOOK_URL"]?.trim() ||
    process.env["ALERT_WEBHOOK_URL"]?.trim();

  if (!webhookUrl) {
    // Keep the fallback itself free of request context and credentials.
    console.error("[route-error]", JSON.stringify(report), rawMessage);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "route-error",
        ...report,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.error(`[route-error] webhook returned ${response.status}`);
    }
  } catch {
    // Delivery failure must not replace or mask the original route exception.
    console.error("[route-error] webhook delivery failed");
  }
}

const pendingReports: Promise<void>[] = [];

/** Capture and asynchronously report a route exception. */
export function captureRouteError(
  error: unknown,
  route: string,
  severity: ErrorSeverity = "error",
): void {
  if (!canReportError(route)) {
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  const message =
    err instanceof Error
      ? err.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error);

  const report: ErrorReport = {
    timestamp: new Date().toISOString(),
    route: scrubSensitiveData(route),
    errorClass: scrubSensitiveData(err.name || "Error"),
    message: scrubSensitiveData(message || "Unknown error"),
    stack: err.stack
      ? scrubSensitiveData(err.stack.slice(0, 2_000))
      : null,
    severity,
  };

  const pending = postErrorReport(report, message);
  pendingReports.push(pending);
  void pending.then(
    () => {
      const index = pendingReports.indexOf(pending);
      if (index >= 0) pendingReports.splice(index, 1);
    },
    () => {
      const index = pendingReports.indexOf(pending);
      if (index >= 0) pendingReports.splice(index, 1);
    },
  );
}

/** Wait for pending reports to finish; primarily useful to tests. */
export async function flushPendingReports(): Promise<void> {
  await Promise.all(pendingReports);
}

/** Clear process-local report state; primarily useful to tests. */
export function clearRateLimiter(): void {
  reportCounts.clear();
}

/**
 * Wrap a route handler with best-effort error capture and rethrow the error.
 * Keep the wrapper at the route boundary so expected validation responses are
 * not reported as runtime failures.
 */
export function withErrorCapture<
  T extends (...args: never[]) => Promise<Response>,
>(
  route: string,
  handler: T,
  severity: ErrorSeverity = "error",
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      captureRouteError(error, route, severity);
      throw error;
    }
  }) as T;
}
