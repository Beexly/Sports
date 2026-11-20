import { randomBytes } from "node:crypto";

export const LATITUDE_OTLP_TRACES_URL = "https://ingest.latitude.so/v1/traces";

type EnvMap = Record<string, string | undefined>;

export interface LatitudeGenAiSpanInput {
  readonly model: string;
  readonly responseModel?: string;
  readonly provider: "bedrock" | "azure" | "vertex" | "anthropic";
  readonly surface?: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly completionText?: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
  readonly errorMessage?: string;
  readonly startedAtMs?: number;
}

const pendingExports = new Set<Promise<void>>();

export function isLatitudeTelemetryConfigured(env: EnvMap = process.env): boolean {
  return Boolean(env.LATITUDE_API_KEY?.trim() && env.LATITUDE_PROJECT_SLUG?.trim());
}

function otlpStringAttr(key: string, value: string) {
  return { key, value: { stringValue: value } };
}

function otlpIntAttr(key: string, value: number) {
  return { key, value: { intValue: String(Math.max(0, Math.trunc(value))) } };
}

export function buildLatitudeOtlpPayload(input: LatitudeGenAiSpanInput) {
  const endMs = (input.startedAtMs ?? Date.now()) + Math.max(1, input.durationMs);
  const startMs = Math.max(0, endMs - Math.max(1, input.durationMs));
  const startNano = `${BigInt(Math.trunc(startMs)) * 1_000_000n}`;
  const endNano = `${BigInt(Math.trunc(endMs)) * 1_000_000n}`;
  const traceId = randomBytes(16).toString("hex");
  const spanId = randomBytes(8).toString("hex");

  const attributes = [
    otlpStringAttr("gen_ai.system", "anthropic"),
    otlpStringAttr("gen_ai.operation.name", "chat"),
    otlpStringAttr("gen_ai.request.model", input.model),
    otlpStringAttr("gen_ai.response.model", input.responseModel ?? input.model),
    otlpIntAttr("gen_ai.usage.input_tokens", input.inputTokens),
    otlpIntAttr("gen_ai.usage.output_tokens", input.outputTokens),
    otlpStringAttr("gse.provider", input.provider),
    otlpStringAttr("gen_ai.prompt.0.role", "system"),
    otlpStringAttr("gen_ai.prompt.0.content", input.systemPrompt),
    otlpStringAttr("gen_ai.prompt.1.role", "user"),
    otlpStringAttr("gen_ai.prompt.1.content", input.userPrompt),
  ];

  if (input.surface) {
    attributes.push(otlpStringAttr("gse.surface", input.surface));
  }
  if (input.completionText !== undefined) {
    attributes.push(otlpStringAttr("gen_ai.completion.0.role", "assistant"));
    attributes.push(otlpStringAttr("gen_ai.completion.0.content", input.completionText));
  }
  if (input.errorMessage) {
    attributes.push(otlpStringAttr("error.message", input.errorMessage));
  }

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            otlpStringAttr("service.name", "gse-web"),
            otlpStringAttr("telemetry.sdk.name", "gse-latitude-otlp"),
          ],
        },
        scopeSpans: [
          {
            scope: {
              name: "gse-claude-api",
              version: "1.0.0",
            },
            spans: [
              {
                traceId,
                spanId,
                name: input.surface ? `gen_ai.chat ${input.surface}` : "gen_ai.chat",
                kind: 3,
                startTimeUnixNano: startNano,
                endTimeUnixNano: endNano,
                attributes,
                status: input.errorMessage
                  ? { code: 2, message: input.errorMessage }
                  : { code: 1 },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function recordLatitudeGenAiSpan(
  input: LatitudeGenAiSpanInput,
  env: EnvMap = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!isLatitudeTelemetryConfigured(env)) {
    return Promise.resolve();
  }

  const apiKey = env.LATITUDE_API_KEY!.trim();
  const projectSlug = env.LATITUDE_PROJECT_SLUG!.trim();
  const payload = buildLatitudeOtlpPayload(input);

  const exportPromise = (async () => {
    try {
      await fetchImpl(LATITUDE_OTLP_TRACES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Latitude-Project": projectSlug,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Telemetry export must never break caller execution.
    }
  })();

  pendingExports.add(exportPromise);
  void exportPromise.finally(() => {
    pendingExports.delete(exportPromise);
  });

  return exportPromise;
}

export async function flushLatitudeTraces(): Promise<void> {
  if (pendingExports.size === 0) return;
  await Promise.allSettled([...pendingExports]);
}
