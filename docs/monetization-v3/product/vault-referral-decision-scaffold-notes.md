# Vault Referral Decision Scaffold Notes

**Status:** Engineering scaffold. No payout writes or tracking cookies yet.
**Related decision:** DEC-NEXT-052

## DEC-NEXT-052 - Add Vault referral attribution decisioning

**Decision:** Add pure server-side referral decisioning for click capture, conversion attribution, first-year commission accrual, and refund clawbacks.

**Why now:** The referral program is useful only if it is financially and culturally trustworthy. Self-referrals, stale click windows, duplicate payout assumptions, or refund-blind commissions would create small accounting errors that become member-trust problems later.

## Implemented

- [referrals.ts](../../../apps/web/lib/vault/referrals.ts) exposes pure functions for:
  - referral click acceptance or block reasons;
  - checkout conversion attribution;
  - first-year commission delta accrual;
  - refund clawback and unpaid-accrual void decisions.
- [referrals.test.ts](../../../apps/web/lib/vault/referrals.test.ts) covers valid clicks, self-referral blocking, expired clicks, wrong-email attribution, accrual deltas, and refund clawbacks.

## Decisions

- Email addresses are normalized before attribution decisions.
- Self-referrals are blocked before attribution is created and rechecked during conversion.
- Click attribution is valid only inside the stored `clickExpiresAt` window.
- Commission accrual is a delta from current gross revenue and already-accrued commission.
- Refund handling voids unpaid accrual first, then surfaces only paid exposure as clawback.

## Still Unwired

- Durable referral click persistence.
- Public referral link route.
- Checkout metadata attachment.
- Monthly payout batch creation.
- Stripe Connect or subscription-credit payout mutation.
- Abuse review queue.

## Guardrail

This scaffold does not set cookies, track users, write payout rows, transfer money, apply credits, or send emails. It makes the referral business rules testable before provider integration.
