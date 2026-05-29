# Payment Readiness Checklist

Owner-action gate. `STRIPE_CHECKOUT_ENABLED=true` flip is BLOCKED until
every row is checked.

## Hard prerequisites

- [ ] Stripe secret key set in production env (`STRIPE_SECRET_KEY`)
- [ ] Stripe webhook secret set (`STRIPE_WEBHOOK_SECRET`)
- [ ] Price IDs configured (`STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`)
- [ ] Stripe account in good standing (no holds)
- [ ] Customer support inbox monitored
- [ ] Refund / dispute process documented in `docs/ops/contingency/PAYMENTS_CONTINGENCY.md`

## Webhook hardening tests

- [ ] Signature verification rejects unsigned requests
- [ ] Signature verification rejects requests with bad signatures
- [ ] Idempotency key on entitlement write rejects duplicate (event_id, action) pairs
- [ ] Webhook handler returns within 5s; heavy work queues to worker
- [ ] No raw card data accepted (Stripe Elements only)

## Entitlement preservation tests

- [ ] Existing PRO/ELITE entitlements remain active during Stripe outage
- [ ] DB row is source of truth for entitlement check; not Stripe API
- [ ] Renewal failure triggers grace period; entitlement downgrades only after final retry
- [ ] Downgrade preserves history (saved cards, autopsy entries, tracker rows)

## Failed-payment flow

- [ ] `invoice.payment_failed` event handled
- [ ] User sees in-app banner: "Renewal failed. Update payment to keep access."
- [ ] Stripe dunning runs to completion before any downgrade
- [ ] Final dunning failure downgrades cleanly without data loss

## Refund / chargeback flow

- [ ] Refund event triggers entitlement downgrade
- [ ] Chargeback is treated as SEV-2 incident per INCIDENT_RESPONSE_MATRIX
- [ ] Audit trail preserved for every payment action

## Free-tier and downgrade protection

- [ ] Saved cards visible after downgrade
- [ ] Autopsy history visible after downgrade
- [ ] Tracker data visible after downgrade
- [ ] Free tier renders confidence as null; never leaks paid-tier values
- [ ] Server-side entitlement check on every paywall

## Owner approval block

```
APPROVED-BY:    _____________________________
APPROVAL-DATE:  ____ / ____ / ______
GREEN-LIGHT-FOR: (release-state)
```

Until this block is filled in, `STRIPE_CHECKOUT_ENABLED` stays false.
