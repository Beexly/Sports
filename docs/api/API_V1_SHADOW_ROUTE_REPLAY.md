# API v1 Shadow Route Replay

Updated: 2026-07-05

Status: local replay simulation only. No live `apps/web/app/api/v1` route tree exists, no database persistence is added, and no credentials or environment variables are created.

## Purpose

The shadow route replay layer proves the idempotency behavior required before live API routes can exist.

It wraps the existing shadow route harness and stores successful idempotent results in a local in-memory replay store.

## Implementation

Code:

- `apps/web/lib/api/v1/shadow-route-replay.ts`

Tests:

- `apps/web/__tests__/api-v1-shadow-route-replay.test.ts`

## Replay Contract

`handleApiV1ShadowRouteReplayRequest()`:

1. Parses the API credential with the existing key parser.
2. Reads the external idempotency key from explicit input or shadow headers.
3. Hashes the request payload.
4. Computes a replay key from method, endpoint path, hashed payload, parsed key id, and external idempotency key.
5. Returns a stored success envelope when the replay key already exists.
6. Calls the base shadow route harness when no stored success exists.
7. Stores only successful shadow results.
8. Never stores denied responses as reusable success records.

The replay record stores:

- replay key
- endpoint id
- parsed key id
- external idempotency key
- request payload hash
- stored timestamp
- shadow harness result

It does not store raw API keys or raw request payloads.

## Proven Behavior

The tests prove:

- duplicate successful requests return the same response envelope
- duplicate successful requests do not double-count quota usage
- duplicate successful requests do not append a second audit event
- denied requests do not create replay records
- unsafe denied responses do not leak protected response payload data
- same external idempotency key plus different payload is a new request
- malformed idempotency keys create no replay records

## Boundaries

This slice does not add:

- live API routes
- durable database storage
- Prisma models
- migrations
- environment variables
- generated API keys
- network calls
- paid services
- owner approval for live use

The API v1 boundary guard remains authoritative.
