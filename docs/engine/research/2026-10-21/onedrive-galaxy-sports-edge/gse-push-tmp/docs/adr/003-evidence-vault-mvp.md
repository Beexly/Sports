# ADR 003 - Evidence Vault MVP

**Date:** 2026-05-28
**Status:** Proposed (awaiting owner approval)

## Context
`docs/brain/evidence-vault.md` defines the Evidence Vault concept and proposes a first durable evidence table for internal claim validation. This ADR captures the pre-implementation contract so the owner can approve schema direction before engineering starts.

This ADR is proposal-only. No schema migration or Prisma edit is implemented in this change.

## Decision (proposed)
Adopt an MVP Evidence Vault as one additive data model that stores claim-level evidence with source tiering, freshness windows, confidence metadata, and audit-safe payload details.

The MVP should be read-first for internal workflows. Public surfaces remain unchanged in Phase 1.

## Prisma model (PROPOSAL - not implemented)
Proposed model name: `EvidenceItem`

Proposed fields from `docs/brain/evidence-vault.md`:
- `sourceId` (string)
- `sourceTier` (integer 1-6)
- `entityType` (string)
- `entityId` (string)
- `claimType` (string)
- `observedAt` (datetime)
- `content` (string/text)
- `ttlSeconds` (integer)
- `confidence` (float/decimal)
- `publicSafe` (boolean)
- `auditLog` (json)

Recommended operational additions in implementation phase:
- Primary key `id`
- `createdAt` and `updatedAt`
- Indexes on (`entityType`, `entityId`, `observedAt`) and (`sourceTier`, `observedAt`)

## Migration plan
Additive-only migration plan:
1. Add `EvidenceItem` model to Prisma schema.
2. Generate one migration that creates one new table plus indexes.
3. Run `prisma migrate dev` in development.
4. Run existing validation and tests without weakening any gate.

No destructive schema operations are allowed in this phase.

## Rollback
If migration fails before apply:
- Revert schema change and delete generated migration before merge.

If migration has already applied in a dev environment:
- Revert app code usage first.
- Create a compensating migration only if owner explicitly approves dropping the new table.
- Prefer leaving the table dormant over destructive rollback when evidence data may be needed for audit.

## First consumer surfaces
First consumer is `/brain` as a gated BETA read surface:
- Claims are read from vault-backed evidence first.
- Surface remains internal/non-public during MVP.
- No public claim rendering directly from Evidence Vault in Phase 1.

## Passing gate
MVP is considered ready to implement only when all of the following are true:
- Owner approves this ADR.
- Prisma schema proposal is accepted.
- `prisma migrate dev` is green in dev.
- Existing tests and quality gates remain passing.

## Out of scope (Phase 1)
- Any public-facing Evidence Vault route.
- Bulk backfill tooling.
- Advanced contradiction resolution workflows.
- Multi-table evidence graph expansion.

## Dependencies on other ADRs
- No hard dependency on ADR 001 or ADR 002 for schema shape.
- Must align with existing trust and publication standards before any public use.
