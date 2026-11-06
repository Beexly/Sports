import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if ((!projectToken || !host) && process.env.NODE_ENV === "development") {
  const missingVariable = !projectToken
    ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
    : "NEXT_PUBLIC_POSTHOG_HOST";
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export const posthogLoggerProvider =
  projectToken && host
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "sports-web" }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${host.replace(/\/$/, "")}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${projectToken}`,
                "Content-Type": "application/json",
              },
            }),
          }),
        ],
      })
    : null;

const posthogLogger = posthogLoggerProvider?.getLogger("sports-web-posthog") ?? null;

type LogAttributes = Record<string, string | number | boolean>;

export function initializePostHogLogCapture(): void {
  if (posthogLoggerProvider) logs.setGlobalLoggerProvider(posthogLoggerProvider);
}

export function emitPostHogLog(body: string, attributes: LogAttributes = {}): void {
  posthogLogger?.emit({
    body,
    severityNumber: SeverityNumber.INFO,
    attributes,
  });
}

/** Serverless route handlers must flush before their runtime can freeze. */
export async function flushPostHogLogs(): Promise<void> {
  try {
    await posthogLoggerProvider?.forceFlush();
  } catch {
    // Observability delivery must never affect the request's product outcome.
  }
}
