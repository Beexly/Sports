# Email Lifecycle — Spec (R&D-extract scaffold)

> **Status:** scaffold, awaiting Codex Pass 12 contract extraction.
> Owner has not yet ratified R&D-extract vs merge path
> (`docs/ops/stuck-queue.md`). When the path lands and the Codex
> contract files are shared, this scaffold is the canonical home for
> the extracted design.
>
> Master plan reference: Part 2.E ("Email digest via Resend/Postmark"),
> Part 5 Phase 3 (Discord bot / Telegram alerts / email digest), Part 6
> open decision P1-9 (vendor choice).
>
> Sibling specs: `referral-attribution-spec.md`,
> `stripe-webhook-decisioning-spec.md`.

## What this covers

The full lifecycle of transactional and product email Galaxy Sports
Edge sends users from signup through retention. Does NOT cover:

- NextAuth magic-link / sign-in emails (already provider-managed).
- Marketing one-off blasts (those route through whoever owns press).
- Stripe receipt emails (Stripe's customer-facing receipt template
  handles those — see also `stripe-webhook-decisioning-spec.md`).

## Vendor decision (P1-9, blocked)

**Status:** open per `docs/ops/stuck-queue.md`. Codex Pass 12
unilaterally picked Postmark in the OneDrive clone's `.env.example`.
Pass 7 had recommended Resend. Owner ratification needed before any
implementation lands in this primary tree.

Vendor-agnostic implementation pattern (chosen as a hedge):

- Single `lib/email/send.ts` exposes `sendTransactionalEmail(...)`.
- One adapter file per vendor (`lib/email/adapters/resend.ts`,
  `lib/email/adapters/postmark.ts`). Adapter is selected at module
  load via `EMAIL_PROVIDER` env var.
- Templates live as separate files (React Email if Resend wins; plain
  HTML strings if Postmark wins — both render server-side).
- All sends are idempotent via a stored `EmailSend` row keyed on
  (userId, kind, idempotencyKey). Retries don't duplicate.

## The lifecycle stages

Ordering = chronological from a user's first session forward.

### Stage 1 — Welcome (immediate after signup)

Trigger: `User.createdAt` row, fired once per user.

Content shape:
- Subject: "Welcome to Galaxy Sports Edge — here's how the math
  works."
- Body: short intro, link to `/methodology`, link to today's free
  pick, link to `/responsible-play`. No upsell on the first email.
- Compliance: 1-800-GAMBLER footer (via `HELPLINE` from
  `lib/brand.ts`).

### Stage 2 — Day-2 calibration nudge

Trigger: 36-48h after signup, only if user has opened the app at
least once.

Content shape:
- Subject: "Today's slate — and what the model gated."
- Body: 3 free-tier surfaces highlighted (Gate Cam, Live Calibration,
  Pass List). One sentence on Pro / Elite, no hard upsell.

### Stage 3 — First settled-pick post-mortem (Pro / Elite only)

Trigger: first time a published pick that the user viewed has
settled.

Content shape:
- Subject: "Your first settled pick — what the math saw."
- Body: the pick, the outcome, the factor breakdown, link to the
  Public Ledger entry. Heavily templated; one source of truth in
  `lib/email/templates/first-settled.ts`.

### Stage 4 — Weekly "What Was Learned" digest (Elite only)

Trigger: every Sunday morning (Phase 3 deliverable per master plan
Part 5).

Content shape:
- Subject: "What Was Learned — week of [date]"
- Body: synthesized Model Journal essay (Claude-drafted from settled-
  pick data, human-reviewed before send).
- Sender: hq@ (per `LEGAL_EMAIL` in `lib/brand.ts`).

### Stage 5 — Win-back / churn (subscriptions only)

Trigger: 7 days after `Subscription.canceledAt`, only if user
status is CANCELED and no resubscribe has happened.

Content shape:
- Subject: "What we shipped while you were away."
- Body: 3 model-version bumps or major surface ships since they left.
  No discount offer (master plan banned-language rules — no "limited-
  time" or "must subscribe").

### Stage 6 — Payment-failed escalation

Trigger: `invoice.payment_failed` Stripe webhook fires (see
`stripe-webhook-decisioning-spec.md`). Hard-coded escalation ladder:
T+0 retry notice, T+3d second retry, T+7d cancellation warning.

Content shape:
- Subject: explicit at every stage ("Your card was declined" → "Try
  again? We'll downgrade in 4 days" → "Subscription cancels
  tomorrow"). No tout-style softening.

### Stage 7 — Account deletion confirmation

Trigger: user emails `${LEGAL_EMAIL}` (per `lib/brand.ts`) requesting
deletion, account deleted, confirmation sent.

Content shape:
- Subject: "Your account is deleted."
- Body: confirmation of what was deleted, what was retained (tax /
  legal compliance per privacy policy §5), how to re-subscribe later
  if they change their mind.

## Storage

New Prisma model (Codex proposes schema in a markdown handoff per
master plan Part 1):

```prisma
model EmailSend {
  id              String    @id @default(cuid())
  userId          String
  kind            String    // "welcome", "day2", "first-settled", "weekly-digest", "winback", "payment-failed", "deletion-confirm"
  idempotencyKey  String    // unique per (userId, kind, trigger event)
  vendor          String    // "resend" | "postmark"
  vendorMessageId String?
  status          String    // "queued" | "sent" | "bounced" | "complained" | "failed"
  sentAt          DateTime?
  bouncedAt       DateTime?
  payload         Json      // template inputs (for audit + reproducibility)
  createdAt       DateTime  @default(now())
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, kind, idempotencyKey])
  @@index([sentAt])
}
```

Indexes justified: lookup by `(userId, kind)` for "have we sent the
welcome yet?", and `sentAt` for digest scheduling windows.

## Hard rules

1. **Idempotent.** No duplicate sends on retry. Enforced via the
   `@@unique([userId, kind, idempotencyKey])` constraint.
2. **Compliance footer mandatory** on every send: helpline, unsubscribe
   link (where the email kind allows unsubscribe — transactional ones
   like payment-failed do not), physical mailing address (per CAN-SPAM:
   Galaxy Sports Network LLC, registered Texas LLC address).
3. **No tout-language voice** — all templates pass the trust-claims
   scanner before send. Banned-phrase guard runs in the send path,
   not just on templates.
4. **No marketing dressed as transactional** — if it's not directly
   triggered by an account state transition (signup, pick settled,
   payment event, deletion), it's marketing. Marketing requires
   explicit opt-in via `User.marketingOptIn` flag.
5. **Vendor abstraction is mandatory** — never import vendor SDK
   directly outside `lib/email/adapters/*`.

## Open questions

- Should the day-2 nudge route through a BullMQ queue + scheduler, or
  through a daily cron that scans for `User.createdAt BETWEEN
  now-48h AND now-36h`? Pending Codex Pass 12 contract extraction.
- Does Galaxy Sports Network LLC need a registered mailing address
  in the email footer before any sends happen? CAN-SPAM Section 5
  says yes. Owner-only commercial decision — log in
  `docs/ops/decision-log.md` once the LLC's registered office is
  confirmed.

## Test plan (when implemented)

- `email-idempotency.test.ts` — duplicate sends with same idempotency
  key collapse to one row, second call returns existing send.
- `email-compliance-footer.test.ts` — every template includes the
  helpline + mailing address + (where applicable) unsubscribe link.
- `email-banned-phrases.test.ts` — every template passes the trust-
  claims scanner.
- `email-vendor-adapter-contract.test.ts` — Resend and Postmark
  adapters both honor the same `EmailAdapter` interface (parametric
  test, runs against both).
- `email-stage-trigger.test.ts` — each trigger (signup, settled-pick,
  webhook event) creates the expected `EmailSend` row.

## Phase landing

Phase 3 per master plan Part 5 (creator layer + transparency + Twitter
bot + Galaxy Studio v0 + Game Rooms v0 — email digest is the
"transactional + lifecycle" sibling). Stage 1-2 (welcome + day-2) can
ship in Phase 2 if low-effort; Stages 3-7 are Phase 3.
