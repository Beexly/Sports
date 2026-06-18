import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callViaPool,
  PoolExhaustedError,
  __resetPoolStateForTests,
} from "@/lib/claude-api/provider-pool";

const REQ = { system: "S", user: "U", maxTokens: 100 } as const;

function openAiOk(text: string, model = "x") {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
      model,
    }),
    { status: 200 }
  );
}

function anthropicOk() {
  return new Response(
    JSON.stringify({
      content: [{ type: "text", text: "Anthropic text" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    { status: 200 }
  );
}

/** Maps the request URL → the registry provider id so assertions read clearly. */
function idForUrl(url: string): string {
  if (url.includes("pollinations")) return "pollinations";
  if (url.includes("cerebras")) return "cerebras";
  if (url.includes("groq")) return "groq";
  if (url.includes("deepseek")) return "deepseek";
  if (url.includes("openrouter")) return "openrouter";
  if (url.includes("together")) return "together";
  if (url.includes("generativelanguage")) return "gemini";
  if (url.includes("anthropic")) return "anthropic";
  return "unknown";
}

function urlsOf(fetchImpl: ReturnType<typeof vi.fn>): string[] {
  return (fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>).map((c) => c[0]);
}

describe("provider pool — keyless default + rotation + failover", () => {
  beforeEach(() => __resetPoolStateForTests());
  afterEach(() => __resetPoolStateForTests());

  it("answers with ZERO paid key via the keyless provider (empty env)", async () => {
    const fetchImpl = vi.fn(async () => openAiOk("keyless answer"));
    const result = await callViaPool(REQ, {
      env: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.text).toBe("keyless answer");
    // Pollinations (keyless), no Anthropic involved.
    expect(idForUrl(urlsOf(fetchImpl)[0]!)).toBe("pollinations");
    // No Authorization header on the keyless call.
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = firstCall[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("records the REAL provider/model used (for the cost ledger)", async () => {
    const fetchImpl = vi.fn(async () => openAiOk("answer"));
    const result = await callViaPool(REQ, {
      env: { GROQ_API_KEY: "g" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    // modelName is the real registry model id of whichever provider answered.
    const answeredId = idForUrl(urlsOf(fetchImpl).at(-1)!);
    const modelById: Record<string, string> = {
      pollinations: "openai",
      groq: "llama-3.3-70b-versatile",
    };
    expect(result.modelName).toBe(modelById[answeredId]);
  });

  it("rotates the start provider across calls to spread load", async () => {
    // Two keyed providers + keyless = 3 available. The rotating start index
    // should advance so the first-tried provider differs across calls.
    const env = { GROQ_API_KEY: "g", CEREBRAS_API_KEY: "c" };
    const firstTried: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const fetchImpl = vi.fn(async () => openAiOk("ok"));
      await callViaPool(REQ, { env, fetchImpl: fetchImpl as unknown as typeof fetch });
      firstTried.push(idForUrl(urlsOf(fetchImpl)[0]!));
    }
    // Over 3 calls with 3 providers the first-tried id should not be constant.
    expect(new Set(firstTried).size).toBeGreaterThan(1);
  });

  it("fails over to the next provider on an error", async () => {
    const env = { GROQ_API_KEY: "g", CEREBRAS_API_KEY: "c" };
    const fetchImpl = vi.fn(async (url: string) => {
      // Fail the keyless provider, succeed on the next.
      if (idForUrl(url) === "pollinations") return new Response("down", { status: 500 });
      return openAiOk("recovered");
    }) as unknown as ReturnType<typeof vi.fn>;
    const result = await callViaPool(REQ, {
      env,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.text).toBe("recovered");
    expect(idForUrl(urlsOf(fetchImpl)[0]!)).toBe("pollinations");
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to Anthropic when every free provider fails and a key is set", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (idForUrl(url) === "anthropic") return anthropicOk();
      return new Response("down", { status: 503 });
    }) as unknown as ReturnType<typeof vi.fn>;
    const result = await callViaPool(REQ, {
      env: { ANTHROPIC_API_KEY: "an", GROQ_API_KEY: "g" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.text).toBe("Anthropic text");
    expect(urlsOf(fetchImpl).some((u) => idForUrl(u) === "anthropic")).toBe(true);
  });

  it("throws PoolExhaustedError when all providers fail and no Anthropic key", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 500 }));
    await expect(
      callViaPool(REQ, {
        env: { GROQ_API_KEY: "g" },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(PoolExhaustedError);
  });

  it("never fabricates: PoolExhaustedError records the attempted providers", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 500 }));
    let caught: PoolExhaustedError | null = null;
    try {
      await callViaPool(REQ, {
        env: { GROQ_API_KEY: "g", CEREBRAS_API_KEY: "c" },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
    } catch (e) {
      caught = e as PoolExhaustedError;
    }
    expect(caught).toBeInstanceOf(PoolExhaustedError);
    expect(caught!.attempts.length).toBeGreaterThanOrEqual(3); // keyless + 2 keyed
    for (const a of caught!.attempts) expect(a.reason).toMatch(/HTTP_500|HTTP_0|Error/);
  });

  it("marks an unhealthy provider and prefers healthy ones on the next call", async () => {
    const env = { GROQ_API_KEY: "g", CEREBRAS_API_KEY: "c" };
    const now = () => 1_000;
    // First call: keyless fails, marking it unhealthy (cooldown not elapsed).
    const fetchA = vi.fn(async (url: string) => {
      if (idForUrl(url) === "pollinations") return new Response("down", { status: 500 });
      return openAiOk("ok");
    }) as unknown as ReturnType<typeof vi.fn>;
    await callViaPool(REQ, { env, fetchImpl: fetchA as unknown as typeof fetch, now });

    // Second call within cooldown: the unhealthy keyless provider should be tried
    // LAST (deprioritized), so a healthy provider answers without hitting it first.
    const fetchB = vi.fn(async () => openAiOk("ok2"));
    await callViaPool(REQ, { env, fetchImpl: fetchB as unknown as typeof fetch, now });
    expect(idForUrl(urlsOf(fetchB)[0]!)).not.toBe("pollinations");
  });
});
