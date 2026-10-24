import { describe, expect, it } from "vitest";
import {
  BGE_M3_CONTEXT_TOKENS,
  clampPromptToContext,
  resolveMaxTokens,
} from "./deepseek-recipe-budget.js";
import { openRouterEmbedder } from "../literature/literature-embeddings.js";

describe("deepseek-recipe budget", () => {
  it("refuses a prompt that does not fit", () => {
    const out = resolveMaxTokens({ promptTokens: 8000, contextLimit: 8000 });
    expect(out.refused).toBe(true);
    expect(out.maxTokens).toBe(0);
  });

  it("does not adopt the thinking-mode 65536 default when a cost ceiling is set", () => {
    const out = resolveMaxTokens({
      promptTokens: 100,
      contextLimit: 128000,
      thinking: true,
      effort: "max",
      costCeiling: 1024,
    });
    expect(out.refused).toBe(false);
    expect(out.maxTokens).toBe(1024);
  });

  it("caps embedding input before the paid call", async () => {
    const huge = "x".repeat(BGE_M3_CONTEXT_TOKENS * 4);
    let sent = "";
    const embed = openRouterEmbedder({
      apiKey: "test-key",
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        sent = String(init?.body ?? "");
        return new Response(JSON.stringify({ data: [{ embedding: null }] }), { status: 200 });
      }) as typeof fetch,
    });
    await embed(huge);
    const body = JSON.parse(sent) as { input: string };
    expect(body.input.length).toBe(BGE_M3_CONTEXT_TOKENS * 2);
    expect(clampPromptToContext(huge, BGE_M3_CONTEXT_TOKENS).truncated).toBe(true);
  });
});
