import { describe, expect, it, vi, afterEach } from "vitest";
import { logClaudeCallToHelicone, type HeliconeClaudeLogParams } from "./helicone-logger";

const baseParams: HeliconeClaudeLogParams = {
  modelName: "claude-sonnet-4-6",
  system: "S",
  user: "U",
  responseText: "response text",
  inputTokens: 10,
  outputTokens: 20,
  startedAtMs: 1_000,
  completedAtMs: 1_500,
  status: 200,
};

describe("logClaudeCallToHelicone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a complete no-op when HELICONE_API_KEY is unset — never calls fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await logClaudeCallToHelicone(baseParams, {});

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the documented shape to the default Helicone endpoint when the key is set", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200 }) as unknown as Response);
    vi.stubGlobal("fetch", fetchSpy);

    await logClaudeCallToHelicone(baseParams, { HELICONE_API_KEY: "sk-helicone-test" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.worker.helicone.ai/custom/v1/log");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-helicone-test");

    const body = JSON.parse(init.body as string);
    expect(body.providerRequest.json.model).toBe("claude-sonnet-4-6");
    expect(body.providerRequest.json.messages).toEqual([{ role: "user", content: "U" }]);
    expect(body.providerResponse.json.content).toEqual([{ type: "text", text: "response text" }]);
    expect(body.providerResponse.json.usage).toEqual({ input_tokens: 10, output_tokens: 20 });
    expect(body.providerResponse.status).toBe(200);
    expect(body.timing.startTime).toEqual({ seconds: 1, milliseconds: 0 });
    expect(body.timing.endTime).toEqual({ seconds: 1, milliseconds: 500 });
  });

  it("respects a HELICONE_LOG_URL override", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200 }) as unknown as Response);
    vi.stubGlobal("fetch", fetchSpy);

    await logClaudeCallToHelicone(baseParams, {
      HELICONE_API_KEY: "sk-helicone-test",
      HELICONE_LOG_URL: "https://api.eu.helicone.ai/custom/v1/log",
    });

    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe("https://api.eu.helicone.ai/custom/v1/log");
  });

  it("fails open — a thrown fetch error never propagates", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(logClaudeCallToHelicone(baseParams, { HELICONE_API_KEY: "sk-helicone-test" })).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
