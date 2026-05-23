# Founding Seat Assignment Scaffold Notes

**Status:** Engineering scaffold. No database transaction yet.
**Related decision:** DEC-NEXT-046

## DEC-NEXT-046 - Add founding seat assignment decisioning

**Decision:** Add pure founding-seat assignment decisioning that can assign the next seat, route to waitlist, or force manual review for corrupted existing numbers.

**Why now:** Founding numbers are a trust artifact. Duplicate, skipped, or client-computed founding numbers would make the founding-1000 promise feel sloppy at the exact moment Vault needs confidence.

## Implemented

- [seats.ts](../../../apps/web/lib/vault/seats.ts) now exposes `getNextFoundingSeatAssignment(existingFoundingNumbers)`.
- [seats.test.ts](../../../apps/web/lib/vault/seats.test.ts) covers next assignment, cap reached, duplicate existing numbers, and invalid existing numbers.

## Decisions

- `assign` -> next integer after the current durable maximum.
- `waitlist` -> cap reached.
- `manual_review` -> duplicate or invalid existing founding number found.

## Still Unwired

- Database transaction/lock.
- Durable founding-number uniqueness constraint.
- Stripe checkout cap gating.
- Waitlist persistence and 48-hour claim flow.

## Guardrail

This scaffold does not compute founding numbers client-side, create members, write to the database, or open checkout. It only makes the server-side decision testable.
