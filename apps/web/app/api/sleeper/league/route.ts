import { NextRequest, NextResponse } from "next/server";
import { loadSleeperLeague } from "@/lib/integrations/sleeper-sync";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

export const dynamic = "force-dynamic";

// Short in-memory result cache keyed by `${leagueId}:${userId}`.
// `loadSleeperLeague` fans out to THREE upstream Sleeper endpoints per call —
// league, rosters and leagueUsers (sleeper-sync.ts) — each at a 15s timeout, on
// top of the separately-cached 24h player map. That is a 3x amplifier on an
// unauthenticated route: one attacker request costs Sleeper three. The sibling
// /api/sleeper/leagues already carries this exact limiter + cache pair; this
// route was simply missed.
// TTL matches the sibling (60s) so league data never lingers stale.
const CACHE_TTL_MS = 60_000;
type CacheEntry = { expiresAt: number; body: unknown };
const resultCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Anonymous, unauthenticated proxy to Sleeper's public API. Rate-limit per IP
  // to prevent proxy abuse / denial-of-third-party and cache results to avoid
  // redundant fan-out. Same bucket size as the sibling leagues route (20/min).
  //
  // `clientIp` (not hand-rolled x-forwarded-for parsing): it prefers the
  // platform-set headers and otherwise reads XFF from the RIGHT, so a caller
  // cannot mint unlimited buckets by sending their own X-Forwarded-For.
  const limit = consumeRateLimit("sleeper-league", clientIp(request), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId") ?? "";
  const userId = searchParams.get("userId");
  const cleanLeagueId = leagueId.replace(/\D/g, "").slice(0, 32);
  const cleanUserId = userId ? userId.replace(/\D/g, "").slice(0, 32) : null;
  if (!cleanLeagueId) {
    return NextResponse.json({ success: false, error: "leagueId is required" }, { status: 400 });
  }

  // Cache key is built from the SANITISED ids, so cosmetic variations of the
  // same request ("12 3" vs "123") share one entry instead of each buying a
  // fresh fan-out. `userId` is part of the key because it selects which roster
  // is highlighted — it is a Sleeper platform id choosing a public roster, not
  // a GSE identity, so nothing user-private is cached here.
  const cacheKey = `${cleanLeagueId}:${cleanUserId ?? ""}`;
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.body);
  }

  // Cached regardless of outcome, exactly as the sibling route does: a
  // `source-error` is the response most worth NOT re-earning three upstream
  // fetches for, since that is the shape an abusive caller produces on repeat.
  const data = await loadSleeperLeague({ leagueId: cleanLeagueId, userId: cleanUserId });
  const body = { success: data.status !== "source-error", data };
  resultCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, body });
  return NextResponse.json(body);
}
