/**
 * POST /api/voice/speak — server-side text-to-speech (keyless voice pool).
 *
 * Synthesizes spoken audio for short text (pick summaries, status briefs, alerts)
 * via the keyless TTS pool. Public + rate-limited (same fixed-window limiter as
 * the Lab tools) since it does outbound work. Returns audio bytes on success or
 * a JSON error. Never leaks a secret (the default provider is keyless anyway).
 */

import { checkLabRateLimit } from "@/lib/lab/rate-limit";
import { synthesizeSpeech, MAX_TTS_CHARS } from "@/lib/voice/tts-pool";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number, retryAfterSec?: number): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (retryAfterSec !== undefined) headers["Retry-After"] = String(retryAfterSec);
  return new Response(JSON.stringify({ ok: false, error }), { status, headers });
}

function readString(body: unknown, key: string): string | null {
  if (typeof body === "object" && body !== null && key in body) {
    const value = (body as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  const rate = checkLabRateLimit(req);
  if (!rate.allowed) return jsonError("rate_limited", 429, rate.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  const text = readString(body, "text");
  if (text === null || text.trim().length === 0) return jsonError("text_required", 400);
  if (text.trim().length > MAX_TTS_CHARS) return jsonError("text_too_long", 400);

  const voice = readString(body, "voice") ?? undefined;

  const result = await synthesizeSpeech({ text, ...(voice ? { voice } : {}) });
  if (!result.ok) {
    // 502: the pool itself is fine, but no upstream voice provider could serve.
    return jsonError(result.error, 502);
  }

  return new Response(result.audio, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "no-store",
      "X-Voice-Provider": result.provider,
    },
  });
}
