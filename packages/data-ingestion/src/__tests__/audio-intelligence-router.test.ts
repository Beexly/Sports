import { describe, expect, it, vi } from "vitest";
import {
  AudioGuardrailError,
  assertGuardrailCleanAudioScript,
  synthesizeGuardrailCleanAudio,
  transcribeCoachPresserAudio,
} from "../audio-intelligence-router.js";

describe("audio-intelligence-router guardrails and routing", () => {
  it("rejects internal math jargon and voided records before spending TTS credits", async () => {
    const fetchImpl = vi.fn();
    await expect(
      synthesizeGuardrailCleanAudio({
        script: "Our 10,000 worlds Sinkhorn simulation shows huge conviction tonight.",
        env: { ELEVENLABS_API_KEY: "el-test" },
        fetchImpl,
      }),
    ).rejects.toThrow(AudioGuardrailError);

    expect(() =>
      assertGuardrailCleanAudioScript("Our 62-23-1 banner and 82% confidence lead tonight."),
    ).toThrow(AudioGuardrailError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("blocks paid VIP pick leaks on public audio scripts unless explicitly unlocked", () => {
    expect(() =>
      assertGuardrailCleanAudioScript(
        "OFFICIAL VIP TICKET: Josh Allen OVER 249.5 Passing Yards 1.5u tonight.",
      ),
    ).toThrow(AudioGuardrailError);

    const unlocked = assertGuardrailCleanAudioScript(
      "OFFICIAL VIP TICKET: Josh Allen OVER 249.5 Passing Yards 1.5u tonight.",
      { allowPaidPicks: true },
    );
    expect(unlocked.ok).toBe(true);
  });

  it("uses ElevenLabs primary and fails over to Fish Audio then transcript_only", async () => {
    const cleanScript =
      "Tonight's AFC South matchup sets up for controlled tempo, heavy red-zone rushing volume, and sustained pocket pressure off the edge.";

    const elevenFetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }));
    const r1 = await synthesizeGuardrailCleanAudio({
      script: cleanScript,
      env: { ELEVENLABS_API_KEY: "el-key", FISH_AUDIO_API_KEY: "fish-key" },
      fetchImpl: elevenFetch,
    });
    expect(r1.provider).toBe("elevenlabs");
    expect(r1.audioBytes?.byteLength).toBe(4);
    expect(r1.attemptedProviders).toEqual(["elevenlabs"]);

    const failoverFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota exceeded", { status: 429 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([5, 6, 7]), { status: 200 }));
    const r2 = await synthesizeGuardrailCleanAudio({
      script: cleanScript,
      env: { ELEVENLABS_API_KEY: "el-key", FISH_AUDIO_API_KEY: "fish-key" },
      fetchImpl: failoverFetch,
    });
    expect(r2.provider).toBe("fish_audio");
    expect(r2.audioBytes?.byteLength).toBe(3);
    expect(r2.attemptedProviders).toEqual(["elevenlabs", "fish_audio"]);
    expect(r2.fallbackReason).toContain("429");

    const r3 = await synthesizeGuardrailCleanAudio({
      script: cleanScript,
      env: {},
      fetchImpl: vi.fn(),
    });
    expect(r3.provider).toBe("transcript_only");
    expect(r3.audioBytes).toBeNull();
    expect(r3.sanitizedScript).toBe(cleanScript);
  });

  it("routes coach presser STT through Deepgram Nova-2 primary with GCP Cloud Speech fallback", async () => {
    const dgFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: { channels: [{ alternatives: [{ transcript: "We are monitoring his workload this week." }] }] },
        }),
        { status: 200 },
      ),
    );
    const stt1 = await transcribeCoachPresserAudio({
      audioUrl: "https://example.com/presser.mp3",
      env: { DEEPGRAM_API_KEY: "dg-key" },
      fetchImpl: dgFetch,
    });
    expect(stt1.provider).toBe("deepgram");
    expect(stt1.transcript).toContain("monitoring his workload");
    expect(stt1.fallbackUsed).toBe(false);

    const gcpFallbackFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("deepgram unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ alternatives: [{ transcript: "Red zone package stays balanced." }] }],
          }),
          { status: 200 },
        ),
      );
    const stt2 = await transcribeCoachPresserAudio({
      audioBase64: Buffer.from("fake-mp3").toString("base64"),
      env: { DEEPGRAM_API_KEY: "dg-key", GCP_ML_ACCESS_TOKEN: "gcp-token" },
      fetchImpl: gcpFallbackFetch,
    });
    expect(stt2.provider).toBe("gcp_speech");
    expect(stt2.fallbackUsed).toBe(true);
    expect(stt2.transcript).toContain("Red zone package");
  });
});
