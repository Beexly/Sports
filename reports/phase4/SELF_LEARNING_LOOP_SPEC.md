# Phase 4 — Self-Learning Loop: Spec (PARKED for owner approval)

**Status:** PARKED — not built overnight, by design. A genuine "learn from how visitors behave"
loop needs a **first-party engagement signal that does not exist yet** (`apps/web/lib/analytics/
events.ts` is a typed registry whose `track()` dispatches to optional client providers but
**persists nothing server-side**). Building a loop without real signal would mean fabricating
"popular"/"trending" — a direct violation of the no-fake-data bar. So this is the precise,
ready-to-execute spec; it ships only after the owner approves the one schema addition it needs.

## The customer metric it improves
**Time-to-value on the public content/board surfaces** — surface the content a visitor is most
likely to find useful *first* (relevant, current), measured by engagement on the re-ordered
surface vs. the static order. Concretely: ordering of `/blog`, the board lanes, and the homepage
sections.

## Why it's parked (the honest blocker)
- No persisted first-party engagement data → nothing real to learn from.
- The only honest interim signal is **settled-pick / seasonality data** (already available), which
  gives *deterministic relevance ranking*, NOT behavioral learning. That modest slice is listed in
  the plan as optional (G) and can ship without the store; the *true* loop below needs the store.

## What it needs (the one owner-gated piece)
A minimal, privacy-safe first-party **engagement store** (Prisma model → migration = owner-gated):

```prisma
model EngagementEvent {
  id         String   @id @default(cuid())
  event      String   // from the typed AnalyticsEvent union — never freeform
  surface    String   // e.g. "blog", "board", "home"
  refId      String?  // e.g. blog slug / lane id — NO user identifier
  weight     Int      @default(1)
  createdAt  DateTime @default(now())
  @@index([surface, refId, createdAt])
}
```
- **No PII, no user id, no IP** — only the non-identifying funnel context the existing
  `AnalyticsContext` already permits. Aggregate-only.
- Written via a thin server action that extends the existing `track()` contract (so call sites
  don't change), behind a gate flag `ENGAGEMENT_STORE_ENABLED` (default off).

## The loop (reversible + gated + honest)
1. **Capture** (gated): `track()` → server action → `EngagementEvent` (aggregate, no PII).
2. **Aggregate** (pure, testable): a loader computes a recency-weighted engagement score per
   `(surface, refId)` over a rolling window.
3. **Rank** (pure, testable): `rankBySignal(items, scores)` re-orders an existing surface; **falls
   back to the current deterministic order** (featured/date/confidence) when the store is empty,
   the flag is off, or the read fails. Degrades honestly — never fabricates.
4. **Gate**: `ENGAGEMENT_LEARNING_ENABLED` (default off) controls whether ranking applies; the
   store flag controls capture. Both default off → behavior identical to today.
5. **Measure**: compare engagement on the ranked vs. static order (the customer metric). All
   loader-backed; shown only with a real sample.

## Guardrails honored
- No MODEL_VERSION/model change (this is content ordering, not the prediction model).
- No new public page or /cockpit dashboard.
- Reversible (two default-off flags) + honest (degrades to current order; no fabricated signal).
- Privacy-safe (aggregate, no PII) — needs a privacy glance at approval time.

## Build plan once approved (all build-verifiable, no browser needed for the logic)
1. Prisma model + migration (owner-gated). 2. `lib/engagement/store.ts` (write, never-throw, gated).
3. `lib/engagement/rank.ts` (pure aggregate + `rankBySignal`, unit-tested incl. empty/fallback).
4. Wire `rankBySignal` into the existing `/blog` + board loaders behind the flag. 5. Tests for
fallback, gating, recency weighting, and the no-fabrication guarantee.

## Interim (no store needed) — optional slice G
Deterministic **seasonality/settled-pick ordering** of `/blog` (boost posts whose sport has the
most settled picks this month), env-gated, degrades to current order, unit-testable with mock
settled-pick data. Real signal, honest, reversible — but it's relevance ranking, not the
behavioral loop above. Ship only if it clears the full gate and the owner wants it.
