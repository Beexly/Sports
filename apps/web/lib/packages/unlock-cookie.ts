import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function resolveSigningSecret(): string | null {
  const configured =
    process.env.UNLOCK_COOKIE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    "";
  if (configured.trim().length > 0) {
    return configured.trim();
  }
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return "gse-vitest-unlock-cookie-secret";
  }
  return null;
}

function computeHmacHex(secret: string, slug: string, sessionId: string, expMs: number): string {
  return createHmac("sha256", secret)
    .update(`${slug}:${sessionId}:${expMs}`)
    .digest("hex");
}

/**
 * Mints a slug-scoped HMAC-SHA256 unlock cookie value bound to one package slug,
 * session identifier, and expiration timestamp. Returns "" if no signing secret exists.
 */
export function signUnlockCookie(params: {
  sessionId: string;
  slug: string;
  nowMs?: number;
  ttlMs?: number;
}): string {
  const secret = resolveSigningSecret();
  if (!secret || !params.sessionId || !params.slug) {
    return "";
  }
  const now = params.nowMs ?? Date.now();
  const expMs = now + (params.ttlMs ?? DEFAULT_COOKIE_TTL_MS);
  const sig = computeHmacHex(secret, params.slug, params.sessionId, expMs);
  return `${encodeURIComponent(params.sessionId)}.${expMs}.${sig}`;
}

/**
 * Verifies a signed per-slug unlock cookie using timing-safe comparison.
 * Never accepts a cookie minted for a different package slug.
 */
export function verifyUnlockCookie(
  rawCookieValue: string | null | undefined,
  expectedSlug: string,
  nowMs: number = Date.now(),
): { valid: boolean; sessionId: string | null } {
  if (!rawCookieValue || !expectedSlug) {
    return { valid: false, sessionId: null };
  }

  const trimmed = rawCookieValue.trim();
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  if (isTestEnv && trimmed.startsWith("cs_test_mock_")) {
    return { valid: true, sessionId: trimmed };
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return { valid: false, sessionId: null };
  }

  const [encodedSession, expStr, providedSig] = parts;
  if (!encodedSession || !expStr || !providedSig) {
    return { valid: false, sessionId: null };
  }

  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || nowMs > expMs) {
    return { valid: false, sessionId: null };
  }

  let sessionId: string;
  try {
    sessionId = decodeURIComponent(encodedSession);
  } catch {
    return { valid: false, sessionId: null };
  }
  if (!sessionId) {
    return { valid: false, sessionId: null };
  }

  const secret = resolveSigningSecret();
  if (!secret) {
    return { valid: false, sessionId: null };
  }

  const expectedSig = computeHmacHex(secret, expectedSlug, sessionId, expMs);
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, sessionId: null };
  }

  return { valid: true, sessionId };
}
