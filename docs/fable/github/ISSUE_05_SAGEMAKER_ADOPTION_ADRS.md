# Issue 05: SageMaker adoption ADRs

## Context
SageMaker is mapped as an adoption ladder.

## Why It Matters
AWS ML should be used only when it adds scale, governance, reproducibility, partnership readiness, or operational safety.

## Acceptance Criteria
- Six ADRs exist.
- Each includes context, decision, cost/security/repo impact, rollback, and owner approval.

## Files Likely Touched
- `docs/fable/aws/sagemaker-adrs/*`

## Test Plan
- `npm run fable:evidence`

## Risk
Premature cloud ML cost.

## Owner Decision Needed
Cloud ML budget and runtime approval.
