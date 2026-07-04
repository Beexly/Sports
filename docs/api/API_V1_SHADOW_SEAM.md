# GSE API v1 Shadow Seam

Status: shadow contract only. No live route, provider integration, API key secret, billing path, or partner access is created by this slice.

## Purpose

This seam creates the internal contract required before any external GSE API can exist:

- API key parsing and hashing without raw-key storage
- required scope evaluation
- source-rights payload gating
- fail-closed response envelopes
- OpenAPI draft generation
- route-free test coverage proving the contract stays shadow-only

The implementation lives in `apps/web/lib/api/v1/` and is pure TypeScript. It does not read environment variables, mutate a database, call a provider, create credentials, or expose `apps/web/app/api/v1`.

## Files

| File | Purpose |
| --- | --- |
| `apps/web/lib/api/v1/api-key.ts` | Parses `Authorization: Bearer`, `X-GSE-API-Key`, or `X-API-Key`; hashes keys with SHA-256 namespace; rejects missing, malformed, invalid-scheme, and conflicting credentials. |
| `apps/web/lib/api/v1/scopes.ts` | Defines the first shadow endpoints and their required scopes. |
| `apps/web/lib/api/v1/payload-rights.ts` | Reuses the FABLE source registry adapter and blocks API exposure when display, storage, partner-sharing, or training rights do not pass. |
| `apps/web/lib/api/v1/envelope.ts` | Produces deterministic shadow response envelopes with `ok`, `data`, `errors`, and metadata. |
| `apps/web/lib/api/v1/shadow-gateway.ts` | Single gateway that combines auth, registered consumer, origin, scopes, and payload rights. |
| `apps/web/lib/api/v1/openapi.ts` | Builds a route-free OpenAPI 3.1 draft with `x-gse-shadow-only` markers. |
| `apps/web/lib/api/v1/consumer-registry.ts` | Validates local shadow consumer records, revocation, rotation, scope, origin, expiry, and quota state before persistence exists. |
| `apps/web/lib/api/v1/audit-ledger.ts` | Creates and verifies a local hash-chained audit event ledger for API decisions. |
| `apps/web/lib/api/v1/persistence.ts` | Provides a local shadow persistence adapter and promotion-plan gates without adding a database or route. |
| `apps/web/__tests__/api-v1-shadow-seam.test.ts` | Focused Vitest coverage for the seam. |
| `apps/web/__tests__/api-v1-consumer-registry.test.ts` | Focused Vitest coverage for consumer registry and audit-ledger behavior. |
| `apps/web/__tests__/api-v1-persistence.test.ts` | Focused Vitest coverage for persistence adapter semantics and promotion blockers. |

## Shadow Endpoints

| Endpoint id | Method/path | Required scopes | Notes |
| --- | --- | --- | --- |
| `evidence.record.read` | `GET /v1/evidence/{id}` | `evidence:read` | Public-safe evidence summary after source-rights checks. |
| `signals.summary.read` | `GET /v1/signals/{gameId}` | `signals:read`, `evidence:read` | Signal summary contract; not a win-probability marketing claim. |
| `metrics.birth_certificate.read` | `GET /v1/metrics/{metricId}/birth-certificate` | `metrics:read` | Public metric birth-certificate surface only; protected weights remain out of payload. |
| `revenue.partner_summary.read` | `GET /v1/revenue/partners/{partnerId}/summary` | `revenue:read` | Partner-safe summary with disclosure/compliance data classes. |

## Non-Goals

- No `apps/web/app/api/v1` route tree.
- No generated API keys.
- No partner onboarding.
- No public claim that the API is available.
- No raw vendor payload exposure without source-rights clearance.
- No personal data exposure through the shadow seam.

## Promotion Gates

A future live API route should not be added until all of these are true:

1. Owner approves an API key storage and rotation design.
2. Consumer records are backed by a real store with revocation and audit logs.
3. Rate limits and quota enforcement are wired to persistence.
4. Payload builders prove every field is source-rights safe.
5. OpenAPI output is exported in CI.
6. Route tests prove denied responses never include protected payload data.
7. Guardrails pass with the route tree present.

## Consumer Registry Follow-On

`consumer-registry.ts` and `audit-ledger.ts` are the local contract for the next promotion step. They still do not create persistence. They prove the shape and invariants a future store must preserve:

- no raw API key material in consumer records
- unique `keyId` and `keyHash`
- revoked and suspended consumers inactive by rule
- no wildcard origins
- live approval forbidden in shadow records
- quota exhaustion fails closed
- expiry fails closed
- rotation warnings are explicit
- audit events are hash chained and tamper-evident
- quota decrement and audit append happen together inside the persistence adapter

## Verification Commands

Run before promoting or merging this slice:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```
