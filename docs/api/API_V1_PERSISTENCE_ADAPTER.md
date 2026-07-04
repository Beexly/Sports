# API v1 Shadow Persistence Adapter

Status: local shadow adapter only. This slice does not add a database table, Prisma migration, route handler, environment variable, generated key, billing path, provider call, or partner access.

## Purpose

The API v1 consumer registry and audit ledger now have a persistence boundary that future durable storage must match. It proves the behavior before a real store exists:

- consumer registry snapshots are validated every time
- audit ledger snapshots are hash-chain verified every time
- quota decrement and audit append happen together in one adapter operation
- denied requests append a denial audit event without incrementing quota
- raw API key storage is rejected by promotion-plan validation
- route exposure remains blocked in this shadow slice

## Modules

| File | Purpose |
| --- | --- |
| `apps/web/lib/api/v1/persistence.ts` | Defines the persistence adapter contract, in-memory shadow store, quota/audit write path, snapshots, and promotion-plan validation. |
| `apps/web/__tests__/api-v1-persistence.test.ts` | Proves atomic quota/audit behavior, denied-event behavior, registry visibility, hash-chain continuity, and promotion-plan blockers. |

## Adapter Contract

The adapter exposes:

- `listConsumers()`
- `readAuditLedger()`
- `snapshot()`
- `resolveConsumer()`
- `putConsumer()`
- `appendAuditEvent()`
- `recordQuotaAndAudit()`

`recordQuotaAndAudit()` is the key promotion seam. A future database adapter must keep the same semantics:

1. Resolve the consumer from a parsed credential.
2. Fail closed if the credential, consumer, status, expiry, or quota fails.
3. Append a deny audit event on failure.
4. On success, increment usage and append the allow audit event together.
5. Return a snapshot with registry and audit verification reports.

## Promotion-Plan Gates

`validateApiV1PersistencePromotionPlan()` blocks any plan that:

- stores raw API keys
- stores anything other than hashes
- lacks append-only audit behavior
- does not make quota decrement and audit append transactional
- exposes an API v1 route during the shadow persistence slice
- lets denied responses leak protected payload data
- includes a migration without rollback
- attempts live database storage before owner approval

Warnings remain for local shadow storage and missing owner approval.

## Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```
