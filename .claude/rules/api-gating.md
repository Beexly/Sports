---
description: Server-side entitlement gating for API routes — no frontend-only paywalls
paths:
  - "apps/web/app/api/**"
  - "apps/web/lib/api-entitlement.ts"
  - "apps/web/lib/entitlements.ts"
---

# API Entitlement Gating

CLAUDE.md non-negotiable #3: **no frontend-only paywalls — enforcement is server-side only.** A client component may hide a button or blur a card, but that is UX, not security. The route handler behind the data is what actually decides who gets it.

## The real helpers

**`getUserEntitlements(userId: string): Promise<Entitlements>`** — `apps/web/lib/entitlements.ts`. The single DB-backed source of truth for a user's tier. Its own catch only handles an unreachable database (Prisma `P1001` / "Can't reach database server") and returns `FREE` for that case; any other lookup error rethrows rather than resolving a tier itself. It is `gateApi`'s `evaluateGate` (`apps/web/lib/api-entitlement.ts`) that wraps the `getUserEntitlements` call in its own try/catch and falls back to `FREE` on *any* thrown error — so callers that go through `gateApi`/`requirePremiumApi`/`requireFantasyApi` fail closed to `FREE` overall, but `getUserEntitlements` called directly does not. Applies `PAST_DUE_GRACE_DAYS` (7 days) for subscriptions retrying a failed charge, anchored to `pastDueSince` so retries can't extend the window.

**`gateApi(predicate, message?)`** — `apps/web/lib/api-entitlement.ts`. The base primitive: runs `auth()` once, resolves entitlements via `getUserEntitlements`, and returns `null` if `predicate(entitlements)` is true, else a ready-to-send `NextResponse` (401 if unauthenticated, 403 if under-tier).

**`requirePremiumApi()`** — pre-built `gateApi` call for the PRO/ELITE floor (`isPremium = tier === "PRO" || tier === "ELITE"`). Use this on premium analytics endpoints (`/api/intelligence/*`, `/api/nflverse/*`). Note: FANTASY is a separate paid tier for the fantasy suite, not betting-depth — it must NOT pass this gate (see `requireFantasyApi` for that surface instead).

**`requirePremiumApiRateLimited(bucketId: string)`** — same PRO/ELITE floor as `requirePremiumApi`, plus a per-user rate limit applied *after* the entitlement check, so a 429 never masks the paywall. `bucketId` should be a stable per-endpoint name (e.g. `"intelligence/combine"`) so budgets don't cross-contaminate between endpoints.

## Exact usage pattern (from the header comment in `api-entitlement.ts`)

```ts
export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApi();
  if (denied) return denied;
  ...
}
```

Always call the gate **before** any data read. Always `return` the helper's response verbatim when it is non-null — do not inspect, transform, or short-circuit it.

## Rules

1. Client components (`"use client"`) never decide access. They may read a tier prop for display, but the underlying route/page must independently re-check server-side — a directly-fetched API URL bypasses any UI gate entirely.
2. Every premium route handler under `apps/web/app/api/**` calls `gateApi`, `requirePremiumApi`, `requirePremiumApiRateLimited`, `requireFantasyApi`, or `requireFantasyApiRateLimited` before touching the database or composing a response body.
3. Free tier sees a 2-pick teaser with **no confidence scores** — `dailyPickLimit` is `2` for non-Pro tiers and `null` (unlimited) for Pro in `packages/types/src/index.ts`. `apps/web/lib/pricing/feature-gates.ts` (under `lib/pricing/`, not directly under `lib/`) is a presentation/lock-state layer only — it drives the pricing page, locked-state components, and upgrade CTAs (what customers see as visible/blurred/teased), and says so in its own header comment. It enforces nothing. Actual per-feature access is decided server-side by `getUserEntitlements` (`apps/web/lib/entitlements.ts`) plus the API/page guards in `apps/web/lib/api-entitlement.ts` (`gateApi`, `requirePremiumApi`, `requireFantasyApi`, etc.).
4. When a gate helper returns non-null, `return` it immediately as the handler's response — it is already a fully-formed `NextResponse` (401 unauthenticated / 403 under-tier / 429 rate-limited) and must not be rewrapped.
5. New premium surfaces should reuse `isPremium`'s PRO/ELITE definition rather than re-deriving tier checks inline — keying on `tier !== "FREE"` has previously leaked paid analytics to the FANTASY tier by accident.
