# API v1 Shadow Route Harness

Status: complete for pure shadow harness. No live `apps/web/app/api/v1` route tree exists.

## Purpose

The route harness proves the route-level API v1 contract before any real endpoint is allowed:

- API key auth is parsed and hashed through the existing shadow key contract.
- Consumer registry resolution enforces active status, expiry, origin, scope, and monthly quota.
- Request IDs are normalized and carried into the response envelope.
- Idempotency keys are accepted only when they match the safe local contract.
- Payload rights are evaluated before any response data can be returned.
- Usage events are written into the hash-chained audit ledger.
- Allow paths debit quota and deny paths do not.
- Abuse responses for malformed route controls do not leak protected payload data.
- `routeExposed` remains `false`.

The implementation is pure TypeScript under `apps/web/lib/api/v1/shadow-route-harness.ts`. It does not read environment variables, create credentials, call a network provider, write a database, or expose a live route.

## Route Lifecycle

1. Locate the endpoint contract from `scopes.ts`.
2. Resolve request ID and idempotency key from explicit input or shadow headers.
3. Parse API credentials using `api-key.ts`.
4. Resolve the consumer through the local shadow persistence store.
5. Reject malformed route controls before scope/payload work.
6. Run the existing shadow gateway for origin, scope, and payload-rights decisions.
7. On allow, atomically debit quota and append `request_allowed`.
8. On deny, append `request_denied` without debiting quota.
9. Return a deterministic shadow response envelope.

## Covered Denials

| Case | Status | Quota debited | Audit event | Payload leakage |
| --- | ---: | --- | --- | --- |
| Missing or malformed API key | 401 | no | `request_denied` | no response data |
| Unregistered consumer | 401 | no | `request_denied` | no response data |
| Suspended, expired, or inactive consumer | 403 | no | `request_denied` | no response data |
| Quota exhausted | 429 | no | `request_denied` | no response data |
| Missing scope | 403 | no | `request_denied` | no response data |
| Origin not allowed | 403 | no | `request_denied` | no response data |
| Payload rights blocked | 403 | no | `request_denied` | no response data |
| Malformed request ID | 400/405 with method abuse | no | `request_denied` | no response data |
| Malformed idempotency key | 400/405 with method abuse | no | `request_denied` | no response data |
| Method not allowed | 405 | no | `request_denied` | no response data |

## Test Evidence

`apps/web/__tests__/api-v1-shadow-route-harness.test.ts` proves:

- happy-path auth, scope, payload rights, request ID, envelope, usage event, quota debit, and audit event
- missing auth denial with audit event and no quota debit
- overscoped consumer denial with no quota debit
- payload-rights denial without leaking response data
- quota exhaustion as the route-level rate-limit denial
- abuse response for malformed request ID, malformed idempotency key, and wrong method
- no `apps/web/app/api/v1` route tree exists

## Boundary

This harness makes the next live-route implementation safer, but it is not a live API. The repo guard `scripts/guardrails/api-v1-boundary.mjs` still blocks:

- `apps/web/app/api/v1`
- Prisma API v1 models or migrations
- API v1 environment variables
- direct database imports from `apps/web/lib/api/v1`
- network calls from `apps/web/lib/api/v1`

Live routes remain intentionally deferred until owner approval and a durable persistence plan exist.
