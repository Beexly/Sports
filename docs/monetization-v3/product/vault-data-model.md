# Vault Data Model

Status: implementation contract
Build gate: Vault customer-development GO decision

This document defines the logical data model for Vault. Translate names and field types into the actual ORM/database conventions of the Galaxy app once the engineering repo is active.

## Design Principles

- Entitlement must be independently checkable from Pro/Elite.
- Founding seat order must be durable and auditable.
- Cancellations keep access through the paid term.
- Content must be publishable without code deploys.
- Referral attribution must survive subscription changes and refunds.

## Entities

## VaultMember

Represents a paid or formerly paid Vault member.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `userId` | string | yes | References app user |
| `stripeCustomerId` | string | yes | Stripe customer |
| `stripeSubscriptionId` | string | yes | Stripe subscription |
| `foundingNumber` | integer | yes | Sequential 1-1000 where applicable |
| `joinedAt` | datetime | yes | First paid access |
| `currentPeriodEnd` | datetime | yes | Access valid until this date |
| `status` | enum | yes | `active`, `trialing`, `past_due`, `canceled`, `expired`, `refunded` |
| `discordUserId` | string | no | Set after Discord link |
| `discordRoleGrantedAt` | datetime | no | Audit |
| `discordRoleRemovedAt` | datetime | no | Audit |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Unique `userId`
- Unique `stripeSubscriptionId`
- Unique `foundingNumber`
- Index `status`
- Index `currentPeriodEnd`

## VaultApplication

Captures founding-50 and waitlist applications.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `firstName` | string | yes | Public form |
| `email` | string | yes | Public form |
| `freeformAnswer` | text | yes | "Why are you applying?" |
| `source` | string | no | `interview`, `elite`, `public`, `referral` |
| `referredBy` | string | no | User id or free text |
| `status` | enum | yes | `submitted`, `reviewed`, `approved`, `declined`, `waitlisted`, `converted` |
| `reviewedBy` | string | no | Garrett/admin user id |
| `reviewedAt` | datetime | no | Audit |
| `decisionNote` | text | no | Internal |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Index `email`
- Index `status`
- Index `source`

## VaultDigest

Weekly member-only digest.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `slug` | string | yes | URL-safe |
| `title` | string | yes | Member-facing |
| `publishDate` | datetime | yes | Scheduled or actual |
| `status` | enum | yes | `draft`, `scheduled`, `published`, `archived` |
| `author` | string | yes | Usually Garrett |
| `weekCovered` | string | yes | e.g. `2026-W23` |
| `publicationSummary` | text | yes | Plain statement |
| `drivingFactor` | text | yes | Main section |
| `underlyingAssumption` | text | yes | Main section |
| `flipCondition` | text | yes | Main section |
| `rerunLesson` | text | yes | Main section |
| `memberNote` | text | no | Discussion prompt |
| `bodyMarkdown` | text | yes | Rendered content |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Unique `slug`
- Index `status`
- Index `publishDate`

## VaultOfficeHours

Monthly live session metadata.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `title` | string | yes | e.g. `June 2026 Office Hours` |
| `eventDate` | datetime | yes | Live session |
| `registrationLink` | string | no | Discord event, Zoom, etc. |
| `capacity` | integer | no | V1 limit 100 |
| `status` | enum | yes | `scheduled`, `completed`, `canceled` |
| `recordingUrl` | string | no | Gated replay |
| `transcriptUrl` | string | no | Gated searchable transcript |
| `notesMarkdown` | text | no | Summary |
| `questionsAddressedMarkdown` | text | no | Archive |
| `commitmentsMarkdown` | text | no | Commitments made during the session |
| `commitmentsCompletedAt` | datetime | no | Set when all follow-ups are done |
| `attendanceCount` | integer | no | Live attendance |
| `recordingViews7d` | integer | no | Replay views within seven days |
| `garrettTalkTimePercent` | integer | no | Rolling quality signal |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

## VaultQuarterlyReview

Quarterly private data review archive.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `quarter` | string | yes | e.g. `2026-Q3` |
| `title` | string | yes | Member-facing |
| `publishDate` | datetime | yes | Actual publish |
| `status` | enum | yes | `draft`, `published`, `archived` |
| `pdfUrl` | string | yes | Gated PDF |
| `recordingUrl` | string | no | Walkthrough |
| `summaryMarkdown` | text | yes | Member-facing |
| `keyChartsMarkdown` | text | no | Optional |
| `limitationsMarkdown` | text | yes | Required honesty section |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Unique `quarter`
- Index `status`

## VaultReferralAttribution

Tracks member referral attribution and payout eligibility.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `referrerUserId` | string | yes | Existing member |
| `referredUserId` | string | no | Set after conversion |
| `referredEmail` | string | yes | Captured before conversion |
| `attributionCode` | string | yes | Stable member referral code |
| `clickedAt` | datetime | yes | Last click timestamp |
| `clickExpiresAt` | datetime | yes | 30-day attribution window |
| `eligibleUntil` | datetime | yes | First-year payout window |
| `status` | enum | yes | `clicked`, `converted`, `active`, `expired`, `voided`, `self_referral_blocked` |
| `grossRevenueCents` | integer | no | Stripe-derived |
| `commissionRateBps` | integer | yes | 1000 for 10% |
| `commissionAccruedCents` | integer | no | Running earned amount |
| `commissionPaidCents` | integer | no | Amount already credited or paid |
| `payoutPreference` | enum | yes | `subscription_credit`, `stripe_connect_cash` |
| `stripeConnectAccountId` | string | no | Required for cash payout |
| `lastAccruedAt` | datetime | no | Monthly accrual checkpoint |
| `voidReason` | string | no | Refund, abuse, self-referral, manual |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Unique `attributionCode`
- Index `referrerUserId`
- Index `referredEmail`
- Index `status`

## VaultReferralPayout

Monthly payout batch line for referral operations.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `referrerUserId` | string | yes | Existing member |
| `period` | string | yes | e.g. `2026-07` |
| `amountCents` | integer | yes | Net payout after clawbacks |
| `destination` | enum | yes | `subscription_credit`, `stripe_connect_cash` |
| `status` | enum | yes | `pending_review`, `approved`, `paid`, `clawed_back`, `forgiven`, `voided` |
| `reviewedBy` | string | no | Admin user id |
| `reviewedAt` | datetime | no | Manual V1 approval |
| `stripeTransferId` | string | no | Cash payout reference |
| `stripeCreditId` | string | no | Subscription credit reference |
| `notes` | text | no | Manual review notes |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Unique `referrerUserId`, `period`
- Index `status`

## VaultLifecycleEmail

Tracks welcome, retention, renewal, cancellation, referral, and re-engagement emails.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Primary key |
| `vaultMemberId` | string | yes | References `VaultMember` |
| `templateKey` | string | yes | `welcome_day_0`, `retention_day_30`, etc. |
| `scheduledFor` | datetime | yes | Absolute send time |
| `sentAt` | datetime | no | Actual send time |
| `status` | enum | yes | `scheduled`, `sent`, `skipped`, `paused`, `failed` |
| `skipReason` | string | no | Engagement healthy, canceled, incompatible cancel reason, etc. |
| `providerMessageId` | string | no | Email provider id |
| `createdAt` | datetime | yes | System |
| `updatedAt` | datetime | yes | System |

Indexes:

- Unique `vaultMemberId`, `templateKey`
- Index `scheduledFor`
- Index `status`

## Entitlement Logic

User has Vault access if:

```text
VaultMember.status in ("active", "trialing", "past_due", "canceled")
AND VaultMember.currentPeriodEnd >= now()
```

Expired, refunded, and deleted users do not have access.

## Founding Seat Assignment

Seat assignment must be transactionally safe:

1. Count existing `VaultMember` rows with `foundingNumber <= 1000`.
2. Lock or transact before assigning next number.
3. Assign next integer.
4. If next integer exceeds 1000, route to waitlist or non-founding behavior.

Never compute founding number client-side.

## Audit Events

At minimum log:

- Vault subscription created.
- Vault subscription canceled.
- Vault member expired.
- Refund issued.
- Discord role granted.
- Discord role removed.
- Digest published.
- Quarterly review published.
- Referral converted.
- Referral payout accrued, approved, paid, clawed back, or forgiven.
- Lifecycle email scheduled, sent, skipped, or failed.
- Office-hours transcript attached.

These can be app logs initially, but should become a durable audit table if Vault scales.
