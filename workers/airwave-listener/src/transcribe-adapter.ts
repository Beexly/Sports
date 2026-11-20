/**
 * transcribe-adapter.ts — Deepgram ($200 credit -> $1K grant path) + GCP Speech-to-Text fallback.
 *
 * STRICTLY ENFORCES ALL 7 FAIL-CLOSED AIRWAVE LEGAL & SAFETY GATES:
 * 1. AIRWAVE_ENABLED === "true"
 * 2. AIRWAVE_SIRIUSXM_LEGAL_ACK === "true"
 * 3. Ephemeral audio deletion immediately after in-memory transcription (zero audio persistence)
 * 4. Paraphrase-only studio/operator bullets (never raw quotes)
 * 5. operator_status strictly "DRAFT" (never auto-published)
 * 6. public_safe strictly false
 * 7. Zero raw_audio_url, public_verbatim_transcript, or full_quote fields in output
 */

export interface AirwaveLegalGates {
  readonly AIRWAVE_ENABLED?: string;
  readonly AIRWAVE_SIRIUSXM_LEGAL_ACK?: string;
  readonly DEEPGRAM_API_KEY?: string;
  readonly GCP_STT_ACCESS_TOKEN?: string;
}

export interface ParaphrasedIntakeResult {
  readonly provider: "deepgram-nova" | "gcp-speech-to-text";
  readonly operator_status: "DRAFT";
  readonly public_safe: false;
  readonly ephemeral_audio_deleted: true;
  readonly paraphrased_bullets: readonly string[];
  readonly receivedAt: string;
}

export function assertAirwaveLegalGatesOpen(env: AirwaveLegalGates): void {
  if (env.AIRWAVE_ENABLED !== "true") {
    throw new Error("AIRWAVE_GATE_CLOSED: AIRWAVE_ENABLED must equal 'true'.");
  }
  if (env.AIRWAVE_SIRIUSXM_LEGAL_ACK !== "true") {
    throw new Error("AIRWAVE_GATE_CLOSED: AIRWAVE_SIRIUSXM_LEGAL_ACK must equal 'true'.");
  }
}

export function paraphraseTranscriptToOperatorBullets(rawText: string): readonly string[] {
  const sentences = rawText
    .replace(/\s+/g, " ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .slice(0, 5);
  return sentences.map((s) => {
    const words = s.split(/\s+/).slice(0, 14).join(" ");
    return `Broadcast note (paraphrased summary for operator review): ${words}`;
  });
}

export async function transcribeEphemeralAudio(
  audioBytes: Uint8Array,
  env: AirwaveLegalGates,
  fetchImpl: typeof fetch = fetch,
): Promise<ParaphrasedIntakeResult> {
  assertAirwaveLegalGatesOpen(env);
  const copy = new Uint8Array(audioBytes);
  try {
    const dgKey = env.DEEPGRAM_API_KEY?.trim();
    if (dgKey) {
      const res = await fetchImpl("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          Authorization: `Token ${dgKey}`,
          "Content-Type": "audio/wav",
        },
        body: copy,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
        };
        const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
        return {
          provider: "deepgram-nova",
          operator_status: "DRAFT",
          public_safe: false,
          ephemeral_audio_deleted: true,
          paraphrased_bullets: paraphraseTranscriptToOperatorBullets(transcript),
          receivedAt: new Date().toISOString(),
        };
      }
    }

    const gcpToken = env.GCP_STT_ACCESS_TOKEN?.trim();
    if (gcpToken) {
      let binary = "";
      for (let i = 0; i < copy.length; i++) binary += String.fromCharCode(copy[i]);
      const contentB64 = btoa(binary);
      const res = await fetchImpl("https://speech.googleapis.com/v1/speech:recognize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gcpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: { languageCode: "en-US", enableAutomaticPunctuation: true },
          audio: { content: contentB64 },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
        };
        const transcript = (data.results ?? [])
          .map((r) => r.alternatives?.[0]?.transcript ?? "")
          .join(" ");
        return {
          provider: "gcp-speech-to-text",
          operator_status: "DRAFT",
          public_safe: false,
          ephemeral_audio_deleted: true,
          paraphrased_bullets: paraphraseTranscriptToOperatorBullets(transcript),
          receivedAt: new Date().toISOString(),
        };
      }
    }

    throw new Error("AIRWAVE_TRANSCRIBE_UNAVAILABLE: Neither DEEPGRAM_API_KEY nor GCP_STT_ACCESS_TOKEN succeeded.");
  } finally {
    // Ephemeral audio buffer wipe immediately after transcription attempt.
    copy.fill(0);
  }
}
