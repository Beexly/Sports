# ADR 005 — Entity Graph: Minimal Two-Model Schema

**Date:** 2026-08-13
**Status:** Proposed — schema included, migration NOT applied (owner runs it)
**Author:** Capability-recovery follow-through (item 5 of 5)

## Context

`docs/brain/entity-graph.md` has been doctrine since the intelligence master plan
landed, marked *"Status: Doctrine only. Schema implementation requires approved
change proposal."* It specifies ~30 canonical entity types (player, team, game,
injury, market, line, pick, settlement, fantasy_*) and the relationships between
them. Nothing implements it, so every downstream design that depends on entity
resolution — evidence vault, signal ledger, claim attribution, Ask-the-Brain —
stays blocked on the same missing primitive.

The 2026-08-12 capability audit reached the same conclusion from the opposite
direction. An AI-generated blueprint proposed adding `gbrain` as a knowledge-graph
dependency; that npm package turns out to be an unmaintained 2022 GPU-ML library
with no relation to graphs. The genuine recommendation was: **build it in-repo as
two Prisma models, not as a graph database.** Neo4j (`neo4j-driver` 6.2.0) is real
and would work, but a second stateful service is operational tax for a
single-operator product whose traversals are shallow.

The doctrine points at `docs/adr/pre-implementation-change-proposal-template.md`.
**That file does not exist in the repo.** This ADR mirrors the shape of ADR 003
instead, and the missing template is noted as a follow-up.

## Decision

Add exactly two additive models plus one enum. No existing model, column, or
index is modified. No data is migrated.

### `Entity`
The canonical record for one named thing. Fields chosen to serve entity
resolution rather than to mirror every attribute in the doctrine table:

- `entity_type` (enum) — the closed vocabulary from `entity-graph.md`
- `canonical_name` + `normalized_name` — resolution key; `normalized_name` is
  lowercased/punctuation-stripped so "A.J. Brown" and "AJ Brown" converge
- `sport`, `external_ids` (Json) — cross-source identity (nflverse id, ESPN id,
  odds-api key) without a column per provider
- `source_tier` (Int) — provenance tier per `docs/brain/source-hierarchy.md`
- `first_seen_at` / `last_seen_at` — freshness, satisfying rule #5
- `attributes` (Json) — type-specific fields; the doctrine's per-type attribute
  tables are too varied for columns and too valuable to drop

Unique on `(entity_type, normalized_name, sport)` — the resolution invariant. Two
different players with the same normalized name in the same sport must be
disambiguated at write time rather than silently merged.

**`sport` is `NOT NULL DEFAULT ''`, not nullable.** This looks like a wart and is
load-bearing: Postgres treats NULLs as *distinct* inside a UNIQUE index, so a
nullable `sport` would let unlimited duplicate `(type, name, NULL)` rows through
and quietly defeat the invariant this table exists to enforce. `''` means "not
sport-scoped" (reporter, article, source).

### `EntityEdge`
A typed, directed, provenanced relationship.

- `from_entity_id` → `to_entity_id`, both FK to `Entity` with `onDelete: Cascade`
- `relation` (String) — `belongs_to`, `plays`, `has`, `mentions`, `references`…
  kept as a string rather than an enum because the doctrine's relation list is
  still growing; an enum would force a migration per new verb
- `source_tier`, `source_ref`, `observed_at` — **every edge carries provenance.**
  An unsourced edge is exactly the fabricated-relationship risk rule #2 forbids
- `valid_from` / `valid_to` — nullable temporal bounds, so "player belongs_to
  team" survives a trade without deleting history
- `confidence` (Int 0–100), `metadata` (Json)

Unique on `(from_entity_id, relation, to_entity_id, observed_at)` so re-ingesting
the same observation is idempotent.

### Traversal
Recursive CTEs over `EntityEdge`. The doctrine's relationship graph is shallow —
`player → team → game → market` is four hops. Postgres handles this; it does not
justify a graph database.

## Consequences

**Enables:** entity resolution for evidence attribution; the injury/depth-chart
intelligence design; rumor-cluster→player linking with tier tracking; claim
provenance chains.

**Costs:** two tables, one enum, one additive migration. Prisma client
regeneration. No runtime behavior changes until something reads them — nothing
does yet, and that is deliberate: the primitive lands and is reviewed before any
consumer depends on it.

**Explicitly not in scope:** ingestion jobs, resolution heuristics, merge/dedup
logic, any public surface. Each is its own change.

## Safety

- Additive only — zero `ALTER`, zero `DROP`, no backfill.
- No public route reads these tables.
- Every edge requires `source_tier` + `observed_at`; a relationship with no
  provenance cannot be written.
- Rollback is `DROP TABLE entity_edges; DROP TABLE entities; DROP TYPE "EntityType";`
  with no other object affected.

## Operator step (not automated)

The migration SQL is committed but **not applied**. Applying it is an owner action:

```bash
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

The agent does not hold a production `DATABASE_URL` and must not apply this.

## Follow-ups

1. Create the missing `docs/adr/pre-implementation-change-proposal-template.md`
   that the master plan already references.
2. Resolution/merge heuristics as a separate proposal.
