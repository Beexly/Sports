# Vault Lifecycle Email Schedule Notes

**Status:** Engineering scaffold. No provider sends yet.
**Related decision:** DEC-NEXT-047

## DEC-NEXT-047 - Expand lifecycle email schedule logic

**Decision:** Expand Vault email scheduling from the welcome sequence plus one renewal reminder into a typed lifecycle schedule covering welcome, retention, and renewal touchpoints.

**Why now:** The member experience depends on restrained timing. If lifecycle emails are implemented from scattered copy docs later, the risk is either under-sending important operational notes or over-sending in a way that breaks Galaxy's restraint posture.

## Implemented

- [emails.ts](../../../apps/web/lib/vault/emails.ts) now defines welcome, retention, renewal, and combined lifecycle schedules.
- [emails.test.ts](../../../apps/web/lib/vault/emails.test.ts) covers welcome days, retention days, renewal offsets, due-date calculation, inactive-member skips, and healthy-engagement Day 60 skip.

## Cadence

- Welcome: days 0, 1, 3, 7, 14 from `joined_at`.
- Retention: days 30, 60, 90, 180, 335, 365 from `joined_at`.
- Renewal: days -35, -21, -7, 0, 0, 14, 30 from `renewal_at`.

## Still Unwired

- Transactional email provider.
- Durable lifecycle email rows.
- Send queue.
- Open/click/reply tracking.
- Unsubscribe compliance enforcement.

## Guardrail

This scaffold does not send emails, subscribe users, unsubscribe users, infer engagement, or touch provider APIs. It only makes schedule timing testable.
