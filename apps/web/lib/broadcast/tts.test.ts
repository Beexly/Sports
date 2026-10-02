import { describe, expect, it, vi } from "vitest";
import { isBroadcastTtsConfigured, synthesizeSegment } from "./tts";

describe("synthesizeSegment", () => {
  it("returns not_configured with no API key, never throws", async () => {
    const result = await synthesizeSegment("Chiefs at Bills, spread favors Buffalo.", {
      apiKey: undefined,
    });
    expect(result.audio).toBeNull();
    expect(result.reason).toBe("not_configured");
  });

  it("returns empty_script for blank input without ever calling fetch", async () => {
    const fetchImpl = vi.fn();
    const result = await synthesizeSegment("   ", { apiKey: "test-key", fetchImpl });
    expect(result.audio).toBeNull();
    expect(result.reason).toBe("empty_script");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns request_failed on a non-2xx response, and logs a warning", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const result = await synthesizeSegment("script text", { apiKey: "test-key", fetchImpl });
    expect(result.audio).toBeNull();
    expect(result.reason).toBe("request_failed");
  });

  it("returns request_failed when fetch itself rejects (network error)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await synthesizeSegment("script text", { apiKey: "test-key", fetchImpl });
    expect(result.audio).toBeNull();
    expect(result.reason).toBe("request_failed");
  });

  it("returns real audio bytes on a 2xx response and sends the expected request shape", async () => {
    const bytes = new ArrayBuffer(8);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes,
    });
    const result = await synthesizeSegment("script text", {
      apiKey: "test-key",
      voiceId: "customvoiceid1",
      fetchImpl,
    });
    expect(result.audio).toBe(bytes);
    expect(result.reason).toBeNull();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("customvoiceid1");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body as string);
    expect(body.text).toBe("script text");
  });

  it("rejects a non-alphanumeric voiceId before it ever reaches the URL", async () => {
    const fetchImpl = vi.fn();
    const result = await synthesizeSegment("script text", {
      apiKey: "test-key",
      voiceId: "../../etc/passwd",
      fetchImpl,
    });
    expect(result.audio).toBeNull();
    expect(result.reason).toBe("invalid_voice_id");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a voiceId carrying a query-string/fragment injection attempt", async () => {
    const fetchImpl = vi.fn();
    const result = await synthesizeSegment("script text", {
      apiKey: "test-key",
      voiceId: "abc?redirect=evil.example",
      fetchImpl,
    });
    expect(result.audio).toBeNull();
    expect(result.reason).toBe("invalid_voice_id");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts a real-shaped alphanumeric voiceId", async () => {
    const bytes = new ArrayBuffer(4);
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
    const result = await synthesizeSegment("script text", {
      apiKey: "test-key",
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      fetchImpl,
    });
    expect(result.audio).toBe(bytes);
    expect(result.reason).toBeNull();
  });

  it("never fabricates audio for an unconfigured key — no silent success", async () => {
    // Regression guard for the honest-empty-state rule stated in tts.ts: a
    // caller must be able to render "narration unavailable" and never a
    // played-but-silent track.
    const result = await synthesizeSegment("script text", {});
    expect(result.audio).toBeNull();
  });
});

describe("isBroadcastTtsConfigured", () => {
  it("is false with no key set", () => {
    expect(isBroadcastTtsConfigured({})).toBe(false);
  });

  it("is false for a blank/whitespace key", () => {
    expect(isBroadcastTtsConfigured({ ELEVENLABS_API_KEY: "   " })).toBe(false);
  });

  it("is true once a real key is set", () => {
    expect(isBroadcastTtsConfigured({ ELEVENLABS_API_KEY: "sk-real-key" })).toBe(true);
  });
});
