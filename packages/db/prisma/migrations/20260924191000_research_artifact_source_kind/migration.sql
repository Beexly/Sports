-- Add a distinct forensic kind for repository research documents and enforce
-- idempotency for source snapshots that carry a stable external identity.
-- Existing rows retain their current kinds; nullable externalId rows remain
-- unrestricted by PostgreSQL's NULL-in-unique-index semantics.
ALTER TYPE "SourceSnapshotKind" ADD VALUE IF NOT EXISTS 'RESEARCH_ARTIFACT';

CREATE UNIQUE INDEX IF NOT EXISTS "source_snapshots_provider_sourceKind_externalId_key"
  ON "source_snapshots" ("provider", "sourceKind", "externalId");
