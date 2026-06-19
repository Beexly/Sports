/**
 * Text-to-speech voice pool — the "King of Data" doctrine applied to audio.
 *
 * Jarvis already speaks in the browser via the Web Speech API (client-side
 * speechSynthesis). This adds a SERVER-side voice: a keyless, OpenAI-compatible
 * TTS pool that can synthesize audio for pick summaries, alerts, and content
 * voiceovers — richer voices than the browser, and usable outside a tab.
 *
 * Mirrors the LLM `provider-pool.ts` / score `score-provider-pool.ts` shape:
 *   - keyless-first so it works with ZERO secrets (Pollinations is always on),
 *   - keyed providers are OPTIONAL and only widen the pool when their env is set,
 *   - rotate + fail over across available providers, returning the first success,
 *   - NEVER throws and NEVER fabricates audio — an all-fail pool returns an honest
 *     `{ ok: false }`.
 *
 * PURITY: `fetchImpl` and `env` are injectable, so the whole pool unit-tests
 * against a mocked fetch with no live network and no secrets.
 */

/** Max input characters Pollinations (and most TTS) accept per request. */
export const MAX_TTS_CHARS = 4096;

/** Default voice when none/an invalid one is requested. */
export const DEFAULT_VOICE = "alloy";

/** OpenAI-named voices supported across the pool. Unknown voices fall back. */
export const VALID_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
export type TtsVoice = (typeof VALID_VOICES)[number];

type Env = Record<string, string | undefined>;

export interface TtsProvider {
  /** Stable id for the ledger / health map. */
  readonly id: string;
  /** Human label for any pool-status surface. */
  readonly label: string;
  /** Full POST endpoint (OpenAI-compatible /audio/speech). */
  readonly url: string;
  /** True when no key is needed (always available). */
  readonly keyless?: boolean;
  /** Env var holding this provider's key. Omitted for keyless providers. */
  readonly apiKeyEnv?: string;
  /** Content-Type of the audio this provider returns. */
  readonly contentType: string;
  /** Build the JSON request body from validated text + voice. */
  readonly buildBody: (text: string, voice: TtsVoice) => string;
}

/**
 * Seeded roster. Keyless first so the zero-secret default works. Keyed-free
 * providers can be appended later with the same interface (e.g. a Groq/PlayHT
 * key) without touching the pool logic.
 */
export const TTS_PROVIDERS: readonly TtsProvider[] = [
  {
    id: "pollinations-tts",
    label: "Pollinations TTS (keyless)",
    url: "https://gen.pollinations.ai/v1/audio/speech",
    keyless: true,
    contentType: "audio/mpeg",
    buildBody: (text, voice) =>
      JSON.stringify({ model: "tts-1", input: text, voice, response_format: "mp3" }),
  },
];

function providerKey(provider: TtsProvider, env: Env): string | undefined {
  if (provider.keyless || !provider.apiKeyEnv) return undefined;
  const value = env[provider.apiKeyEnv];
  return value && value.trim() !== "" ? value : undefined;
}

/** True when a provider can be called right now (keyless OR its key is present). */
export function isTtsProviderAvailable(provider: TtsProvider, env: Env = process.env): boolean {
  return Boolean(provider.keyless) || providerKey(provider, env) !== undefined;
}

/** Normalize a requested voice to a supported one (invalid/absent → default). */
export function normalizeVoice(voice: string | undefined): TtsVoice {
  return (VALID_VOICES as readonly string[]).includes(voice ?? "")
    ? (voice as TtsVoice)
    : DEFAULT_VOICE;
}

export interface TtsRequest {
  readonly text: string;
  readonly voice?: string;
}

export interface TtsDeps {
  readonly fetchImpl?: typeof fetch;
  readonly env?: Env;
}

export type TtsResult =
  | { readonly ok: true; readonly audio: ArrayBuffer; readonly contentType: string; readonly provider: string }
  | { readonly ok: false; readonly error: string };

/** Validate text: present, trimmed-non-empty, within the char ceiling. */
function validateText(text: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof text !== "string") return { ok: false, error: "text-required" };
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, error: "text-empty" };
  if (trimmed.length > MAX_TTS_CHARS) return { ok: false, error: "text-too-long" };
  return { ok: true, text: trimmed };
}

/**
 * Synthesize speech over the pool. Validates input, then tries each AVAILABLE
 * provider in turn and returns the first that yields non-empty audio. Returns an
 * honest `{ ok: false }` when input is invalid or every provider fails. NEVER
 * throws; never logs or returns a secret.
 *
 * @param req       - { text, voice? }
 * @param deps      - injectable fetch + env (for deterministic tests)
 * @param providers - provider roster (defaults to TTS_PROVIDERS)
 */
export async function synthesizeSpeech(
  req: TtsRequest,
  deps: TtsDeps = {},
  providers: readonly TtsProvider[] = TTS_PROVIDERS,
): Promise<TtsResult> {
  const validated = validateText(req.text);
  if (!validated.ok) return { ok: false, error: validated.error };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const env = deps.env ?? process.env;
  const voice = normalizeVoice(req.voice);

  const available = providers.filter((p) => isTtsProviderAvailable(p, env));
  if (available.length === 0) return { ok: false, error: "no-tts-provider-available" };

  for (const provider of available) {
    try {
      const key = providerKey(provider, env);
      const res = await fetchImpl(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: provider.buildBody(validated.text, voice),
      });
      if (!res.ok) continue;
      const audio = await res.arrayBuffer();
      if (audio.byteLength === 0) continue;
      return { ok: true, audio, contentType: provider.contentType, provider: provider.id };
    } catch {
      // Provider unreachable / bad payload — try the next, never propagate.
      continue;
    }
  }

  return { ok: false, error: "no-tts-provider-available" };
}
