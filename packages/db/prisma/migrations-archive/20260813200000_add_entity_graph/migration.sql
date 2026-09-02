-- ADR 005 — Entity Graph: minimal two-model schema.
-- Additive only: 1 enum, 2 tables, 8 indexes, 2 FKs. No ALTER, no DROP, no backfill.
-- Nothing reads these tables yet; the primitive lands before any consumer.

CREATE TYPE "EntityType" AS ENUM (
  'player',
  'team',
  'coach',
  'coordinator',
  'league',
  'season',
  'game',
  'venue',
  'injury',
  'practice_report',
  'transaction',
  'article',
  'reporter',
  'source',
  'rumor_cluster',
  'market',
  'sportsbook',
  'line',
  'prop',
  'model_output',
  'pick',
  'settlement',
  'public_claim',
  'fantasy_league',
  'fantasy_team',
  'fantasy_roster',
  'fantasy_player',
  'fantasy_matchup',
  'fantasy_recommendation'
);

CREATE TABLE "entities" (
  "id" TEXT NOT NULL,
  "entity_type" "EntityType" NOT NULL,
  "canonical_name" TEXT NOT NULL,
  -- Lowercased, punctuation-stripped resolution key.
  "normalized_name" TEXT NOT NULL,
  -- '' means not sport-scoped. NOT NULL because Postgres treats NULLs as
  -- distinct in a UNIQUE index, which would defeat the resolution invariant.
  "sport" TEXT NOT NULL DEFAULT '',
  "external_ids" JSONB,
  -- Provenance tier per docs/brain/source-hierarchy.md (1 = most trusted).
  "source_tier" INTEGER NOT NULL,
  "attributes" JSONB,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entity_edges" (
  "id" TEXT NOT NULL,
  "from_entity_id" TEXT NOT NULL,
  "to_entity_id" TEXT NOT NULL,
  "relation" TEXT NOT NULL,
  -- Provenance is mandatory: an unsourced relationship is a fabricated one.
  "source_tier" INTEGER NOT NULL,
  "source_ref" TEXT,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "valid_from" TIMESTAMP(3),
  "valid_to" TIMESTAMP(3),
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "entity_edges_pkey" PRIMARY KEY ("id")
);

-- Resolution invariant: one canonical row per (type, normalized name, sport).
CREATE UNIQUE INDEX "entities_type_name_sport_key" ON "entities"("entity_type", "normalized_name", "sport");
CREATE INDEX "entities_entity_type_idx" ON "entities"("entity_type");
CREATE INDEX "entities_sport_idx" ON "entities"("sport");
CREATE INDEX "entities_last_seen_at_idx" ON "entities"("last_seen_at");

-- Re-ingesting the same observation is idempotent.
CREATE UNIQUE INDEX "entity_edges_unique_observation" ON "entity_edges"("from_entity_id", "relation", "to_entity_id", "observed_at");
CREATE INDEX "entity_edges_from_entity_id_relation_idx" ON "entity_edges"("from_entity_id", "relation");
CREATE INDEX "entity_edges_to_entity_id_relation_idx" ON "entity_edges"("to_entity_id", "relation");
CREATE INDEX "entity_edges_observed_at_idx" ON "entity_edges"("observed_at");

ALTER TABLE "entity_edges" ADD CONSTRAINT "entity_edges_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_edges" ADD CONSTRAINT "entity_edges_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
