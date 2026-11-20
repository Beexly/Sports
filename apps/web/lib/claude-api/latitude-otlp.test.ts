import { describe, expect, it, vi } from "vitest";
import {
  LATITUDE_OTLP_TRACES_URL,
  buildLatitudeOtlpPayload,
  flushLatitudeTraces,
  isLatitudeTelemetryConfigured,
  recordLatitudeGenAiSpan,
} from "./latitude-otlp";

describe("latitude-otlp", () => {
  it("stays a strict no-op when LATITUDE_API_KEY or LATITUDE_PROJECT_SLUG is missing", async () => {
    const fetchMock = vi.fn();
    expect(isLatitudeTelemetryConfigured({})).toBe(false);
    expect(isLatitudeTelemetryConfigured({ LATITUDE_API_KEY: "only-key" })).toBe(false);

    await recordLatitudeGenAiSpan(
      {
        model: "claude-sonnet-4-6",
        provider: "anthropic",
        systemPrompt: "sys",
        userPrompt: "usr",
        completionText: "ok",
        inputTokens: 10,
        outputTokens: 5,
        durationMs: 42,
      },
      {},
      fetchMock as unknown as typeof fetch,
    );
    await flushLatitudeTraces();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds valid OTLP GenAI spans with token, model, and prompt/completion attributes", () => {
    const payload = buildLatitudeOtlpPayload({
      model: "claude-sonnet-4-6",
      responseModel: "claude-sonnet-4-6",
      provider: "bedrock",
      surface: "brief",
      systemPrompt: "System instruction",
      userPrompt: "User query",
      completionText: "Generated response",
      inputTokens: 120,
      outputTokens: 45,
      durationMs: 250,
      startedAtMs: 1_763_560_000_000,
    });

    const resourceSpan = payload.resourceSpans[0]!;
    const span = resourceSpan.scopeSpans[0]!.spans[0]!;
    expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(span.name).toBe("gen_ai.chat brief");
    expect(span.status.code).toBe(1);

    const attrMap = new Map(
      span.attributes.map((a) => [a.key, "stringValue" in a.value ? a.value.stringValue : a.value.intValue]),
    );
    expect(attrMap.get("gen_ai.system")).toBe("anthropic");
    expect(attrMap.get("gen_ai.request.model")).toBe("claude-sonnet-4-6");
    expect(attrMap.get("gen_ai.usage.input_tokens")).toBe("120");
    expect(attrMap.get("gen_ai.usage.output_tokens")).toBe("45");
    expect(attrMap.get("gse.provider")).toBe("bedrock");
    expect(attrMap.get("gse.surface")).toBe("brief");
    expect(attrMap.get("gen_ai.completion.0.content")).toBe("Generated response");
  });

  it("posts OTLP payload with Bearer auth and X-Latitude-Project header and flushes cleanly", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    await recordLatitudeGenAiSpan(
      {
        model: "claude-sonnet-4-6",
        provider: "anthropic",
        surface: "article",
        systemPrompt: "S",
        userPrompt: "U",
        completionText: "C",
        inputTokens: 8,
        outputTokens: 4,
        durationMs: 18,
      },
      {
        LATITUDE_API_KEY: "test-lat-key",
        LATITUDE_PROJECT_SLUG: "gse-claude-content",
      },
      fetchMock as unknown as typeof fetch,
    );
    await flushLatitudeTraces();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(LATITUDE_OTLP_TRACES_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer test-lat-key",
      "X-Latitude-Project": "gse-claude-content",
    });
  });

  it("swallows OTLP network errors so telemetry never breaks callers", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(
      recordLatitudeGenAiSpan(
        {
          model: "claude-sonnet-4-6",
          provider: "anthropic",
          systemPrompt: "S",
          userPrompt: "U",
          inputTokens: 0,
          outputTokens: 0,
          durationMs: 5,
          errorMessage: "upstream fail",
        },
        {
          LATITUDE_API_KEY: "test-lat-key",
          LATITUDE_PROJECT_SLUG: "gse-claude-content",
        },
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toBeUndefined();
    await flushLatitudeTraces();
  });
});
