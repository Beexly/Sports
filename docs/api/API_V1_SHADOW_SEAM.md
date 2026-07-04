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
| `apps/web/lib/api/v1/schema-proposal.ts` | Provides proposal-only durable table drafts and rollback validation without editing Prisma or migrations. |
| `apps/web/lib/api/v1/durable-adapter-harness.ts` | Provides a reusable adapter conformance suite and mocked transaction boundary. |
| `apps/web/lib/api/v1/dormant-durable-adapter-interface.ts` | Maps future durable operations to proposed table names while staying route-free, env-free, SQL-free, and non-executable. |
| `apps/web/lib/api/v1/durable-fixture-simulator.ts` | Replays local synthetic operation fixtures against the dormant durable interface without storage execution. |
| `apps/web/lib/api/v1/durable-fixture-report.ts` | Builds a deterministic tracked report archive and promotion checklist from fixture replay plus harness conformance output. |
| `apps/web/lib/api/v1/durable-fixture-report-renderer.ts` | Renders the tracked fixture report archive to markdown. |
| `apps/web/lib/api/v1/durable-rehearsal-plan.ts` | Defines the plan-only disposable database rehearsal checklist and validator. |
| `apps/web/lib/api/v1/promotion-readiness.ts` | Evaluates local-only promotion readiness gates across shadow evidence, repo boundaries, and owner approvals. |
| `apps/web/__fixtures__/api-v1/durable-fixture-simulator.json` | Local synthetic durable trace covering read-only, commit, and rollback cases. |
| `apps/web/__fixtures__/api-v1/durable-fixture-edge-cases.json` | Local synthetic edge-case trace for suspended, expired, quota-exhausted, and malformed-audit cases. |
| `apps/web/__fixtures__/api-v1/durable-fixture-hostile-invalid.json` | Local negative-control trace proving unsafe durable side effects are rejected. |
| `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json` | Local tracked shadow evidence archive; live promotion remains false. |
| `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.md` | Human-readable rendering of the tracked shadow evidence archive. |
| `docs/api/API_V1_PROMOTION_READINESS_MATRIX.md` | Documents the readiness matrix and expected current status. |
| `scripts/guardrails/api-v1-boundary.mjs` | Boundary guard wired into `npm.cmd run guardrails`. |
| `apps/web/__tests__/api-v1-shadow-seam.test.ts` | Focused Vitest coverage for the seam. |
| `apps/web/__tests__/api-v1-consumer-registry.test.ts` | Focused Vitest coverage for consumer registry and audit-ledger behavior. |
| `apps/web/__tests__/api-v1-persistence.test.ts` | Focused Vitest coverage for persistence adapter semantics and promotion blockers. |
| `apps/web/__tests__/api-v1-db-schema-proposal.test.ts` | Focused Vitest coverage for the schema-proposal boundary. |
| `apps/web/__tests__/api-v1-durable-adapter-harness.test.ts` | Focused Vitest coverage for adapter conformance and rollback behavior. |
| `apps/web/__tests__/api-v1-dormant-durable-adapter-interface.test.ts` | Focused Vitest coverage for table mapping, non-executable dry runs, and no-live-surface blockers. |
| `apps/web/__tests__/api-v1-durable-fixture-simulator.test.ts` | Focused Vitest coverage for fixture replay, operation drift, rollback leakage, and boundary blockers. |
| `apps/web/__tests__/api-v1-durable-fixture-report.test.ts` | Focused Vitest coverage for tracked archive parity, checklist behavior, and live-promotion blockers. |
| `apps/web/__tests__/api-v1-durable-rehearsal-plan.test.ts` | Focused Vitest coverage for rehearsal plan-only boundaries and rollback evidence requirements. |
| `apps/web/__tests__/api-v1-promotion-readiness.test.ts` | Focused Vitest coverage for readiness gates, approval blockers, and live-promotion denial. |
| `apps/web/__tests__/api-v1-boundary-guard.test.ts` | Focused Vitest coverage for the API v1 boundary guard. |

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
- future durable tables are proposal-only and have a rollback plan before any migration exists
- future durable adapters must pass the local conformance harness before real storage is considered
- future durable adapter interfaces must map operations to the proposed tables and remain dormant before fixture simulation or database work
- future durable fixture reports must stay synthetic and route-free before any disposable database rehearsal is considered
- future report archives must keep live promotion false until owner approval, migration review, rollback rehearsal, and route review exist
- future disposable database rehearsals must remain blocked until the owner approves a disposable target and scope
- future promotion readiness checks must keep live promotion false even when disposable rehearsal review evidence is complete

## Verification Commands

Run before promoting or merging this slice:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-db-schema-proposal.test.ts api-v1-durable-adapter-harness.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-promotion-readiness.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```
