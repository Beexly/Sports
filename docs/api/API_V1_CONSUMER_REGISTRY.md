# API v1 Shadow Consumer Registry

Status: local shadow contract only. No live consumer record, database table, route, secret, billing path, partner access, or provider integration is created here.

## Purpose

The API v1 seam now has a local consumer-registry contract that future persistence must preserve. The registry answers four questions before an API decision can be considered:

- Is the key hash registered without raw key material?
- Is the consumer active, unexpired, under quota, and not revoked?
- Are origins, scopes, and live-use flags safe?
- Is every decision appendable to a tamper-evident audit ledger?

## Modules

| File | Purpose |
| --- | --- |
| `apps/web/lib/api/v1/consumer-registry.ts` | Validates shadow consumer records and resolves credentials into active, quota-safe consumers. |
| `apps/web/lib/api/v1/audit-ledger.ts` | Builds an append-only hash-chain ledger for API allow, deny, quota, registration, revocation, rotation, and scope events. |
| `apps/web/lib/api/v1/persistence.ts` | Defines the local shadow persistence boundary future durable stores must match. |
| `apps/web/lib/api/v1/schema-proposal.ts` | Defines proposal-only durable table shapes and rollback validation without mutating Prisma. |
| `apps/web/__tests__/api-v1-consumer-registry.test.ts` | Proves registry validation, revocation, rotation, quota, gateway conversion, and audit tamper detection. |
| `apps/web/__tests__/api-v1-persistence.test.ts` | Proves quota/audit write semantics and promotion-plan blockers. |
| `apps/web/__tests__/api-v1-db-schema-proposal.test.ts` | Proves the durable schema proposal remains route-free, migration-free, env-free, and raw-key-free. |

## Consumer Record Invariants

- `keyHash` is a 64-character SHA-256 hex string and never contains `gse_v1_`.
- `keyId` and `keyHash` are unique.
- `ownerApprovedForLiveUse` must be `false` in shadow records.
- `shadow_revoked`, `shadow_suspended`, and `shadow_expired` records must have `active=false`.
- Origins cannot be blank or wildcarded.
- Quotas and usage must be non-negative integers.
- Usage cannot exceed quota.
- Expired records fail closed.
- Quota-exhausted records fail closed.
- Rotation due is a warning, not an allow/deny override.

## Audit Ledger Invariants

- Every event includes `sequence`, `eventId`, `type`, `occurredAt`, `previousHash`, `payloadHash`, and `hash`.
- Payload hashes use canonical JSON, sorted reason codes, and sorted source ids.
- The event hash commits to sequence, event id, type, timestamp, previous hash, and payload hash.
- Verification detects duplicate ids, sequence regressions, broken previous-hash links, payload tampering, and event-hash tampering.

## Promotion Gates

Before a live route is added:

1. Store the consumer registry in a durable data store.
2. Keep raw API keys outside the database; store only hashes and key ids.
3. Add key creation and rotation with owner approval.
4. Add write-once audit persistence or append-only table semantics.
5. Add quota decrement in the same transaction as the audit event.
6. Add route tests proving denied responses never return protected payload data.
7. Keep OpenAPI generation in CI and mark live endpoints only when routes exist.

See `docs/api/API_V1_PERSISTENCE_ADAPTER.md` for the local adapter contract and `docs/api/API_V1_DATABASE_SCHEMA_PROPOSAL.md` for the proposal-only durable schema.
