type LogAttributes = Record<string, string | number | boolean>;

interface QueuedLogRecord {
  readonly body: string;
  readonly attributes: LogAttributes;
  readonly timestampUnixNano: string;
}

const pendingLogs: QueuedLogRecord[] = [];

export const posthogLoggerProvider = {
  serviceName: "sports-web",
};

export function initializePostHogLogCapture(): void {
  // Initialized for serverless OTLP JSON flushing.
}

export function emitPostHogLog(body: string, attributes: LogAttributes = {}): void {
  pendingLogs.push({
    body,
    attributes,
    timestampUnixNano: `${Date.now()}000000`,
  });
}

/** Serverless route handlers must flush before their runtime can freeze. */
export async function flushPostHogLogs(): Promise<void> {
  if (pendingLogs.length === 0) return;
  const batch = pendingLogs.splice(0, pendingLogs.length);
  const projectToken =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!projectToken) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  try {
    await fetch(`${host.replace(/\/$/, "")}/i/v1/logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${projectToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resourceLogs: [
          {
            resource: {
              attributes: [{ key: "service.name", value: { stringValue: "sports-web" } }],
            },
            scopeLogs: [
              {
                scope: { name: "sports-web-posthog" },
                logRecords: batch.map((item) => ({
                  timeUnixNano: item.timestampUnixNano,
                  severityNumber: 9,
                  severityText: "INFO",
                  body: { stringValue: item.body },
                  attributes: Object.entries(item.attributes).map(([k, v]) => ({
                    key: k,
                    value: { stringValue: String(v) },
                  })),
                })),
              },
            ],
          },
        ],
      }),
    });
  } catch {
    // Observability delivery must never affect the request's product outcome.
  }
}
