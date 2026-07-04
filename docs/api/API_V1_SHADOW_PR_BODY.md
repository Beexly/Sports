# PR: Add API v1 Shadow Seam

## Summary

Adds a route-free API v1 shadow contract for GSE evidence, signal, metric, and partner-safe payloads. The slice is intentionally pure TypeScript and does not expose a live API route.

## Changes

- Added API key parser/hash utility with fail-closed handling for missing, malformed, invalid-scheme, and conflicting credentials.
- Added scope registry and endpoint contracts for the first four API v1 surfaces.
- Added payload rights evaluation wired to the existing FABLE source registry adapter.
- Added deterministic success/error envelopes.
- Added shadow gateway that combines registered consumer, key hash, active state, origin, scopes, and source-rights gates.
- Added OpenAPI 3.1 draft builder with `x-gse-shadow-only` and `x-gse-live-routes-exposed=false`.
- Added Vitest coverage proving the contract remains route-free and fail-closed.
- Added shadow consumer registry validation for revocation, rotation, quota, expiry, origins, duplicate keys, and no-live-approval invariants.
- Added hash-chained API audit ledger for allow/deny/record events.
- Added local shadow persistence adapter with atomic quota/audit semantics and promotion-plan blockers.
- Added proposal-only database schema plan for future consumers, audit events, quota months, and rollback.
- Added durable-adapter conformance harness and mocked transaction rollback proof.

## Safety Notes

- No live `apps/web/app/api/v1` route was created.
- No API key secret, env var, database table, provider integration, or billing hook was added.
- Raw API keys are not stored by the seam; tests assert the hash does not contain the raw key.
- Source-rights checks block limited, unknown, blocked, personal-data, and raw-payload cases.
- Consumer registry is local-only and does not create a database table, secret, route, partner record, or billing path.
- Audit ledger is pure and in-memory; persistence remains a future additive layer.
- Persistence adapter is memory-only and blocks live database storage, raw keys, non-atomic quota/audit writes, route exposure, and denied-payload leakage in promotion plans.
- Database schema proposal is tracked as code/docs only; Prisma schema and migrations remain untouched.
- Durable adapter harness is local-only; it proves behavior against memory and mocked transaction stores but does not create a real database adapter.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-db-schema-proposal.test.ts api-v1-durable-adapter-harness.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

The next slice should draft a dormant durable adapter interface that maps the mocked transaction operations to the proposed Prisma table names, still without applying a migration or exposing a route.
