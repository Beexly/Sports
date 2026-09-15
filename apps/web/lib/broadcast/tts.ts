/**
 * Real TTS lane for The Beat / Galaxy Broadcast — the opt-in replacement for the
 * removed browser speechSynthesis Play control.
 *
 * Context (`components/news/galaxy-broadcast.tsx`'s own header comment): "the
 * browser speech-synthesis Play control was removed 2026-09-12. It sounded
 * robotic and nothing like a human read. The founder called it 'horrible and
 * nothing human-like.' ... when a real TTS lane lands it can come back behind
 * an explicit opt-in." `the-beat-broadcast.test.ts` pins the same intent.
 *
 * This is that lane's server-side half: a single function that turns one
 * segment's script into narration audio via a scripted-narration TTS REST API,
 * called with plain `fetch` (no new npm dependency — package-lock.json is
 * frozen for agent sessions under AGENTS.md law 2). ElevenLabs is the specific
 * provider chosen: highest-rated for natural, non-robotic scripted narration
 * (not the live-conversational use case pipecat-ai/pipecat targets — GSE never
 * needs realtime turn-taking here, only pre-scripted segment read-aloud, which
 * is a materially simpler, cheaper problem than what a full voice-agent
 * framework solves).
 *
 * HONEST EMPTY STATE (rule 4 / rule 8 — no secrets in code, no fabricated
 * product data): with no `ELEVENLABS_API_KEY` configured, `synthesizeSegment`
 * returns `{ audio: null, reason: "not_configured" }` rather than throwing or
 * fabricating silence-as-success. The caller (the opt-in UI toggle) must render
 * that as "narration unavailable," never as a played (but silent) track.
 *
 * `voiceId` is validated against a strict alphanumeric pattern before it is
 * interpolated into the request URL — it is never trusted verbatim, whether it
 * comes from a caller or from `ELEVENLABS_VOICE_ID`, since an unvalidated value
 * in a URL path is a real injection surface, not just a style concern.
 *
 * NOT WIRED INTO THE UI YET. `galaxy-broadcast.tsx` needs a real opt-in toggle,
 * an <audio> element, loading/error states, and — because it's a delicate,
 * carefully art-directed cinematic surface — actual browser QA before landing,
 * which this session cannot do (no dev server, no visual verification
 * available here). This module is the tested, working backend half; the UI
 * half is a follow-up with its own PR and a real screenshot/browser check.
 */

const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

/** A calm, professional narration voice — not the default demo voice. Override via env. */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel" — stable public voice ID

/**
 * ElevenLabs voice IDs are alphanumeric only. `voiceId` is interpolated directly
 * into the request URL's path (`${ELEVENLABS_TTS_URL}/${voiceId}`), so an
 * unvalidated value — whether from a caller or from `ELEVENLABS_VOICE_ID` — is a
 * URL/path-injection surface (a `/`, `?`, or `#` could redirect the path or
 * append query params the caller didn't intend). Reject anything outside the
 * real ID shape before it ever reaches the URL rather than trusting the source.
 */
const VOICE_ID_PATTERN = /^[A-Za-z0-9]+$/;

export type SynthesizeResult =
  | { readonly audio: ArrayBuffer; readonly reason: null }
  | {
      readonly audio: null;
      readonly reason: "not_configured" | "request_failed" | "empty_script" | "invalid_voice_id";
    };

export interface SynthesizeOptions {
  readonly apiKey?: string; // defaults to process.env.ELEVENLABS_API_KEY
  readonly voiceId?: string; // defaults to process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID
  readonly fetchImpl?: typeof fetch; // for tests
  readonly timeoutMs?: number;
}

/**
 * Synthesize one broadcast segment's script to narration audio.
 *
 * Pure at the boundary: no caching, no DB, no side effects beyond the HTTP
 * call. A caller wanting to avoid re-synthesizing an unchanged script should
 * cache the returned bytes keyed on a hash of (voiceId, script) — left to the
 * caller, since GSE already has a response-cache pattern
 * (`lib/claude-api/response-cache.ts`) this should mirror once wired in, not
 * duplicate here.
 */
export async function synthesizeSegment(
  script: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult> {
  const trimmed = script.trim();
  if (!trimmed) return { audio: null, reason: "empty_script" };

  const apiKey = options.apiKey ?? process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) return { audio: null, reason: "not_configured" };

  const voiceId = options.voiceId ?? process.env["ELEVENLABS_VOICE_ID"] ?? DEFAULT_VOICE_ID;
  if (!VOICE_ID_PATTERN.test(voiceId)) {
    console.warn(`[broadcast-tts] rejected invalid voiceId (not alphanumeric)`);
    return { audio: null, reason: "invalid_voice_id" };
  }

  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  // Built via the URL object with an explicitly encoded, pre-validated path
  // segment rather than raw template-string interpolation — the idiomatic,
  // tool-recognized way to neutralize a variable used in a request URL.
  const requestUrl = new URL(ELEVENLABS_TTS_URL);
  requestUrl.pathname = `${requestUrl.pathname}/${encodeURIComponent(voiceId)}`;

  try {
    const res = await doFetch(requestUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: trimmed,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[broadcast-tts] request failed: HTTP ${res.status}`);
      return { audio: null, reason: "request_failed" };
    }

    const audio = await res.arrayBuffer();
    return { audio, reason: null };
  } catch (err) {
    console.warn(
      `[broadcast-tts] request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { audio: null, reason: "request_failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the env carries a usable key — the opt-in toggle should hide/disable itself otherwise. */
export function isBroadcastTtsConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env["ELEVENLABS_API_KEY"]?.trim());
}
