# Issue: Add Personal AWS Learning Bridge

## Context

Garrett's AWS learning should improve GSE/FABLE architecture decisions without putting private learning records, credentials, account identifiers, or paid resources in the repo.

## Why It Matters

The repo needs a public-safe way to connect AWS learning to cost gates, IAM posture, service-fit reasoning, partner vocabulary, and no-cost spike design.

## Acceptance Criteria

- `docs/personal/aws/README.md` defines allowed and disallowed evidence.
- personal learning proof uses the checked-in schema.
- each learning item maps to a GSE/FABLE system and repo action.
- proof links stay blocked until owner approval.
- no secrets, account IDs, payment data, or private application data are included.

## Files Touched

- `docs/personal/aws/**`
- `schemas/fable/personal-learning-evidence.schema.json`
- `apps/web/lib/fable/evidence/schemas.ts`
- `apps/web/lib/fable/evidence/validators.ts`
- `apps/web/lib/fable/evidence/evidence-harness.test.ts`

## Test/Docs Validation

- `npm run fable:evidence`
- targeted FABLE evidence harness tests
- `npm run guard:secrets`
- `git diff --check`

## Risks

- overstating course completion before public proof exists.
- leaking personal screenshots.
- implying live AWS readiness from learning artifacts.

## Owner Decisions

- approve exact public proof links or screenshots.
- decide which completed learning items can be public.
- approve any future live AWS discovery separately.
