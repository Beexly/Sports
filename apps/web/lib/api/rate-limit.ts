/**
 * Shared in-memory token-bucket rate limiter for API routes.
 *
 * Generalized from the original per-IP limiter so the money-spending,
 * authenticated endpoints (Claude-backed explain / model-court) can throttle
 * per user. In-memory and per-instance — public endpoints that need a
 * cross-instance counter use lib/api/public-form-rate-limit.ts instead — but
 * this is enough to stop a single caller from looping an endpoint and draining
 * the shared monthly Claude budget (denial-of-wallet) between budget-gate
 * checks.
 *
 * This module is also the SINGLE source of client-IP truth: `clientIp()` below
 * is the only sanctioned way to derive a rate-limit key from request headers,
 * and scripts/guardrails/client-ip-boundary.mjs fails CI on any other module
 * that names a forwarding header.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const registries = new Map<string, Map<string, Bucket>>();

export interface RateLimitResult {
  readonly ok: boolean;
  readonly retryAfterSec: number;
}

/**
 * Consume one token for `key` within the named `bucketId` registry.
 * @param bucketId  logical limiter name (keeps independent endpoints separate)
 * @param key       the subject to limit (e.g. userId or IP)
 * @param max       max requests per window
 * @param windowMs  window length in ms
 */
export function consumeRateLimit(
  bucketId: string,
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  let registry = registries.get(bucketId);
  if (!registry) {
    registry = new Map<string, Bucket>();
    registries.set(bucketId, registry);
  }
  const now = Date.now();
  const b = registry.get(key);
  if (!b || now >= b.resetAt) {
    registry.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP from forwarding headers. */
/** Rough IPv4/IPv6 shape check — enough to reject junk and header-injection noise. */
function looksLikeIp(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 45) return false;
  // Strip an optional :port on plain IPv4, and [brackets] on IPv6.
  const bare = v.startsWith("[") ? v.slice(1, v.indexOf("]") === -1 ? undefined : v.indexOf("]")) : v;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare)) {
    return bare.split(".").every((o) => Number(o) <= 255);
  }
  return /^[0-9a-fA-F:]+$/.test(bare) && bare.includes(":");
}

/**
 * Number of proxies between the client and this app whose appended
 * `x-forwarded-for` entry we trust. Vercel's edge is exactly one hop.
 */
const TRUSTED_PROXY_HOPS = Math.max(
  1,
  Number(process.env["TRUSTED_PROXY_HOPS"] ?? "1") || 1,
);

/**
 * Resolve the client IP used as a rate-limit key.
 *
 * SECURITY (rate-limit bypass): this previously returned the LEFTMOST
 * `x-forwarded-for` entry. That entry is client-controlled — every proxy
 * *appends* the address it received the connection from, so a caller who sends
 * their own `X-Forwarded-For: <random>` header gets it preserved at position 0.
 * An attacker could therefore mint an unlimited number of distinct rate-limit
 * buckets and bypass every per-IP limit entirely, which also defeats any future
 * durable store: a shared counter is worthless if the key can be forged.
 *
 * Order of trust:
 *  1. Platform-set headers (`x-vercel-forwarded-for`, `x-real-ip`) — written by
 *     the edge, not forwarded from the client, so they cannot be forged.
 *  2. `x-forwarded-for` read from the RIGHT: with N trusted proxies the Nth entry
 *     from the end is the address our nearest trusted proxy actually observed.
 *     Anything further left may be attacker-supplied.
 *  3. `"anon"` — a single shared bucket. Deliberately fail-CLOSED: an
 *     unidentifiable caller is throttled alongside every other unidentifiable
 *     caller rather than handed a private allowance.
 *
 * Takes a plain `Request` (NextRequest extends it) so route handlers typed
 * against either can call it — the only reason five routes hand-rolled their
 * own leftmost-entry parser was that this signature used to demand NextRequest.
 * Any new call site MUST use this function: scripts/guardrails/client-ip-boundary.mjs
 * fails CI on any other module that reads a forwarding header directly.
 */
export function clientIp(req: Request): string {
  const platform =
    req.headers.get("x-vercel-forwarded-for") ?? req.headers.get("x-real-ip");
  if (platform) {
    const candidate = platform.split(",").pop()?.trim() ?? "";
    if (looksLikeIp(candidate)) return candidate;
  }

  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    // Count back from the end by the number of proxies we trust.
    const idx = parts.length - TRUSTED_PROXY_HOPS;
    const candidate = parts[Math.max(0, idx)] ?? "";
    if (looksLikeIp(candidate)) return candidate;
  }

  return "anon";
}

/** The forwarding headers `clientIp()` consults. Nothing else should name them. */
const CLIENT_IP_HEADERS = ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] as const;

/**
 * Copy the forwarding headers VERBATIM from an inbound request onto a request
 * being built for a directly-invoked route handler (see app/picks/page.tsx,
 * which calls route `GET`s in-process instead of self-fetching over HTTP).
 *
 * Verbatim is the whole point: the caller relays the entire header value and
 * makes no decision about which entry is trustworthy — `clientIp()` still does
 * that, once, downstream. A relay that copied `split(",")[0]` would launder a
 * forged entry into a position the limiter trusts, so this lives here rather
 * than being open-coded at each relay site (and
 * scripts/guardrails/client-ip-boundary.mjs enforces that).
 */
export function copyClientIpHeaders(
  source: { get(name: string): string | null },
  target: Headers,
): void {
  for (const name of CLIENT_IP_HEADERS) {
    const value = source.get(name);
    if (value) target.set(name, value);
  }
}

/** Test-only: clear every rate-limit bucket so suites that share a key are deterministic. */
export function resetRateLimits(): void {
  registries.clear();
}
