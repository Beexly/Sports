# Stripe Webhook Decision Scaffold Notes

**Status:** Engineering scaffold. No webhook verification or persistence yet.
**Related decision:** DEC-NEXT-045, DEC-NEXT-060

## DEC-NEXT-045 - Add Stripe webhook decision logic

**Decision:** Add pure Stripe webhook decisioning for duplicate-event skipping and launch-critical event action mapping.

**Why now:** Stripe can deliver duplicate events and out-of-order event streams. Vault founding numbers, refunds, cancellation access, and referral clawbacks require idempotent handling before any real webhook mutation is wired.

## Implemented

- [stripe-webhooks.ts](../../../apps/web/lib/vault/stripe-webhooks.ts) maps event id/type to a local processing decision.
- [stripe-webhooks.test.ts](../../../apps/web/lib/vault/stripe-webhooks.test.ts) covers duplicate skipping, supported action mapping, and unsupported-event ignore behavior.

## Supported Actions

- `checkout.session.completed` -> `create_or_update_member`
- `customer.subscription.created` -> `sync_subscription`
- `customer.subscription.updated` -> `sync_subscription`
- `customer.subscription.deleted` -> `cancel_membership`
- `invoice.payment_failed` -> `mark_past_due`
- `invoice.paid` -> `renew_membership`
- `charge.refunded` -> `mark_refunded`

## Still Unwired

- Stripe signature verification.
- Durable processed-event log.
- Transactional founding number assignment.
- Member mutation.
- Referral attribution and clawbacks.

## DEC-NEXT-060 - Add Stripe checkout session acceptance decisioning

**Decision:** Add pure checkout-session acceptance checks before Vault member mutation can happen.

**Why now:** Mapping `checkout.session.completed` to a member-create action is not sufficient. The handler also needs to reject non-subscription sessions, wrong products, missing customer/subscription/email fields, and unpaid sessions before touching entitlement state.

## DEC-NEXT-060 Implemented

- [stripe-webhooks.ts](../../../apps/web/lib/vault/stripe-webhooks.ts) now exposes `getStripeCheckoutSessionDecision(session, expectedVaultPriceId)`.
- [stripe-webhooks.test.ts](../../../apps/web/lib/vault/stripe-webhooks.test.ts) covers accepting a paid Vault subscription and rejecting wrong mode, wrong price, and unpaid sessions.

## Guardrail

This scaffold does not process real Stripe payloads, call Stripe, mutate members, assign founding numbers, refund customers, or apply referral payouts. It only defines the decision table.
