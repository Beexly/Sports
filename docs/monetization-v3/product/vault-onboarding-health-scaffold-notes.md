# Vault Onboarding Health Scaffold Notes

**Status:** Engineering scaffold. No persistence or admin UI yet.
**Related decision:** DEC-NEXT-039

## DEC-NEXT-039 - Add first-24-hour onboarding health logic

**Decision:** Add pure onboarding-health logic for the post-payment Vault access chain before wiring storage or provider jobs.

**Why now:** The highest-risk Day 0 failure is not that checkout fails loudly. It is that checkout succeeds and one of the follow-on access steps silently fails: VaultMember creation, Discord role grant, welcome email, or dashboard access.

## Implemented

- [onboarding-health.ts](../../../apps/web/lib/vault/onboarding-health.ts) defines the access-critical onboarding steps.
- [onboarding-health.test.ts](../../../apps/web/lib/vault/onboarding-health.test.ts) covers the 15-minute repair window, day-one dashboard watch signal, and rolling failure-rate calculation.

## Health Steps

Repair-triggering after 15 minutes:

- `payment_confirmed`
- `member_created`
- `discord_role_granted`
- `welcome_email_sent`

Watch-only after 24 hours:

- `dashboard_viewed`

## Still Unwired

- Durable `member_onboarding_health` storage.
- Admin repair task creation.
- Provider event ingestion from Stripe, Discord, email, and dashboard view events.
- Rolling one-hour incident alert when repair-required members exceed 5 percent.

## Guardrail

This scaffold does not call Stripe, Discord, email providers, analytics tools, or member dashboards. It only makes the repair logic testable before provider wiring begins.
