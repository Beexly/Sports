import { NextRequest, NextResponse } from "next/server";
import { loadSleeperLeagues } from "@/lib/integrations/sleeper-sync";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

// Short in-memory result cache keyed by `${username}:${season}`.
// Prevents redundant upstream Sleeper fetches (two sequential calls per request)
// when the same username+season is requested repeatedly.
// TTL is intentionally short (60s) so stale league data never lingers long.
const CACHE_TTL_MS = 60_000;
type CacheEntry = { expiresAt: number; body: unknown };
const resultCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Anonymous, unauthenticated route that proxies to Sleeper's public API
  // (two sequential upstream fetches per call at a 15s timeout). Rate-limit
  // per IP to prevent proxy abuse and cache results to avoid redundant fetches.
  const limit = consumeRateLimit("sleeper-leagues", clientIp(request), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "";
  const season = (searchParams.get("season") ?? "").replace(/\D/g, "").slice(0, 4) || "2025";

  // Short result cache: identical (username, season) requests within 60s
  // are served from cache instead of hitting the upstream API again.
  const cacheKey = `${username}:${season}`;
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.body);
  }

  const data = await loadSleeperLeagues({ username, season });
  const body = { success: data.status !== "source-error", data };
  resultCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, body });
  return NextResponse.json(body);
}
