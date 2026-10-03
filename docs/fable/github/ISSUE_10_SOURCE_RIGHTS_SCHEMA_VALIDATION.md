# Issue 10: Source rights schema validation

## Context
Source/legal boundaries are now machine-readable through schemas and validators.

## Why It Matters
Unknown status must not be treated as allowed.

## Acceptance Criteria
- Source registry adapter validates required fields.
- Unknown commercial/storage/redistribution statuses are blocked.
- Schema docs are linked.

## Files Likely Touched
- `apps/web/lib/fable/source-registry.ts`
- `apps/web/lib/fable/evidence/validators.ts`
- `schemas/fable/source-registry-entry.schema.json`

## Test Plan
- `npm run fable:sources`

## Risk
Registry fields can drift.

## Owner Decision Needed
Legal-review marker process.
