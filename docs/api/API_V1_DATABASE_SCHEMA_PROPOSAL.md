# API v1 Database Schema Proposal

Status: proposal-only. This file does not apply a Prisma migration, edit `packages/db/prisma/schema.prisma`, create `apps/web/app/api/v1`, add an environment variable, generate an API key, enable billing, or grant partner access.

## Purpose

The API v1 shadow seam now has a durable-storage proposal that future work can review before any database mutation. The canonical proposal lives in `apps/web/lib/api/v1/schema-proposal.ts` so tests can validate the table shapes and promotion blockers.

The proposed durable store preserves the current shadow invariants:

- raw API keys are never stored
- `keyHash`, audit `payloadHash`, `previousHash`, and audit `hash` are 64-character hash fields
- consumer status, scopes, quota, expiry, rotation, and owner approval stay explicit
- quota usage and audit append remain one transactional unit
- audit events remain append-only and hash chained
- route exposure remains blocked until a later owner-approved promotion

## Proposed Tables

| Table | Purpose | Live today |
| --- | --- | --- |
| `api_v1_consumers` | Durable consumer registry with key id, key hash, status, scopes, quotas, rotation, expiry, and owner approval fields. | No |
| `api_v1_audit_events` | Append-only decision ledger for allow, deny, quota, registration, revocation, rotation, and scope events. | No |
| `api_v1_quota_months` | UTC month quota counter separated from immutable audit history. | No |

## Non-Negotiable Storage Rules

1. Store only key hashes and key ids, never raw key material.
2. Keep `ownerApprovedForLiveUse` false unless the owner explicitly approves a future live migration.
3. Keep `apps/web/app/api/v1` absent in this slice.
4. Do not add a migration directory in this slice.
5. Do not add a migration apply command in this slice.
6. Do not add API v1 env vars or partner onboarding data in this slice.
7. Preserve append-only audit behavior and transactionally couple quota updates to audit appends in any future durable adapter.

## Draft Prisma Models

The model drafts are exported from `API_V1_DATABASE_SCHEMA_PROPOSAL.models[].prismaModelDraft`. They are intentionally not pasted into `packages/db/prisma/schema.prisma` yet. A future promotion should copy them only after owner approval and after a rollback-ready migration is reviewed.

## Rollback Plan

Because this slice is proposal-only, rollback today is just a code revert of the proposal module, tests, and docs.

If a later owner-approved migration applies these tables, rollback must happen in this order:

1. Keep API v1 route exposure disabled and keep the memory shadow adapter as the executable fallback.
2. Stop API writers before touching quota or audit tables.
3. Export row counts and audit tip hash for reconciliation.
4. Drop proposed tables in dependency order: quota months, audit events, consumers.
5. Rerun focused API v1 tests, typecheck, lint, guardrails, and whitespace checks before reopening promotion.

Draft rollback SQL is also exported from `API_V1_DATABASE_SCHEMA_PROPOSAL.rollbackSqlDraft`.

## Validation

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Promotion Blockers Still Open

- No live route exists.
- No durable adapter exists.
- No Prisma migration exists.
- No rollback rehearsal has been run against a disposable database.
- No owner approval exists for live API use.
- No partner, billing, secret, or credential path exists.

The next supporting artifacts are `docs/api/API_V1_DURABLE_ADAPTER_HARNESS.md` and `docs/api/API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.md`. They add a local conformance harness, mocked transaction boundary, and table-mapped dormant interface without changing any of these blockers.
