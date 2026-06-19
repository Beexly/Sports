import { describe, expect, it, vi } from "vitest";
import {
  synthesizeSpeech,
  normalizeVoice,
  isTtsProviderAvailable,
  MAX_TTS_CHARS,
  DEFAULT_VOICE,
  TTS_PROVIDERS,
  type TtsProvider,
} from "@/lib/voice/tts-pool";

function audioResponse(bytes = new Uint8Array([1, 2, 3, 4])): Response {
  return new Response(bytes, { status: 200, headers: { "Content-Type": "audio/mpeg" } });
}

const KEYLESS: TtsProvider = {
  id: "alpha",
  label: "Alpha (keyless)",
  url: "https://alpha.example/v1/audio/speech",
  keyless: true,
  contentType: "audio/mpeg",
  buildBody: (text, voice) => JSON.stringify({ input: text, voice }),
};

const KEYED: TtsProvider = {
  id: "beta",
  label: "Beta (keyed)",
  url: "https://beta.example/v1/audio/speech",
  apiKeyEnv: "BETA_TTS_KEY",
  contentType: "audio/mpeg",
  buildBody: (text, voice) => JSON.stringify({ input: text, voice }),
};

describe("tts-pool — keyless, fail-closed, never-throws", () => {
  it("rejects empty / whitespace / over-long text without calling fetch", async () => {
    const fetchImpl = vi.fn();
    for (const text of ["", "   ", "x".repeat(MAX_TTS_CHARS + 1)]) {
      const res = await synthesizeSpeech({ text }, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(res.ok).toBe(false);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes unknown/absent voices to the default", () => {
    expect(normalizeVoice(undefined)).toBe(DEFAULT_VOICE);
    expect(normalizeVoice("not-a-voice")).toBe(DEFAULT_VOICE);
    expect(normalizeVoice("nova")).toBe("nova");
  });

  it("synthesizes via the keyless provider and returns the audio bytes", async () => {
    const fetchImpl = vi.fn(async () => audioResponse());
    const res = await synthesizeSpeech(
      { text: "Today's top read", voice: "nova" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: {} },
      [KEYLESS],
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.provider).toBe("alpha");
      expect(res.contentType).toBe("audio/mpeg");
      expect(res.audio.byteLength).toBe(4);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does NOT send an Authorization header for a keyless provider", async () => {
    let lastInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      lastInit = init;
      return audioResponse();
    });
    await synthesizeSpeech(
      { text: "hi" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: {} },
      [KEYLESS],
    );
    const headers = (lastInit?.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("skips a keyed provider with no key, but uses it (with bearer) when the key is set", async () => {
    expect(isTtsProviderAvailable(KEYED, {})).toBe(false);
    expect(isTtsProviderAvailable(KEYED, { BETA_TTS_KEY: "sk-test" })).toBe(true);

    let lastInit: RequestInit | undefined;
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      lastInit = init;
      return audioResponse();
    });
    await synthesizeSpeech(
      { text: "hi" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: { BETA_TTS_KEY: "sk-test" } },
      [KEYED],
    );
    const headers = (lastInit?.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test");
  });

  it("fails over to the next available provider when the first errors", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(audioResponse());
    const res = await synthesizeSpeech(
      { text: "failover please" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: { BETA_TTS_KEY: "sk" } },
      [KEYLESS, KEYED],
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.provider).toBe("beta");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns an honest error (never throws) when every provider fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const res = await synthesizeSpeech(
      { text: "x" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: {} },
      [KEYLESS],
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("no-tts-provider-available");
  });

  it("treats an empty audio body as a failure, not a success", async () => {
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([]), { status: 200 }));
    const res = await synthesizeSpeech(
      { text: "x" },
      { fetchImpl: fetchImpl as unknown as typeof fetch, env: {} },
      [KEYLESS],
    );
    expect(res.ok).toBe(false);
  });

  it("ships a keyless-first default roster (works with zero secrets)", () => {
    expect(TTS_PROVIDERS.length).toBeGreaterThan(0);
    expect(TTS_PROVIDERS[0]?.keyless).toBe(true);
    expect(isTtsProviderAvailable(TTS_PROVIDERS[0]!, {})).toBe(true);
  });
});
