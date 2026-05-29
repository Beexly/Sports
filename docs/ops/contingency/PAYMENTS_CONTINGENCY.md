# Payments Contingency

How Galaxy handles payment-side failures without breaking trust with
existing paying users.

## State at RC

Payments are **disabled** at this release candidate (`internal-calibration` launch mode → `payments: false`). This doc covers what happens when payments are enabled in a future launch mode.

## Failure surfaces

| Surface | Provider dependency | Failure handling |
|---|---|---|
| `/pricing` checkout | Stripe Checkout | Disable button, show "payments paused" banner |
| Subscription webhook | Stripe → `/api/webhooks/stripe` | Signature verify, idempotent write, 400 on mismatch |
| Customer portal | Stripe Billing Portal | Disable portal link, fallback contact-support copy |
| Entitlement check | DB (Prisma) | Cached on session; DB is source of truth |
| Refund / dispute | Manual via Stripe Dashboard | Document in `INCIDENT_RESPONSE_MATRIX.md` |

## Core invariant: existing entitlements survive every Stripe outage

Entitlements live in the DB. A Stripe outage cannot revoke them.

```
Session → JWT → entitlement check from DB row
                    ↓
                Stripe is consulted only for: changes, renewals, cancellations
```

When Stripe is unreachable:
- Existing PRO / ELITE users continue to see their paid surfaces.
- New checkouts are disabled (button greyed, banner explains).
- Cancellations cannot be processed mid-outage; queue them for retry, communicate honestly to the user.
- Webhook events queue; we replay safely because writes are idempotent (event_id is the dedup key).

## Webhook hardening

Required at all times:
1. **Signature verification.** Reject any webhook whose `Stripe-Signature` does not validate.
2. **Idempotency.** Every entitlement write is keyed by `(event_id, action)` to prevent duplicate effects on replay.
3. **Timeout.** Webhook handler returns within 5s. Slow work is queued, not synchronously executed.
4. **No raw card data accepted.** Stripe Elements only.

## Failed-payment flow

When a renewal fails:
1. Stripe sends `invoice.payment_failed` → entitlement remains active until grace period ends.
2. User gets in-app banner: "Renewal failed. Update payment to keep access."
3. Stripe retries per its dunning schedule.
4. If final retry fails: entitlement is downgraded (PRO/ELITE → FREE), not deleted. History is preserved.

## Refund / chargeback handling

- Refunds processed manually via Stripe Dashboard by an authorized operator.
- A refund event triggers entitlement downgrade.
- A chargeback is treated as a SEV-2 incident: document in incident matrix, audit for fraud signals.

## Downgrade protection

When a paid user downgrades or lets a subscription expire:
- Saved cards remain visible.
- Autopsy history remains accessible.
- Tracker data remains accessible.
- Confidence scores and edge indices on new picks are hidden per the FREE tier rules.

History is not paywall-revoked. Only future access is gated.

## Payments-disabled mode

In `internal-calibration` (current RC):
- `/pricing` shows tiers as informational only, no checkout.
- Paywall middleware short-circuits to "payments paused" page if a paid surface is hit.
- Webhook endpoint returns 503; no entitlement writes occur.
- Stripe customers from prior testing remain in the DB but inactive.

## What never happens

- Galaxy never charges a card without an explicit, server-verified Stripe checkout.
- Galaxy never silently downgrades a paying user mid-cycle.
- Galaxy never displays a fake "premium" surface to a free user during an outage.
- Galaxy never trusts client-side entitlement state — server is the source of truth.
- Galaxy never bypasses webhook signature checks.
