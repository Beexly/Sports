# ADR 0001: Evidence Vault MVP Pre-Implementation Change Proposal

Status: Proposed
Date: 2026-05-28
Decision type: Pre-implementation change proposal

## Owner Approval Required
This document is a proposal only. No schema, route, dependency, or runtime changes are authorized by this ADR until owner approval is explicitly recorded.

## Source Proposal
Primary source proposal: `docs/brain/evidence-vault.md`.

Note on source availability in this workspace: `docs/brain/evidence-vault.md` is not present in `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge` at proposal-writing time. This ADR therefore captures the intended MVP contract and blocks implementation pending owner confirmation that this contract matches the source proposal intent.

## Context
The Evidence Vault is the keystone prerequisite for later intelligence phases because it introduces a durable, queryable evidence layer for claims, provenance tiering, contradiction tracking, and time-bounded freshness handling.

## Decision
Proceed with an additive MVP introducing one new Evidence Vault table and supporting indexes only, with no destructive schema edits and no public UI/API exposure in the first release slice.

### Proposed Prisma Model
`EvidenceItem` (new):

- `id` (String, primary key; `@id @default(cuid())`)
- `sourceTier` (String or enum; source hierarchy tier label)
- `sourceName` (String)
- `observedAt` (DateTime)
- `ttlSeconds` (Int)
- `claim` (String)
- `entityId` (String)
- `entityType` (String)
- `contradictionState` (String or enum)
- `rawPayload` (Json)
- `createdAt` (DateTime; `@default(now())`)
- `updatedAt` (DateTime; `@updatedAt`)

Recommended enum direction (to finalize during implementation with owner sign-off):
- `sourceTier`: `TIER_1`, `TIER_2`, `TIER_3`, `TIER_4`
- `contradictionState`: `NONE`, `POTENTIAL`, `CONFIRMED`

### Proposed Indexes
- Composite index: (`entityType`, `entityId`, `observedAt` desc semantics via query ordering)
- Composite index: (`sourceTier`, `observedAt`)
- Index: (`contradictionState`)
- Index: (`observedAt`)
- Optional uniqueness guard (deferred unless owner requests strict dedupe): (`entityType`, `entityId`, `claim`, `sourceName`, `observedAt`)

## Migration Plan
One additive migration only.

1. Add `EvidenceItem` model (and enums if approved) to `packages/db/schema.prisma`.
2. Generate exactly one migration containing only create-table/create-index statements.
3. Apply migration in non-prod environments first.
4. Validate app startup and existing data flows unaffected.

### Rollback Plan
No destructive rollback.

- Code rollback: revert application usage paths first (feature flag or code path removal).
- DB rollback for emergency only: apply a compensating migration that drops only newly added `EvidenceItem` artifacts after explicit owner approval.
- If preserving evidence data is required, disable writers/readers and keep table in place until archival/export decision.

## Implementation-Phase File Touch List
Planned touch list for implementation phase (not this session):

- `packages/db/schema.prisma`
- `packages/db/migrations/*` (single new migration directory)
- `apps/web/lib/brain/evidence-vault.ts` (new repository/service module)
- `apps/web/lib/brain/evidence-vault.test.ts` (new unit tests)
- `apps/web/lib/brain/types.ts` (if shared EvidenceItem typing is needed)
- `apps/web/app/cockpit/*` read-only integration surface files (exact route/component paths to be selected during implementation)
- `apps/web/app/api/internal/brain/*` private-only read endpoint files (if cockpit access needs API boundary)
- `apps/web/tests/smoke/*` targeted smoke additions for cockpit evidence read path
- `docs/ops/decision-log.md` (ADR approval and implementation decision entries)
- `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` (session trace updates)

No public routes/pages for Evidence Vault in the first slice.

## Quality Gates That Must Remain Passing
The following gates are non-negotiable and must stay green before merge and after merge:

- `guard:trust`
- `brand-safety`
- `smoke`

## New Tests Required in Implementation Phase
- Schema-level test coverage for EvidenceItem create/read shape constraints.
- Repository/service tests for:
  - freshness window behavior (`observedAt` + `ttlSeconds`)
  - contradiction-state filtering
  - entity scoping by (`entityType`, `entityId`)
- Cockpit read-surface tests ensuring internal-only visibility.
- Negative tests proving no public route exposure.
- Smoke extension covering internal cockpit evidence rendering path.

## First Consumer Surfaces
First consumers are internal only:

1. Cockpit-only read interface (primary)
2. No public surface exposure
3. No external/public API exposure
4. Later expansion target: internal Ask the Brain in planned Phase 7

## Non-Goals for MVP
- No public Evidence Vault pages
- No source ingestion automation redesign
- No dependency changes
- No route-set expansion for public users

## Risks and Open Questions
- Source document mismatch risk: the referenced `docs/brain/evidence-vault.md` is missing in this workspace, so owner confirmation is required before implementation begins.
- Enum vs free-text decision for `sourceTier` and `contradictionState` must be finalized pre-migration.
- Dedupe strategy (strict unique constraint vs application-level idempotency) requires owner decision.

## Approval Gate (Required)
Implementation is blocked until owner explicitly approves:

1. The proposed `EvidenceItem` schema and index strategy.
2. Internal-only first-consumer scope.
3. Enum and dedupe policy choices.
4. Confirmation that this ADR reflects the intended `docs/brain/evidence-vault.md` proposal.