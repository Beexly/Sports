# ADR 007 — Source Acquisition Mesh

**Date:** 2026-05-28
**Status:** Proposed (awaiting owner approval)
**Author:** Claude agent, autonomous loop

## Context

The intelligence platform currently ingests data through ad-hoc adapters
(The Odds API, manual injury feeds) without a unified registration or
health-monitoring layer. Three consequences:

1. **No source registry.** There is no canonical list of which data sources
   are active, what their tier is, what their TTL is, or when they were
   last successfully polled. ADR 003 defines the `EvidenceItem.sourceId`
   field but has no corresponding `Source` table to resolve it against.

2. **No health observability.** When an odds feed goes stale or an injury
   API times out, the intelligence layer continues scoring picks with
   expired data because there is no circuit-breaker to detect and propagate
   the failure. This violates the platform's "no stale data" non-negotiable rule.

3. **No acquisition policy enforcement.** There is no machine-readable record
   of which sources have been approved for use, what their scraping/licensing
   terms are, and whether they are subject to rate-limit or crawl-delay
   constraints. This creates legal and reliability risk.

The Source Acquisition Mesh is a thin registry + health layer that solves
all three problems without requiring changes to existing ingestion workers.

## Decision (proposed)

Introduce two new Prisma models:

- `DataSource` — canonical registry entry for every data source used by the platform.
- `SourceHealthEvent` — append-only log of every poll attempt, timeout, or error.

Introduce one new module:

- `packages/data-ingestion/src/source-mesh.ts` — pure functions for registering,
  resolving, and health-checking sources.

The ingestion workers are updated to call `resolveSource(sourceId)` before
polling. If the source is not registered or is circuit-broken, the worker
skips and logs a `SOURCE_UNAVAILABLE` signal ledger event instead of
attempting to poll with potentially stale or unauthorized data.

## Prisma models (PROPOSAL — not implemented)

```prisma
model DataSource {
  id              String    @id @default(uuid())
  slug            String    @unique
  displayName     String
  tier            Int                       // 1–6 matching source-hierarchy taxonomy
  baseUrl         String?
  pollIntervalMs  Int                       // nominal polling cadence
  ttlSeconds      Int                       // maximum age of data from this source
  rateLimitRpm    Int?                      // requests per minute cap (null = unlimited)
  crawlDelayMs    Int?                      // minimum ms between requests (robots.txt / ToS)
  authType        String    @default("none") // none | api_key | oauth | basic
  licenseApproved Boolean   @default(false) // owner must set true before source is active
  isActive        Boolean   @default(false)
  circuitOpen     Boolean   @default(false) // set by health monitor on repeated failures
  lastPolledAt    DateTime?
  lastSuccessAt   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  healthEvents    SourceHealthEvent[]

  @@index([tier, isActive])
  @@index([slug])
}

model SourceHealthEvent {
  id            String    @id @default(uuid())
  sourceId      String
  eventType     String    // poll_ok | poll_timeout | poll_error | circuit_opened | circuit_closed
  statusCode    Int?
  latencyMs     Int?
  errorMessage  String?
  eventAt       DateTime  @default(now())
  source        DataSource @relation(fields: [sourceId], references: [id])

  @@index([sourceId, eventAt])
  @@index([eventType, eventAt])
}
```

### Key design decisions

- `licenseApproved` must be set to `true` by an operator before the source is
  ever polled. The ingestor checks this field on startup and on every poll
  cycle. This enforces the "no scraping without source-policy approval" rule
  from the platform non-negotiables.

- `circuitOpen` is set automatically by the health monitor after N consecutive
  failures (configurable, default: 5). A circuit-open source produces a
  `SOURCE_UNAVAILABLE` event in the Signal Ledger and causes downstream picks
  to be held rather than scored with stale data.

- `crawlDelayMs` and `rateLimitRpm` are respected by a rate-limiting wrapper
  in `source-mesh.ts`. Workers call the wrapper rather than the underlying
  HTTP client directly.

## Migration plan

1. Add `DataSource` and `SourceHealthEvent` models via `prisma migrate dev`.
2. Seed initial entries for all currently active sources (The Odds API, injury
   feed adapters) with `licenseApproved=true` and `isActive=true`.
3. Update `packages/data-ingestion/src/` adapters to call `resolveSource()`
   before each poll.
4. Add health-check job to `workers/` that polls for circuit conditions every
   60 seconds and writes `SourceHealthEvent` records.
5. Existing tests remain green — no breaking changes to `EvidenceItem` or
   existing worker contracts.

## Rollback

1. Remove the `resolveSource()` call from ingestion adapters (workers fall back
   to polling unconditionally — same behavior as before).
2. Drop `DataSource` and `SourceHealthEvent` tables (no foreign keys on existing
   tables).

The rollback is clean because no existing table references `DataSource.id` until
the ADR 003 `EvidenceItem.sourceId` field is wired to the new registry (a
subsequent migration, not part of this ADR).

## First consumer surfaces

- **Data ingestion workers** — pre-poll registry check + rate-limit wrapper.
- **Signal Ledger** — `SOURCE_UNAVAILABLE` event when circuit is open.
- **Cockpit** (`/cockpit/sources`) — operator view of source health, circuit
  state, and license approval status.

## Passing gate

- Schema approved by owner (`licenseApproved` field is the licensing
  enforcement mechanism — owner review is required before any source is live).
- `prisma migrate dev` green.
- Existing tests pass (no regressions).
- At least one ingestion adapter updated to call `resolveSource()`.
- Health-check worker runs without error in local dev.

## Out of scope (Phase 1)

- Automatic re-opening of circuits (Phase 2: exponential backoff + auto-reset).
- Source discovery / automatic registration from feed manifests.
- Multi-region health monitoring (Phase 3).
- Rate-limit budget sharing across distributed workers.

## Dependencies on other ADRs

- ADR 003 (Evidence Vault MVP): `EvidenceItem.sourceId` will reference
  `DataSource.id` in a subsequent migration. Phase 1 of this ADR does not
  require ADR 003 to be live — the registry is self-contained.
- ADR 004 (Signal Ledger): `SOURCE_UNAVAILABLE` event type in Signal Ledger
  requires ADR 004 to be live for full observability. The health events table
  provides a fallback audit log in the interim.

## Consequences

- Positive: licensing compliance is enforced at the schema level, not just
  by convention.
- Positive: stale-data failures become observable and circuit-break rather
  than silently corrupting pick scores.
- Positive: rate limits and crawl delays are centrally configured and
  enforced — no per-adapter duplication.
- Negative: ingestion workers require a non-trivial refactor to call
  `resolveSource()` on every poll cycle.
- Neutral: `DataSource` seed data must be kept up to date as new sources
  are added. This is operator responsibility.

## Open questions

1. What is the correct N for circuit-breaking (consecutive failures before
   `circuitOpen=true`)? Proposed default: 5.
2. Should `SourceHealthEvent` records be pruned after a retention window
   (e.g., 90 days) or kept indefinitely? The Signal Ledger ADR is
   append-only — should health events follow the same principle?
3. Does The Odds API ToS require a crawl delay between requests, or only
   a rate limit cap? Needs legal review of the API terms.
