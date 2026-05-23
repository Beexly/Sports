# Vault API Contracts

Status: implementation contract
Build gate: Vault customer-development GO decision

Use existing app API conventions when implementing. These contracts define behavior, not framework.

## Auth Rules

- Public routes: landing page, application submit, seat count.
- Vault member routes: digest archive, office hours archive, quarterly reviews, member dashboard, referral dashboard.
- Admin routes: content create/update, application review, manual role repair, referral payout review, retention review.

All member/admin routes must check server-side authorization. Client-side hiding is not enough.

## GET `/api/vault/seat-count`

Purpose: live founding seat counter.

Auth: public.

Response:

```json
{
  "cap": 1000,
  "filled": 87,
  "remaining": 913,
  "waitlistOpen": false
}
```

Rules:

- `filled` counts assigned founding numbers.
- If cap reached, `remaining = 0` and `waitlistOpen = true`.
- Must not expose member identity.

## POST `/api/vault/apply`

Purpose: founding-50 or waitlist application.

Auth: public, rate-limited.

Request:

```json
{
  "firstName": "Garrett",
  "email": "reader@example.com",
  "freeformAnswer": "I read the Loss Room before the Ledger.",
  "source": "public",
  "referralCode": "optional"
}
```

Response:

```json
{
  "ok": true,
  "applicationId": "app_123",
  "status": "submitted"
}
```

Validation:

- Email required and valid.
- Freeform answer required, 20-2000 chars.
- Source allowlisted.
- Rate-limit by IP and email.

## GET `/api/vault/member`

Purpose: member dashboard data.

Auth: Vault member.

Response:

```json
{
  "member": {
    "foundingNumber": 87,
    "status": "active",
    "currentPeriodEnd": "2027-05-22T00:00:00.000Z"
  },
  "latestDigest": {
    "slug": "2026-w23-the-pass-that-mattered",
    "title": "The Pass That Mattered"
  },
  "nextOfficeHours": {
    "eventDate": "2026-06-09T20:00:00-04:00",
    "registrationLink": "https://..."
  },
  "latestQuarterlyReview": {
    "quarter": "2026-Q2",
    "title": "Q2 Private Data Review"
  },
  "referrals": {
    "referralUrl": "https://galaxysportsedge.com/vault?ref=user_123",
    "activeReferrals": 2,
    "pendingCreditCents": 333
  },
  "retention": {
    "nextLifecycleEmailKey": "retention_day_30",
    "nextLifecycleEmailDate": "2026-06-21T00:00:00.000Z"
  }
}
```

## GET `/api/vault/digests`

Purpose: digest archive listing.

Auth: Vault member.

Response:

```json
{
  "digests": [
    {
      "slug": "2026-w23-the-pass-that-mattered",
      "title": "The Pass That Mattered",
      "publishDate": "2026-06-10T00:00:00.000Z",
      "summary": "A short member-facing summary."
    }
  ]
}
```

## GET `/api/vault/digests/[slug]`

Purpose: one digest.

Auth: Vault member.

Response:

```json
{
  "slug": "2026-w23-the-pass-that-mattered",
  "title": "The Pass That Mattered",
  "publishDate": "2026-06-10T00:00:00.000Z",
  "bodyMarkdown": "..."
}
```

## GET `/api/vault/office-hours`

Purpose: upcoming and archived office hours.

Auth: Vault member.

Response:

```json
{
  "upcoming": [],
  "archive": [
    {
      "id": "oh_2026_06",
      "title": "June 2026 Office Hours",
      "eventDate": "2026-06-09T20:00:00-04:00",
      "recordingUrl": "https://...",
      "transcriptUrl": "https://...",
      "notesMarkdown": "...",
      "commitmentsMarkdown": "..."
    }
  ]
}
```

## GET `/api/vault/referrals`

Purpose: member referral dashboard.

Auth: Vault member.

Response:

```json
{
  "referralUrl": "https://galaxysportsedge.com/vault?ref=user_123",
  "rate": "10%",
  "windowMonths": 12,
  "attributionWindowDays": 30,
  "payoutPreference": "subscription_credit",
  "summary": {
    "clicks30d": 9,
    "convertedReferrals": 2,
    "activeReferrals": 2,
    "pendingCreditCents": 333,
    "paidCreditCents": 0
  },
  "referrals": [
    {
      "status": "active",
      "convertedAt": "2026-06-01T00:00:00.000Z",
      "eligibleUntil": "2027-06-01T00:00:00.000Z",
      "commissionAccruedCents": 167
    }
  ]
}
```

Rules:

- Link format is `galaxysportsedge.com/vault?ref=<stableUserId>`.
- 30-day attribution window.
- Last click wins.
- Self-referral blocks payment method or residential address matches unless Garrett manually approves.
- Referrer identity is not exposed to the referred user by default.

## PATCH `/api/vault/referrals/payout-preference`

Purpose: member changes referral payout preference.

Auth: Vault member.

Request:

```json
{
  "payoutPreference": "stripe_connect_cash",
  "stripeConnectAccountId": "acct_..."
}
```

Response:

```json
{
  "ok": true
}
```

## GET `/api/vault/quarterly-reviews`

Purpose: quarterly review archive.

Auth: Vault member.

Response:

```json
{
  "reviews": [
    {
      "quarter": "2026-Q2",
      "title": "Q2 Private Data Review",
      "publishDate": "2026-07-15T00:00:00.000Z",
      "pdfUrl": "https://...",
      "recordingUrl": "https://..."
    }
  ]
}
```

## POST `/api/webhooks/stripe`

Purpose: subscription lifecycle.

Events to handle:

- Checkout/session completed.
- Subscription created/updated/deleted.
- Invoice paid/failed.
- Charge refunded.

Vault side effects:

- Create or update `VaultMember`.
- Assign founding number transactionally.
- Send onboarding email sequence trigger.
- Schedule lifecycle emails for welcome, retention, renewal, cancellation, and re-engagement.
- Apply referral attribution, monthly accrual, and clawback side effects.
- Queue Discord role grant if Discord user linked.
- Keep access through paid term after cancellation.

## POST `/api/webhooks/discord`

Purpose: optional Discord link/role repair path.

Auth: signed secret.

Rules:

- Role grant/removal must be idempotent.
- Failure should create an admin-visible repair task.
- Never remove role before paid term ends unless refund or abuse action requires it.

## Admin Endpoints

Implementation can be UI actions rather than public REST endpoints, but behavior must exist:

- Create/edit/schedule/publish digest.
- Create/edit office-hours event.
- Publish quarterly review.
- Review Vault application.
- Manually repair Discord role.
- Review monthly referral payout batch.
- Review retention queue and engagement-gated Day 60 sends.
- Export KPI data.

## Error Shape

Use consistent response:

```json
{
  "ok": false,
  "error": {
    "code": "VAULT_ACCESS_REQUIRED",
    "message": "Vault membership is required."
  }
}
```

Do not leak whether a specific email is a member.
