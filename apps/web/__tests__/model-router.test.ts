import { describe, it, expect, afterEach } from "vitest";
import {
  MODELS,
  ALL_SURFACES,
  pickModelForSurface,
  resolveModelCatalog,
  maxTokensForSurface,
  SURFACE_MAX_TOKENS,
} from "@/lib/claude-api/model-router";
import {
  callClaudeMessages,
  parseAnthropicUsage,
  buildSystemField,
} from "@/lib/claude-api/messages";
import { estimateClaudeCostUsd, cacheHitRate } from "@/lib/claude-api/cost-monitor";

function capturingFetch(captured: { body?: string }, usage?: Record<string, number>): typeof fetch {
  return (async (_url: string, init: { body: string }) => {
    captured.body = init.body;
    return new Response(
      JSON.stringify({
        content: [{ type: "text", text: "ok" }],
        usage: {
          input_tokens: usage?.input_tokens ?? 1,
          output_tokens: usage?.output_tokens ?? 1,
          ...(usage?.cache_creation_input_tokens !== undefined
            ? { cache_creation_input_tokens: usage.cache_creation_input_tokens }
            : {}),
          ...(usage?.cache_read_input_tokens !== undefined
            ? { cache_read_input_tokens: usage.cache_read_input_tokens }
            : {}),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as unknown as typeof fetch;
}

describe("model router", () => {
  const saved = { ...process.env };

  afterEach(() => {
    for (const k of ["MODEL_PRIMARY", "MODEL_CHEAP", "MODEL_OPUS", "CLAUDE_MODEL_PRIMARY", "CLAUDE_MODEL_CHEAP", "CLAUDE_MODEL_OPUS"]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("exposes the 2026 tier ids", () => {
    expect(MODELS.haiku).toBe("claude-haiku-4-5-20251001");
    expect(MODELS.sonnet).toBe("claude-sonnet-4-6");
    expect(MODELS.opus).toBe("claude-opus-4-8");
  });

  it("routes surfaces to the validated tier (Haiku flips active for calibration-insight + brief)", () => {
    delete process.env.MODEL_PRIMARY;
    delete process.env.MODEL_CHEAP;
    delete process.env.CLAUDE_MODEL_PRIMARY;
    delete process.env.CLAUDE_MODEL_CHEAP;
    expect(ALL_SURFACES.length).toBeGreaterThan(0);
    const HAIKU_SURFACES = new Set(["calibration-insight", "brief"]);
    for (const surface of ALL_SURFACES) {
      const expected = HAIKU_SURFACES.has(surface) ? MODELS.haiku : MODELS.sonnet;
      expect(pickModelForSurface(surface)).toBe(expected);
    }
  });

  it("env MODEL_PRIMARY / MODEL_CHEAP override catalog only when set", () => {
    const base = resolveModelCatalog({});
    expect(base.sonnet).toBe(MODELS.sonnet);
    expect(base.haiku).toBe(MODELS.haiku);

    const over = resolveModelCatalog({
      MODEL_PRIMARY: "claude-sonnet-custom",
      MODEL_CHEAP: "claude-haiku-custom",
    });
    expect(over.sonnet).toBe("claude-sonnet-custom");
    expect(over.haiku).toBe("claude-haiku-custom");
    expect(over.opus).toBe(MODELS.opus);

    const opusOver = resolveModelCatalog({ MODEL_OPUS: "claude-opus-market-custom" });
    expect(opusOver.opus).toBe("claude-opus-market-custom");
    expect(opusOver.sonnet).toBe(MODELS.sonnet);
  });

  it("clamps max_tokens to surface ceilings", () => {
    expect(maxTokensForSurface("brief", 99999)).toBe(SURFACE_MAX_TOKENS.brief);
    expect(maxTokensForSurface("calibration-insight", 50)).toBe(50);
    expect(maxTokensForSurface("studio")).toBe(SURFACE_MAX_TOKENS.studio);
    expect(maxTokensForSurface(undefined, 5000)).toBe(2048);
  });
});

describe("callClaudeMessages — surface routing + prompt caching", () => {
  it("defaults to a plain-string system prompt (byte-identical to prior behavior)", async () => {
    const captured: { body?: string } = {};
    await callClaudeMessages({
      apiKey: "k",
      system: "SYS",
      user: "U",
      maxTokens: 10,
      fetchImpl: capturingFetch(captured),
    });
    const body = JSON.parse(captured.body!);
    expect(body.system).toBe("SYS");
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  it("sends an ephemeral cache_control block only when cache.system is set", async () => {
    const captured: { body?: string } = {};
    await callClaudeMessages({
      apiKey: "k",
      system: "SYS",
      user: "U",
      maxTokens: 10,
      cache: { system: true },
      fetchImpl: capturingFetch(captured),
    });
    const body = JSON.parse(captured.body!);
    expect(body.system).toEqual([
      { type: "text", text: "SYS", cache_control: { type: "ephemeral" } },
    ]);
  });

  it("resolves the model from `surface` when no explicit model is given", async () => {
    const captured: { body?: string } = {};
    await callClaudeMessages({
      apiKey: "k",
      system: "SYS",
      user: "U",
      maxTokens: 10,
      surface: "model-court",
      fetchImpl: capturingFetch(captured),
    });
    const body = JSON.parse(captured.body!);
    expect(body.model).toBe(MODELS.sonnet);
  });

  it("surfaces cache create/read tokens on the result", async () => {
    const captured: { body?: string } = {};
    const result = await callClaudeMessages({
      apiKey: "k",
      system: "SYS",
      user: "U",
      maxTokens: 10,
      cache: { system: true },
      fetchImpl: capturingFetch(captured, {
        input_tokens: 20,
        output_tokens: 5,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 0,
      }),
    });
    expect(result.cacheCreationInputTokens).toBe(2000);
    expect(result.cacheReadInputTokens).toBe(0);
    expect(result.inputTokens).toBe(20);
  });

  it("buildSystemField + parseAnthropicUsage helpers are pure", () => {
    expect(buildSystemField("S")).toBe("S");
    expect(buildSystemField("S", { system: true })).toEqual([
      { type: "text", text: "S", cache_control: { type: "ephemeral" } },
    ]);
    expect(parseAnthropicUsage({ input_tokens: 1, cache_read_input_tokens: 9 })).toEqual({
      inputTokens: 1,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 9,
    });
  });

  it("prices cache reads cheaper than uncached input", () => {
    const uncached = estimateClaudeCostUsd(10_000, 0);
    const cached = estimateClaudeCostUsd(0, 0, undefined, {
      cacheReadInputTokens: 10_000,
    });
    expect(cached).toBeLessThan(uncached);
    expect(cacheHitRate({ inputTokens: 100, cacheCreationInputTokens: 0, cacheReadInputTokens: 900 })).toBeCloseTo(
      0.9,
    );
  });
});
