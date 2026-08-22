import { NextResponse } from "next/server";

/**
 * `NextResponse.json` that can never be cached by a CDN or a browser.
 *
 * Two distinct failure modes on the public picks endpoints, both real:
 *
 * 1. THE KILL SWITCH LOSES BOTH DIRECTIONS. The gate responses
 *    (`bootstrapGateResponse` / `staleDataGateResponse`, both 503) carried no
 *    cache headers. A 503 emitted while PUBLIC_PICKS was off can be cached and
 *    keep serving after the flag is flipped on — the surface stays dark and
 *    looks broken. The reverse is worse: a cached 200 slate can keep serving
 *    after FORCE_NO_BET_IF_STALE fires, which is a stale public board, exactly
 *    what CLAUDE.md rule #5 exists to prevent. A kill switch you cannot
 *    reliably close is not a kill switch.
 *
 * 2. ENTITLEMENT BLEED. The 200 body is per-viewer — `meta.tier`,
 *    `canSeeConfidence`, and a FREE-vs-PRO filtered `data` array. A shared
 *    cache entry populated by one tier and served to another is a paywall
 *    bypass at the edge, and CLAUDE.md rule #3 puts paywall enforcement
 *    server-side only. `dynamic = "force-dynamic"` governs Next's own render
 *    cache; it does not promise anything about an intermediary, so say it
 *    explicitly.
 *
 * `no-store` (rather than `no-cache`) so nothing is written down at all.
 */
export function jsonNoStore(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json(body, {
    ...(init?.status !== undefined ? { status: init.status } : {}),
    headers: {
      ...(init?.headers ?? {}),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
