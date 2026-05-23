# Vault Entitlement Access-State Notes

**Status:** Engineering scaffold.
**Related decision:** DEC-NEXT-044

## DEC-NEXT-044 - Make Vault entitlement decisions explainable

**Decision:** Extend Vault entitlement logic from a Boolean-only helper to an explainable access-state helper with deterministic time injection.

**Why now:** Day 0 support and refund handling need to know why a member does or does not have access. A Boolean alone is too thin when debugging canceled-paid-through, expired, refunded, malformed timestamp, and no-member cases.

## Implemented

- [entitlements.ts](../../../apps/web/lib/vault/entitlements.ts) now exposes `getVaultAccessState(member, now)` and preserves `hasVaultAccess(member, now)`.
- [entitlements.test.ts](../../../apps/web/lib/vault/entitlements.test.ts) covers active/trialing/past-due access, canceled paid-through access, expired/refunded denial, malformed timestamps, and founding-member checks.

## Access Reasons

- `no_member`
- `status_grants_access`
- `canceled_paid_term_active`
- `paid_term_expired`
- `status_denies_access`

## Guardrail

This does not call Stripe, revoke Discord roles, mutate subscriptions, or decide refunds. It only makes the local access decision explainable and testable.
