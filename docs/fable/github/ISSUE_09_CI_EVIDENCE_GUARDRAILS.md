# Issue 09: CI evidence guardrails

## Context
A no-cost FABLE workflow runs local checks only.

## Why It Matters
Evidence checks should be easy to run without AWS credentials.

## Acceptance Criteria
- Workflow runs claim ledger validation, source validation, AWS gate validation, docs scanner, and targeted FABLE tests.
- No network-only service or AWS credential is required.

## Files Likely Touched
- `.github/workflows/fable-evidence.yml`
- `package.json`

## Test Plan
- `npm run fable:evidence`
- targeted FABLE tests.

## Risk
Workflow may duplicate existing CI.

## Owner Decision Needed
Whether to make it branch-protection required.
