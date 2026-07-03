# PR: FABLE second-level evidence machine

## Context
Adds the additive claim-verification, evidence harness, forensic demo, AWS model map, edge lab, red-team review, schemas, and local/CI guard surface.

## Why It Matters
The repo now separates ambition from evidence with executable checks.

## Acceptance Criteria
- `npm run fable:evidence` passes.
- Claim ledger validates.
- Unsupported terms are blocked unless downgraded or evidence-tied.
- AWS gates default off.
- Public-data demo remains fixture-only.

## Files Likely Touched
- `apps/web/lib/fable/**`
- `scripts/fable-*.ts`
- `docs/fable/**`
- `schemas/fable/**`
- `.github/workflows/fable-evidence.yml`

## Test Plan
- `npm run fable:evidence`
- `npm run fable:demo`
- targeted FABLE Vitest tests
- guardrails

## Risk
Docs and local checks only; no AWS resources or paid services.

## Owner Decision Needed
Only for future AWS/model/live-data moves.
