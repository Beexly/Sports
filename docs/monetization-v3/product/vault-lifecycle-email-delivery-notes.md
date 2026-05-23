# Vault Lifecycle Email Delivery Notes

**Status:** Engineering scaffold. No email provider sends yet.
**Related decision:** DEC-NEXT-053

## DEC-NEXT-053 - Add lifecycle email delivery decisioning

**Decision:** Add pure delivery-state decisioning for durable Vault lifecycle email rows.

**Why now:** The schedule alone is not enough. Day 0 can still fail through duplicate sends, paused rows, stale failed attempts, inactive-member sends, healthy-engagement retention emails, or unknown template keys. Delivery decisioning makes the queue behavior testable before it is connected to a provider.

## Implemented

- [emails.ts](../../../apps/web/lib/vault/emails.ts) now exposes:
  - `VaultLifecycleEmailRow`;
  - `getLifecycleEmailScheduleItem(templateId)`;
  - `getLifecycleEmailDeliveryDecision(row, context)`.
- [emails.test.ts](../../../apps/web/lib/vault/emails.test.ts) covers due sends, future waits, inactive-member skips, healthy-engagement skips, paused holds, max-attempt holds, and unknown-template holds.

## Decisions

- `sent` and `skipped` rows are no-ops.
- `paused` rows require operator review.
- Failed rows stop retrying after three attempts by default.
- Unknown template IDs are held, not guessed.
- Membership and engagement skips are decided before due-time checks so invalid sends are avoided even when rows are overdue.

## Still Unwired

- Durable `VaultLifecycleEmail` table.
- Transactional email provider.
- Provider message IDs.
- Retry worker.
- Unsubscribe enforcement.
- Admin repair queue integration for held rows.

## Guardrail

This scaffold does not send email, persist lifecycle rows, infer engagement, or call a provider. It only makes queue behavior deterministic before the provider is wired.
