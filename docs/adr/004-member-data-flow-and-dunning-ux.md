# ADR 004 — Member Data Flow Integrity + Dunning UX + Pipeline Test Floor

**Date:** 2026-06-11
**Status:** Accepted
**Author:** Autonomous loop (post-launch stabilization, cycle 2)

## Context

Cycle 1 (ADR 003) fixed the public board confidence leak and added the
PAST_DUE grace window. Continuing the audit into member-facing surfaces
and the ingestion pipeline found four more gaps:

1. **Dashboard confidence leak.** `/dashboard` queried today's picks
   with **no tier filter** and rendered the numeric confidence
   (`{pick.confidence}% conf` + a confidence bar) to every logged-in
   member. A free signup saw up to 6 picks with confidence — the FREE
   tier promises 1 pick/day with no confidence scores.
2. **Paying members got the FREE view on /picks.** The picks page
   fetched its own `/api/picks` server-side without forwarding cookies
   and with `revalidate: 1800` — so the API always saw an anonymous
   viewer and the page served the cached FREE payload to everyone,
   including PRO/ELITE members.
3. **Dunning was a dead end.** `invoice.payment_action_required`
   (3D Secure) was ignored, and nothing anywhere told a PAST_DUE member
   their card needed attention — the `ManageSubscriptionButton`
   component existed but no page used it.
4. **The 30-minute production heartbeat was untested.**
   `@sports/ingestion-pipeline` (processSport/settleSport — the single
   source of truth for pick generation and settlement) had no test
   script at all, so `npm test --workspaces` silently skipped it.

## Decision

### 1. Dashboard enforces the tier server-side

The dashboard now loads `getUserEntitlements(user.id)` and applies the
same gate as `/api/picks`: non-premium members get `tier: "FREE"` rows
capped at `dailyPickLimit`; confidence rendering is behind
`canSeeConfidence`, with a "Conf · Pro" upgrade link in its place. The
Tier stat card shows the real tier instead of a generic "Member".

### 2. Members reach /api/picks as themselves

`fetchPicks` forwards the session cookie with `cache: "no-store"` when
a session exists, so the server tier gate returns the entitled view and
premium payloads never enter the shared data cache. Anonymous traffic
keeps the cached fetch (`revalidate: 1800`).

### 3. Honest daily-limit messaging

`/api/picks` now reports `totalAvailableToday` (full published count —
already public as the board's `openPicks`) and `hitDailyLimit` for
non-premium viewers. The paywall banner says "N signals published today
— you're seeing 1" instead of silently truncating.

### 4. Dunning loop closed end to end

- Webhook handles `invoice.payment_action_required` by re-syncing the
  subscription, so a 3DS-stuck payment surfaces as PAST_DUE/INCOMPLETE.
- `getBillingNotice(userId)` (lib/billing/notice.ts) derives a banner
  state server-side: `PAST_DUE_IN_GRACE` (with the grace deadline from
  `pastDueSince + PAST_DUE_GRACE_DAYS`), `PAST_DUE_EXPIRED`, or
  `INCOMPLETE`. Missing anchor fails closed, matching entitlements.
- The dashboard renders `BillingNoticeBanner` with the previously
  orphaned `ManageSubscriptionButton`, sending members to the Stripe
  billing portal to fix their card.

### 5. Pipeline behavioral test floor

`@sports/ingestion-pipeline` gains a vitest harness and 26 tests
pinning the documented invariants: settlement always runs (bootstrap
never blocks it), CLV/game-log/snapshot failures never abort
settlement, learning eligibility requires gate + canonical pick +
decisive result, stale data fails the run, `isBootstrap` and the CLV
lock are immutable creation fields, snapshots use `update: {}`, and
errors mark the IngestionRun FAILED instead of throwing.

## Consequences

- Every member surface (API and pages) now resolves entitlements
  through the same server-side helper; there is no rendered surface
  that shows confidence to a viewer without `canSeeConfidence`.
- PRO/ELITE members actually receive what they pay for on /picks, and
  premium responses are never cached across viewers.
- A member with a failing card sees what's wrong, what they keep, the
  deadline, and a one-click path to fix it.
- Regressions in the 30-minute ingestion/settlement heartbeat now fail
  CI rather than surfacing as stale picks in production.
