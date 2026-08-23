# Stripe Webhook Idempotency — Decision Record

**Card:** `CARDS_LAUNCH_QA.md` LQ7 (paywall audit, LOW — research card). Doc only,
zero code diffs. This record exists because every quick fix to the window
described below is either worse than the status quo or outside this deck's
forbidden zones (no Prisma schema migration).

## Current window

`apps/web/app/api/webhooks/stripe/route.ts`, after signature verification and the
durable-store precondition:

1. `const alreadyProcessed = await db.webhookEvent.findUnique({ where: { stripeEventId: event.id } })`
   — the idempotency check.
2. If not already processed, `await handleStripeEvent(event)` runs the actual
   entitlement/subscription sync.
3. Only **after** the handler succeeds does the route
   `db.webhookEvent.create({ data: { stripeEventId: event.id, ... } })` to record
   the event as processed.
4. If step 3 hits a unique-constraint violation (`P2002` on `stripeEventId`,
   detected by `isStripeEventIdConflict`), the route acks `{ received: true, skipped: true }`
   — treating the conflict as evidence a concurrent delivery already handled it.

The window: two concurrent deliveries of the **same** Stripe event both pass the
step-1 check (find nothing) before either reaches step 3, so **both execute
`handleStripeEvent`**. Stripe does send duplicate deliveries in practice (at-least-once
delivery, plus manual "resend" from the dashboard, plus retries on a slow 200).

Safety today rests entirely on **handler idempotency by convention, not structure**:
each `case` in `handleStripeEvent`'s switch re-retrieves current Stripe/subscription
state and upserts rather than blindly incrementing or appending, so running a handler
twice converges to the same end state instead of double-crediting or double-writing.
This has held so far because every handler was written that way — but nothing in the
route enforces it, so a future handler that isn't idempotent (e.g. one that appends
to a list, or fires a side-effecting call like a notification) would silently
reintroduce a real bug under concurrent delivery.

## Option A — status-column insert-first

Insert the `WebhookEvent` row **before** calling the handler, carrying a status so a
concurrent delivery can tell "claimed, in progress" apart from "not yet seen":

```prisma
model WebhookEvent {
  id             String   @id @default(cuid())
  stripeEventId  String   @unique
  type           String
  subscriptionId String?
  payload        Json
  status         WebhookEventStatus @default(PROCESSING)
  processedAt    DateTime @default(now())
  completedAt    DateTime?
  // ...
}

enum WebhookEventStatus {
  PROCESSING
  COMPLETED
  FAILED
}
```

Flow: `create({ stripeEventId, status: PROCESSING })` first (the unique constraint
is now the true claim — a concurrent delivery's `create` gets `P2002` and skips
immediately, **before** running the handler, closing the window structurally). Run
the handler. On success, `update({ status: COMPLETED, completedAt: now() })`. On
handler failure, `update({ status: FAILED })` (or delete the claim) so a legitimate
Stripe retry of a failed delivery isn't permanently blocked by its own earlier
`PROCESSING` row.

**Why this needs a migration, and why that's out of scope here:** `status` and
`completedAt` are new columns — `packages/db/prisma/` is this deck's forbidden zone
(any diff touching it is an automatic reject), and per `CLAUDE.md`/`AGENTS.md`
conventions, schema migrations are founder-applied, not something this deck's
implementer runs unattended. This is a real, structurally-correct fix; it is
**specified, not implemented, here**.

## Option B — pg advisory lock

`pg_advisory_lock(event_id_hash)` around the handler call, held for the duration of
processing, would also close the window without a schema change. Rejected for this
codebase's actual deployment shape:

- `packages/db/prisma/schema.prisma` reads `DATABASE_URL` (runtime queries) and a
  separate `DIRECT_URL` (migrations only) — two different connection strings is a
  deliberate Neon pattern: `DIRECT_URL` is Neon's non-pooled direct endpoint, and
  `DATABASE_URL` is documented in this repo's own ops runbook
  (`docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`) as coming from Neon's
  **pooled** (`-pooler`) connection string. Neither this doc nor the schema file
  contains an actual URL or credential — described by shape/provider only, per this
  deck's standing constraints.
- Neon's pooled endpoint runs PgBouncer in **transaction-mode** pooling: a client
  connection is returned to the pool at the end of each transaction, not held for
  the app's logical session. `pg_advisory_lock` is **session-scoped** — it's released
  when the underlying Postgres session ends, which under transaction-mode pooling
  can happen at the end of the very transaction that took the lock, not when the
  application intends to release it. This makes advisory locks unreliable-by-default
  on this stack: a lock can appear to release early (another concurrent delivery
  proceeds while the first is still "holding" it, in application terms), reopening
  the exact window this option exists to close, with no error to signal the failure.
  `pg_advisory_xact_lock` (transaction-scoped) would be pooling-safe, but only if the
  entire handler ran inside one DB transaction — several handlers in this route call
  external services (Stripe re-fetches, `track()` analytics) inside their body, which
  must not be wrapped in an open DB transaction for the call's duration.

**Rejected**: not proven safe on this stack without a change to how (or whether)
handlers hold a single DB transaction for their full duration — a larger structural
change than this window justifies.

## Option C — accept convention

Keep today's structure (check → handle → record, P2002-as-duplicate-signal) and make
the one thing it actually depends on — every handler being independently idempotent
— an enforced invariant instead of a tribal-knowledge convention:

1. **Document the invariant** directly above `handleStripeEvent`'s `switch`: every
   `case` MUST re-retrieve current state (from Stripe and/or the DB) before writing,
   and MUST converge to the same end state whether it runs once or twice for the
   same event. No `case` may append, increment, or fire a non-idempotent side effect
   (e.g. a one-shot notification) without its own dedupe key.
2. **Specify a test** (not written here — LQ7 is doc-only) that enforces it
   structurally rather than by code review: for each `event.type` handled in the
   switch, construct a representative event, call `handleStripeEvent(event)` twice
   in sequence against the same starting DB state, and assert the resulting DB rows
   (subscription tier, `webhookEvent` count, any other written table) are identical
   after one call and after two. A handler that isn't idempotent fails this test by
   construction — no need to reason about it by inspection.

**Cost:** two concurrent deliveries of one event still both run the handler body
(wasted work, one duplicate `track()` analytics call, etc.) — this option does not
close the execution-doubling window, only guarantees it's harmless.

## Recommendation

**Option C**, for launch. No schema change and no code churn on the money path in
launch week; the existing behavior is already safe in practice (every current
handler is convergent), and this option converts that from an assumption into a
tested guarantee without touching `packages/db/prisma/` or introducing a new lock
primitive whose safety on this stack is unproven. Revisit Option A post-launch once
schema changes aren't launch-week-frozen — it's the structurally correct fix and
should land eventually, just not inside this deck.

## Follow-up card spec

**Card ID:** LQ7-B · stripe-webhook-handler-idempotency-test
**DATA CLASS:** INTERNAL.
**Artifact:** new `apps/web/__tests__/stripe-webhook-handler-idempotency.test.ts`
(+ a doc-comment invariant added directly above `handleStripeEvent` in
`apps/web/app/api/webhooks/stripe/route.ts` — no behavior change, comment only).
**Constraints:** priced:false · fail-closed on missing data · no live-p without
masterplan §6 · no MODEL_VERSION · forbidden: prisma schema, event-odds-ingest
writes, secrets, vercel.json.
**Why:** Option C above is only a real guarantee once it's enforced by a test, not
just documented.
**Spec:** for each `event.type` currently handled in `handleStripeEvent`'s switch
(`checkout.session.completed`, and the others in that function — enumerate by
reading the switch, don't guess the list), build one representative fixture event
per type (mock the Stripe client's return shape the same way this repo's existing
Stripe webhook tests already do — reuse that fixture-building helper if one exists
under `apps/web/__tests__/`, don't invent a second one). Against a shared starting
mock-DB state, call `handleStripeEvent(event)` once and capture every DB write the
mock recorded; reset the mock's call log (not its underlying state) and call
`handleStripeEvent(event)` a second time with the same starting state; assert the
second call's writes are identical in effect to the first (same final row values,
not necessarily the same call count) — a genuinely idempotent handler converges;
one that doesn't will fail this assertion by producing a different end state.
**Verify:**
```
npm run test --workspace=apps/web -- __tests__/stripe-webhook-handler-idempotency.test.ts && npm run typecheck --workspace=apps/web
```
**Attacks:** a test that asserts the handler was called exactly once (that's testing
the ROUTE's dedupe, already covered elsewhere — this test is about the HANDLER's own
convergence, called directly, bypassing the route's dedupe entirely, since the whole
point is what happens when dedupe fails to prevent a double-call); a fixture event
type not present in the actual switch (silently untested case); comparing mock
*call arguments* instead of resulting DB *state* (a handler could be called with
identical args both times and still leave different state if it reads mutable
context between calls — state comparison is the real assertion).
