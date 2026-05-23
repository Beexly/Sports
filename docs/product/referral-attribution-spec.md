# Referral Attribution — Spec (R&D-extract scaffold)

> **Status:** scaffold, awaiting Codex Pass 12 contract extraction.
> Owner has not yet ratified R&D-extract vs merge path
> (`docs/ops/stuck-queue.md`). When the path lands and the Codex
> contract files are shared, this scaffold is the canonical home for
> the extracted design.
>
> Master plan reference: Part 2.E (monetization beyond subscriptions,
> sportsbook affiliate signups), Part 6 decision #12 (one subtle
> deeplink per pick), Part 6 open commercial decision (sportsbook
> affiliate program enrollment).
>
> Sibling specs: `email-lifecycle-spec.md`,
> `stripe-webhook-decisioning-spec.md`.

## What this covers

How Galaxy tracks where a user came from (organic, partner referral,
sportsbook deeplink click, creator code) and attributes downstream
events (signup, subscription, sportsbook signup) back to the source.

Does NOT cover:

- The display logic for the sportsbook deeplink itself — that lives
  in the pick detail page component (master plan Part 6 decision #12:
  one subtle link, pick detail page only).
- Affiliate-network-specific tracking (DK / FD / MGM / Caesars each
  have their own SDK / postback shape) — those are buyer-specific
  implementations layered on top of this attribution model.
- B2B / API attribution (Phase 5).

## The attribution model

Three sources contribute to a user's attribution chain. Each contributes
to a single `Attribution` row stored at signup-time:

1. **First-touch source** — where the user *first* hit a Galaxy URL.
   Captured via a session cookie set on first visit, persisted across
   the visit and rolled into the User row at signup.
2. **Conversion source** — where the user was when they signed up
   (signup page referrer, landing page they came from, etc.).
3. **Lifetime attribution** — every sportsbook deeplink click,
   creator code use, and partner-referred event after signup gets
   logged to `AttributionEvent` so the LTV report can split by source.

Tracking is **first-party only**. No external trackers, no fingerprint
libraries, no third-party cookies. Master plan Part 4 implicit
non-negotiable: privacy posture matches the privacy policy.

## Identifier types

Three kinds of source identifiers Galaxy honors:

| Kind | Example | Set by | Captured how |
|---|---|---|---|
| `utm` | `?utm_source=twitter&utm_campaign=launch` | Marketing campaigns, any inbound link | Read on every request, stored in cookie |
| `ref` | `?ref=alex` | Creator codes (the owner in Phase 3, multi-contributor in Phase 6+) | Same as utm |
| `partner` | `?partner=actionnetwork` | B2B partner attribution | Same as utm |

All three resolve through one function `resolveAttribution(req)` that
returns `{ source, medium, campaign, ref?, partner?, firstSeenAt }`.

Cookie expires after 30 days. Conversion-attribution windows beyond
30 days fall back to "organic" honestly — Galaxy doesn't pretend to
attribute six-month-old clicks.

## Storage

New Prisma models (Codex proposes schema in a markdown handoff per
master plan Part 1):

```prisma
model Attribution {
  id              String   @id @default(cuid())
  userId          String   @unique
  firstSource     String   // "twitter" | "google" | "actionnetwork" | "alex" | "organic" | ...
  firstMedium     String   // "social" | "search" | "partner" | "referral" | "organic" | "direct"
  firstCampaign   String?
  firstSeenAt     DateTime
  conversionSource    String   // where they were at signup; may equal firstSource
  conversionMedium    String
  conversionCampaign  String?
  signupAt        DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([firstSource])
  @@index([conversionSource])
}

model AttributionEvent {
  id              String   @id @default(cuid())
  userId          String
  kind            String   // "sportsbook-click" | "creator-code-applied" | "partner-link-followed" | "subscription-started"
  source          String   // who they were attributed to at the moment of the event
  metadata        Json     // event-specific payload (e.g. which sportsbook, which pick ID)
  occurredAt      DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, kind])
  @@index([source, occurredAt])
}
```

Indexes justified: source-rollup reports (`@@index([source, occurredAt])`),
per-user event timeline (`@@index([userId, kind])`), first-touch rollup
(`@@index([firstSource])`).

## Hard rules

1. **No silent merging.** If `Attribution` already exists for a user
   (re-signup edge case), the new conversion event is logged to
   `AttributionEvent` but the first-touch row stays sacred. First-touch
   is set once and never overwritten.
2. **No third-party trackers.** First-party cookie + UTM params + ref
   codes only. Privacy policy §3 already documents this.
3. **No retroactive attribution.** If a user's cookie expired before
   signup, they're "organic" — Galaxy doesn't replay session graphs
   or guess.
4. **Sportsbook clicks are events, not conversions.** A user clicking
   the subtle "Place this at [book]" deeplink fires an
   `AttributionEvent` with `kind: "sportsbook-click"` and the relevant
   `pickId` in metadata. The sportsbook itself owns post-click
   attribution (operator-licensed postback). Galaxy only knows the
   click happened, not whether they actually signed up at the book.
5. **Creator codes are case-insensitive and short** (≤ 16 chars).
   Reserved namespace: `gse-staff-*` for internal codes.

## API surface (when implemented)

```ts
// lib/attribution/resolve.ts
export function resolveAttribution(req: NextRequest): AttributionTouch;

// lib/attribution/store.ts
export async function recordFirstTouch(userId: string, touch: AttributionTouch);
export async function recordConversion(userId: string, touch: AttributionTouch);
export async function recordEvent(userId: string, kind: AttributionKind, metadata: object);
```

## Open questions

- Should creator codes (`ref=alex`) be database-backed (per-creator
  table with payout config) or string-only (config in code)?
  Provisional: Phase 3 = string-only single-creator (the owner);
  Phase 6+ = database-backed multi-contributor (per master plan
  decision #7).
- Does `Attribution` need an audit log for source changes (admin
  override, dispute resolution)? Phase 5 commercial concern — yes for
  B2B contracts, no for Phase 3-4 internal use.
- Sportsbook postback integration — does Galaxy receive operator
  postbacks confirming the signup-and-deposit chain? Pending the
  per-program affiliate enrollment (master plan Part 6 open commercial
  decision).

## Test plan (when implemented)

- `attribution-first-touch-sacred.test.ts` — first-touch row is
  immutable after creation; re-signup logs an event but doesn't
  overwrite.
- `attribution-resolve-utm.test.ts` — every UTM param combo resolves
  correctly; missing UTMs fall back to referrer; missing referrer
  falls back to "organic".
- `attribution-no-third-party-trackers.test.ts` — grep against the
  build output and assert no PostHog / Mixpanel / GA / Segment SDK
  imports leak into the client bundle.
- `attribution-event-kinds-enum.test.ts` — `AttributionEvent.kind`
  matches the locked enum; new kinds need a migration.
- `attribution-cookie-expiry.test.ts` — cookie set with the right
  Max-Age (30d); SameSite=Lax; Secure in production.

## Phase landing

Phase 4 per master plan Part 5 (sportsbook affiliate signup
integrations + reproducibility receipts + loss leaderboard). The
attribution infrastructure has to exist BEFORE the affiliate integrations
can land — without first-touch capture you can't honestly report which
program drove which signups. So this spec ships in early Phase 4
ahead of the actual affiliate program enrollments.
