/**
 * B2B API key auth — env comma-separated keys (no DB table yet).
 * GSE_B2B_API_KEYS=key1,key2
 */

import { timingSafeEqual } from "node:crypto";

export function extractB2bApiKey(req: Request): string | null {
  const h = req.headers.get("x-api-key") ?? req.headers.get("authorization");
  if (!h) return null;
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim() || null;
  return h.trim() || null;
}

export function authorizeB2bApiKey(req: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const presented = extractB2bApiKey(req);
  if (!presented) return false;
  const raw = env["GSE_B2B_API_KEYS"]?.trim() ?? "";
  if (!raw) return false;
  const keys = raw.split(",").map((k) => k.trim()).filter(Boolean);
  const a = Buffer.from(presented);
  for (const k of keys) {
    const b = Buffer.from(k);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** Simple fixed window counter per key hash (process-local). */
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimitB2b(
  key: string,
  limit = 60,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now > row.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (row.n >= limit) return { ok: false, remaining: 0 };
  row.n += 1;
  return { ok: true, remaining: limit - row.n };
}
