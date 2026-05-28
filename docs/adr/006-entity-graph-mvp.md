# ADR 006 — Entity Graph MVP

**Date:** 2026-05-28
**Status:** Proposed (awaiting owner approval)
**Author:** Autonomous launch loop
**Related:** ADR 003 (Evidence Vault), ADR 004 (Signal Ledger),
`docs/brain/entity-graph.md`

## Context

The Entity Graph is Component 7 of the Sports OS Intelligence Network
(`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md` §4.3).
It is the canonical reference that resolves every named thing — player,
team, game, market, coordinator, venue — to a single system ID. Without
it, the Evidence Vault cannot attribute evidence to a specific entity,
the Signal Ledger cannot link events to players or games, and the Fantasy
War Room cannot answer "what is the start/sit recommendation for this player?"

Today entity references in the codebase are free-text strings. A pick for
"Patrick Mahomes" and a practice report for "P. Mahomes" are the same entity
to a human; to the system they are two different strings. The Entity Graph
is the deduplication layer that makes intelligence auditable, joinable, and
self-correcting.

**This ADR is a prerequisite for ADR 003 (Evidence Vault).** The `entityId`
field on `EvidenceItem` must reference a real row in the entity graph to be
meaningful. For Phase 1, ADR 003 can ship with `entityId` as a free-text
`String` (as noted in that ADR's "Out of scope" section); this ADR upgrades
it to a real FK in Phase 2.

## Decision (proposed)

Phase 1: introduce two Prisma models — `Entity` and `EntityRef` — that
cover the seven core entity types needed by the Evidence Vault MVP and the
first pick-provenance use cases.

Phase 1 entity types (minimal set for ADR 003 + ADR 004 integration):
- `player` — an athlete
- `team` — a franchise
- `game` — a scheduled contest
- `market` — a betting market for a game
- `coordinator` — OC/DC affecting scheme signals
- `venue` — physical location (weather exposure needed for picks)
- `injury` — a documented designation

Phase 2+ (deferred, separate ADR): the remaining entity types from
`docs/brain/entity-graph.md` — reporter, article, rumor_cluster,
fantasy entities, settlement, public_claim.

## Prisma model (PROPOSAL — not implemented)

```prisma
// packages/db/prisma/schema.prisma — proposed addition

model Entity {
  id           String   @id @default(uuid())
  entityType   String   // "player" | "team" | "game" | "market" |
                        // "coordinator" | "venue" | "injury"
  canonicalName String  // human-readable primary name
  sport        String?  // "NFL" | "NBA" | "MLB" | "NHL" | "NCAAF" | etc.
  externalIds  Json     // { espn?: string, oddsApi?: string, rotowire?: string }
  attributes   Json     // type-specific fields (see docs/brain/entity-graph.md)
  lastVerifiedAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  refs         EntityRef[]
  evidenceItems EvidenceItem[]  // FK added in ADR 003 Phase 2

  @@index([entityType, sport])
  @@index([entityType, canonicalName])
}

model EntityRef {
  id           String   @id @default(uuid())
  entityId     String
  refType      String   // "name_variant" | "external_id" | "alias"
  refValue     String   // the variant or external ID being mapped
  sourceTier   Int      // tier of the source that provided this ref
  createdAt    DateTime @default(now())

  entity       Entity   @relation(fields: [entityId], references: [id])

  @@index([refType, refValue])  // deduplication lookup path
  @@unique([refType, refValue]) // one canonical entity per external ID
}
```

## Migration plan

1. ADR 003 (Evidence Vault) does not need to wait for this ADR if Phase 1
   Evidence Vault ships `entityId` as a free-text `String`. This ADR can
   run in parallel with ADR 003 and upgrade the FK in Phase 2.
2. Create migration: `prisma migrate dev --name add_entity_graph_mvp`.
3. Run `prisma generate`.
4. Seed Phase 1 entities: a seeder script populates entities from The Odds
   API game data on first run. Player and team entities are populated from
   the existing `Pick` and `Game` tables where names are already stored.
5. Wire the deduplication lookup: before creating a new EvidenceItem, the
   pipeline calls `resolveEntity(name, sport, externalId?)` which returns
   the canonical `Entity.id` or creates a new row if no match is found.
6. Add a Vitest test: create two EntityRefs with the same `refType +
   refValue` → confirm unique constraint is enforced.
7. Add a Vitest test: `resolveEntity("Patrick Mahomes", "NFL")` and
   `resolveEntity("P. Mahomes", "NFL")` after seeding → confirm both return
   the same canonical ID.

## Rollback

1. Drop FKs from EvidenceItem back to free-text (revert ADR 003 Phase 2
   migration).
2. Drop tables: `DROP TABLE "EntityRef" CASCADE; DROP TABLE "Entity" CASCADE`.
3. Roll back migration: `prisma migrate resolve --rolled-back`.

Entity is additive. Phase 1 has no consumer that hard-depends on it (the
Evidence Vault FK is optional in Phase 1). Rollback does not affect any
existing functionality.

## First consumer surfaces

| Phase | Consumer | Dependency |
|---|---|---|
| Phase 1 | Evidence Vault seed (ADR 003) | `entityId` stored as canonical UUID |
| Phase 1 | Pick generation pipeline | resolveEntity called before pick creation |
| Phase 2 | `/brain` answer surface | entity resolution for Q&A |
| Phase 2 | Pick Provenance Timeline | entity rendering for player/game context |
| Phase 3 | Fantasy War Room | fantasy entity extensions |

## Passing gate

This ADR is implemented successfully when ALL of the following are true:

- `prisma migrate dev` runs green
- `prisma generate` types resolve, no `any`
- `resolveEntity()` deduplication test passes: two name variants resolve
  to the same canonical ID
- `@@unique([refType, refValue])` constraint enforced by database (verified
  by attempting a duplicate insert in a test)
- Seeder populates at least one player, team, and game entity from
  existing data without error
- All pre-existing tests still green: 777/777, guard:trust 0 hits

## Out of scope (Phase 1)

- Fantasy entities (`fantasy_league`, `fantasy_team`, `fantasy_roster`, etc.)
  — deferred to Fantasy War Room ADR
- Reporter / article entities — deferred to Source Acquisition Mesh ADR
- Rumor cluster entity — deferred
- Graph traversal queries (e.g. "all evidence for this player this week")
  — Phase 2; Phase 1 is lookup-only

## Dependencies on other ADRs

- **ADR 003 (Evidence Vault MVP)** — depends on Entity for the
  `entityId` FK upgrade in Phase 2. ADR 003 Phase 1 can ship without it.
- **ADR 004 (Signal Ledger MVP)** — `entityIds` array in
  `SignalLedgerEntry` can be upgraded to real FKs in Phase 2.

## Consequences

**Positive:**
- Pick rationale becomes auditable at the entity level — "this pick
  references Patrick Mahomes (entity abc-123, verified via ESPN API,
  tier 2, freshness 4h)".
- Duplicate evidence entries for the same player are collapsed
  automatically.
- The deduplication index makes it possible to answer "show me all
  evidence items about this player this week" without a full-table scan.

**Negative:**
- Every new evidence item now requires an entity resolution step. One
  extra call per ingestion. Acceptable; ingestion is async.
- The seeder must be kept current with roster moves. Stale entity records
  need `lastVerifiedAt` gating (already modeled).

## Open questions for owner

1. Should `Entity` be in `packages/db/` (shared) or stay in
   `apps/web/`? Shared is correct if the prediction engine and workers
   also need entity resolution.
2. Confirm the Phase 1 entity type list is sufficient for the Evidence
   Vault + Signal Ledger MVP without expansion.
3. Confirm the seeder strategy: populate from existing `Pick` rows on
   first migration, or require a separate manual seed after migration.
