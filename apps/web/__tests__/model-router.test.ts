import { describe, it, expect } from "vitest";
import { MODELS, ALL_SURFACES, pickModelForSurface, SURFACE_RECOMMENDED } from "@/lib/claude-api/model-router";
import { callClaudeMessages } from "@/lib/claude-api/messages";

function capturingFetch(captured: { body?: string }): typeof fetch {
  return (async (_url: string, init: { body: string }) => {
    captured.body = init.body;
    return new Response(
      JSON.stringify({
        content: [{ type: "text", text: "ok" }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as unknown as typeof fetch;
}

describe("model router", () => {
  it("exposes the 2026 tier ids", () => {
    expect(MODELS.haiku).toBe("claude-haiku-4-5-20251001");
    expect(MODELS.sonnet).toBe("claude-sonnet-4-6");
    expect(MODELS.opus).toBe("claude-opus-4-8");
  });

  it("routes surfaces to their active tier (calibration-insight + brief flipped to Haiku on 2026-06-15)", () => {
    expect(ALL_SURFACES.length).toBeGreaterThan(0);
    // Surfaces with deliberate Haiku flips (cost-saving, validated short structured outputs)
    const haikuSurfaces = new Set<string>(["calibration-insight", "brief"]);
    for (const surface of ALL_SURFACES) {
      const expected = haikuSurfaces.has(surface) ? MODELS.haiku : MODELS.sonnet;
      expect(pickModelForSurface(surface)).toBe(expected);
    }
  });

  it("SURFACE_RECOMMENDED documents the validated target tier per surface", () => {
    expect(SURFACE_RECOMMENDED["calibration-insight"]).toBe("haiku");
    expect(SURFACE_RECOMMENDED["brief"]).toBe("haiku");
    expect(SURFACE_RECOMMENDED["model-court"]).toBe("opus");
    expect(SURFACE_RECOMMENDED["studio"]).toBe("sonnet");
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
});
