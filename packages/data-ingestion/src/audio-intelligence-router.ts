/**
 * Multi-Provider Audio & Voice Intelligence Router (`audio-intelligence-router.ts`)
 *
 * Enforces AGENTS.md customer-facing plain-English copy & paywall protection BEFORE
 * spending a single character of TTS credits:
 *   - TTS Synthesis Priority:
 *       1) ElevenLabs (`ELEVENLABS_API_KEY`, `eleven_turbo_v2_5`)
 *       2) Fish Audio (`FISH_AUDIO_API_KEY`)
 *       3) Fail-closed transcript-only fallback (`audioBytes: null`)
 *   - Speech-to-Text (`THE LEARNING LOOP` coach/QB presser ingestion):
 *       1) Deepgram Nova-2 (`DEEPGRAM_API_KEY`, $200 startup grant)
 *       2) Google Cloud Speech-to-Text (`recognizeAudioWithCloudSpeech`)
 */

import { recognizeAudioWithCloudSpeech } from "./gcp-ml-clients.js";

export type AudioTtsProvider = "elevenlabs" | "fish_audio" | "transcript_only";
export type AudioSttProvider = "deepgram" | "gcp_speech";

const BANNED_JARGON_PATTERNS: ReadonlyArray<{ readonly label: string; readonly regex: RegExp }> = [
  { label: "10,000 worlds", regex: /\b10,?000\s*worlds?\b/i },
  { label: "22,750,000 snap", regex: /\b22,?750,?000\s*snaps?\b/i },
  { label: "Romano CQR", regex: /\bromano\s*cqr\b/i },
  { label: "Sinkhorn", regex: /\bsinkhorn\b/i },
  { label: "Cholesky", regex: /\bcholesky\b/i },
  { label: "tau_hat", regex: /\btau_hat\b/i },
  { label: "10-Layer Autonomous Engine", regex: /\b10[- ]layer\s+autonomous\s+engine\b/i },
  { label: "JEV internal identifier", regex: /\bjev\b/i },
  { label: "voided/retracted banner record", regex: /\b(?:62-23-1|31-11|14-6)\b/ },
  { label: "percentage confidence format", regex: /\b\d{2,3}(?:\.\d+)?%\s*confidence\b/i },
];

const PAID_PICK_LEAK_PATTERNS: ReadonlyArray<{ readonly label: string; readonly regex: RegExp }> = [
  { label: "raw over/under ticket with unit sizing", regex: /\b(?:OVER|UNDER)\s+\d+(?:\.\d+)?\b[\s\S]{0,60}\b\d+(?:\.\d+)?u\b/i },
  { label: "VIP ticket leak marker", regex: /\bOFFICIAL\s+VIP\s+TICKET\b/i },
  { label: "explicit best bet ticket line", regex: /\b(?:PLAY\s+OF\s+THE\s+DAY|BEST\s+BET)\s*[:\-]\s*(?:OVER|UNDER|[A-Z]{2,4}\s+[+-]\d)/i },
];

export class AudioGuardrailError extends Error {
  readonly violations: readonly string[];
  constructor(message: string, violations: readonly string[]) {
    super(message);
    this.name = "AudioGuardrailError";
    this.violations = violations;
  }
}

export interface AudioGuardrailResult {
  readonly ok: boolean;
  readonly violations: readonly string[];
  readonly sanitizedScript: string;
}

/**
 * Validates that a voice script strictly adheres to customer-facing plain-English
 * language rules and never leaks paid picks on public briefings.
 */
export function assertGuardrailCleanAudioScript(
  script: string,
  options: { readonly allowPaidPicks?: boolean } = {},
): AudioGuardrailResult {
  const normalized = script.trim();
  const violations: string[] = [];

  if (!normalized) {
    violations.push("Audio script must not be empty.");
  }
  for (const rule of BANNED_JARGON_PATTERNS) {
    if (rule.regex.test(normalized)) {
      violations.push(`Forbidden math/pipeline jargon or voided record detected: ${rule.label}`);
    }
  }
  if (options.allowPaidPicks !== true) {
    for (const rule of PAID_PICK_LEAK_PATTERNS) {
      if (rule.regex.test(normalized)) {
        violations.push(`Paywall leak blocked on public audio script: ${rule.label}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new AudioGuardrailError(
      `Audio guardrail rejected script (${violations.length} violation(s)): ${violations.join("; ")}`,
      violations,
    );
  }

  return {
    ok: true,
    violations: [],
    sanitizedScript: normalized,
  };
}

export interface SynthesizeAudioOptions {
  readonly script: string;
  readonly allowPaidPicks?: boolean;
  readonly elevenlabsVoiceId?: string;
  readonly elevenlabsModelId?: string;
  readonly fishReferenceId?: string;
  readonly env?: Record<string, string | undefined>;
  readonly fetchImpl?: typeof fetch;
}

export interface SynthesizeAudioResult {
  readonly provider: AudioTtsProvider;
  readonly audioBytes: Uint8Array | null;
  readonly contentType: string | null;
  readonly sanitizedScript: string;
  readonly attemptedProviders: readonly AudioTtsProvider[];
  readonly fallbackReason: string | null;
}

export async function synthesizeGuardrailCleanAudio(
  options: SynthesizeAudioOptions,
): Promise<SynthesizeAudioResult> {
  const checked = assertGuardrailCleanAudioScript(options.script, {
    allowPaidPicks: options.allowPaidPicks,
  });
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const attemptedProviders: AudioTtsProvider[] = [];
  const errors: string[] = [];

  const elevenKey = (env["ELEVENLABS_API_KEY"] ?? "").trim();
  if (elevenKey) {
    attemptedProviders.push("elevenlabs");
    const voiceId = (options.elevenlabsVoiceId ?? env["ELEVENLABS_VOICE_ID"] ?? "21m00Tcm4TlvDq8ikWAM").trim();
    const modelId = (options.elevenlabsModelId ?? env["ELEVENLABS_MODEL_ID"] ?? "eleven_turbo_v2_5").trim();
    try {
      const res = await fetchImpl(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: checked.sanitizedScript,
            model_id: modelId,
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!res.ok) {
        errors.push(`elevenlabs HTTP ${res.status}`);
      } else {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 0) {
          return {
            provider: "elevenlabs",
            audioBytes: buf,
            contentType: res.headers.get("content-type") ?? "audio/mpeg",
            sanitizedScript: checked.sanitizedScript,
            attemptedProviders,
            fallbackReason: null,
          };
        }
        errors.push("elevenlabs returned empty audio payload");
      }
    } catch (err) {
      errors.push(`elevenlabs error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const fishKey = (env["FISH_AUDIO_API_KEY"] ?? "").trim();
  if (fishKey) {
    attemptedProviders.push("fish_audio");
    const referenceId = (options.fishReferenceId ?? env["FISH_AUDIO_REFERENCE_ID"] ?? "").trim();
    try {
      const res = await fetchImpl("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fishKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: checked.sanitizedScript,
          format: "mp3",
          ...(referenceId ? { reference_id: referenceId } : {}),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        errors.push(`fish_audio HTTP ${res.status}`);
      } else {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 0) {
          return {
            provider: "fish_audio",
            audioBytes: buf,
            contentType: res.headers.get("content-type") ?? "audio/mpeg",
            sanitizedScript: checked.sanitizedScript,
            attemptedProviders,
            fallbackReason: errors.length > 0 ? errors.join("; ") : null,
          };
        }
        errors.push("fish_audio returned empty audio payload");
      }
    } catch (err) {
      errors.push(`fish_audio error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  attemptedProviders.push("transcript_only");
  return {
    provider: "transcript_only",
    audioBytes: null,
    contentType: null,
    sanitizedScript: checked.sanitizedScript,
    attemptedProviders,
    fallbackReason:
      errors.length > 0
        ? errors.join("; ")
        : "Neither ELEVENLABS_API_KEY nor FISH_AUDIO_API_KEY is configured — delivered transcript-only.",
  };
}

export interface TranscribePresserOptions {
  readonly audioBase64?: string;
  readonly audioUrl?: string;
  readonly mimeType?: string;
  readonly env?: Record<string, string | undefined>;
  readonly fetchImpl?: typeof fetch;
}

export interface TranscribePresserResult {
  readonly provider: AudioSttProvider;
  readonly transcript: string;
  readonly fallbackUsed: boolean;
}

/**
 * Transcribes coach / quarterback press conference audio for THE LEARNING LOOP
 * (comparing Tuesday coach statements vs Sunday observed snap tendencies).
 */
export async function transcribeCoachPresserAudio(
  options: TranscribePresserOptions,
): Promise<TranscribePresserResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const deepgramKey = (env["DEEPGRAM_API_KEY"] ?? "").trim();

  if (deepgramKey) {
    const endpoint = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true";
    try {
      const headers: Record<string, string> = {
        Authorization: `Token ${deepgramKey}`,
      };
      let body: Uint8Array | string;
      if (options.audioUrl) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ url: options.audioUrl });
      } else if (options.audioBase64) {
        headers["Content-Type"] = options.mimeType ?? "audio/mpeg";
        body = Buffer.from(options.audioBase64, "base64");
      } else {
        throw new Error("Either audioBase64 or audioUrl is required for Deepgram transcription.");
      }

      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: body as BodyInit,
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
        };
        const transcript = (data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "").trim();
        if (transcript) {
          return {
            provider: "deepgram",
            transcript,
            fallbackUsed: false,
          };
        }
      }
    } catch {
      // Fall through cleanly to Google Cloud Speech-to-Text when base64 audio is supplied.
    }
  }

  if (options.audioBase64) {
    const gcp = await recognizeAudioWithCloudSpeech(options.audioBase64, {
      env,
      fetchImpl,
    });
    return {
      provider: "gcp_speech",
      transcript: gcp.transcript,
      fallbackUsed: Boolean(deepgramKey),
    };
  }

  throw new Error("No working speech-to-text lane succeeded (configure DEEPGRAM_API_KEY or GCP_ML_ACCESS_TOKEN with audioBase64).");
}
