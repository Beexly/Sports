# Phase 4 — Promotions / Affiliate Marketplace

Date: 2026-05-18
Branch: `sports-intelligence-os-phase-1` (continued from prior phases)

## Overview

Sportsbook promotions are surfaced as a regulated, compliance-gated
marketplace. The marketplace is *operator-curated* — promotions only render
publicly after a human reviewer has supplied affiliate disclosure, terms,
responsible-gaming copy, and at least one eligible US state.

## Data model

A new `Promotion` model lives alongside the cockpit tables in
`packages/db/prisma/schema.prisma`:

| Field | Notes |
|---|---|
| `id`, `slug` | Stable identifiers |
| `sportsbookKey`, `operatorName` | Operator metadata |
| `headline`, `offerSummary` | Public marketing copy. Scanned for banned hype phrases. |
| `offerCategory` | Enum: `DEPOSIT_MATCH`, `RISK_FREE_BET` (legacy industry term; display copy may NOT use "risk free"), `ODDS_BOOST`, `BONUS_BET`, `SIGNUP_BONUS`, `REFERRAL`, `OTHER` |
| `affiliateType` | Enum: `CPA`, `REVSHARE`, `HYBRID`, `NONE` |
| `affiliateUrl`, `termsUrl`, `promoCode` | Optional links/codes; `termsUrl` required for public render |
| `eligibleStates` (Json), `restrictedStates` (Json) | US state allow/deny lists |
| `country`, `minimumAge` | Default US / 21+ |
| `status` | Enum: `DRAFT`, `NEEDS_REVIEW`, `ACTIVE`, `PAUSED`, `EXPIRED`, `ARCHIVED`, `BLOCKED` |
| `complianceStatus` | Enum: `UNREVIEWED`, `APPROVED`, `NEEDS_TERMS`, `NEEDS_STATE_REVIEW`, `NEEDS_DISCLOSURE`, `BLOCKED` |
| `disclosureText`, `responsibleGamingText` | Required for public render |
| `lastReviewedAt`, `reviewedBy` | Audit trail |
| `expiresAt`, `createdAt`, `updatedAt` | Lifecycle |

## Routes

- Public:
  - `/promotions` — marketplace with optional `?state=XX` filter
  - `GET /api/promotions` — public JSON read
- Cockpit (admin-gated via `apps/web/app/cockpit/layout.tsx`):
  - `/cockpit/promotions` — review queue with per-row publish verdict
  - `/cockpit/promotions/[slug]` — promotion detail + blocker list
  - `GET /api/admin/promotions` — admin JSON read

## Compliance guarantees

The `evaluatePromotionForPublish` guard at
`apps/web/lib/promotions/guards.ts` is the single source of truth. The
public marketplace refuses to surface a row that fails any of:

- Missing `disclosureText`
- Missing `responsibleGamingText`
- Missing `termsUrl`
- Past `expiresAt`
- `status` is anything other than `ACTIVE`
- `complianceStatus` is anything other than `APPROVED`
- Headline / offerSummary contains a banned hype phrase from the trust-claim registry
- No `eligibleStates` declared
- Requested state is in `restrictedStates` or not in `eligibleStates`

All eight rules are covered by `apps/web/__tests__/promotions-guards.test.ts`.

## Cockpit integration

- **BOBBY** owns the promotion review queue. A seed task ("Compliance
  review: FanDuel odds boost — state coverage") drops on first `db:seed`.
- **JARVIS** owns disclosure-missing blocks. A seed task ("Disclosure
  missing: BetMGM signup match draft") drops as a `BLOCKED` row to
  demonstrate the hold.
- No new external-action verbs introduced. Status transitions still flow
  through the existing `transitionTask` allow-list service.

## Seed coverage

`packages/db/prisma/seed.ts` now seeds five demo promotions:

1. `draftkings-bonus-bet-200` — fully compliant, ACTIVE / APPROVED
2. `fanduel-odds-boost-week` — NEEDS_REVIEW / NEEDS_STATE_REVIEW
3. `betmgm-signup-bonus` — DRAFT / NEEDS_TERMS
4. `expired-historical-promo` — EXPIRED (historical audit row)
5. `blocked-noncompliant-promo` — BLOCKED, contains banned hype copy for testing

Plus two companion cockpit_tasks linked into the existing review queue.

## Tests added

- `apps/web/__tests__/promotions-guards.test.ts` (12 assertions)
- `apps/web/__tests__/promotions-public-payload.test.ts` (5 assertions)
- `apps/web/__tests__/public-copy-scanner.test.ts` (updated to scan `/promotions`)
- `apps/web/__tests__/route-smoke.test.ts` (includes promotions routes)

## Runtime blockers

The sandbox could not execute `npm install` / `db:push` / `test` / `build`
because `node_modules/.bin` was emptied by a prior interrupted install and
the mount returns `Operation not permitted` for the cleanup steps.
Validation was performed by static inspection; runtime turn-on is the
operator's next step (see README).
