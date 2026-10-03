# Issue 02: Public-data forensic demo

## Context
The demo is fixture-only and shows what GSE would flag.

## Why It Matters
It creates a visible, reproducible review artifact without fake ROI.

## Acceptance Criteria
- Demo fixture validates.
- Report states what is and is not claimed.
- Reproduction command works.

## Files Likely Touched
- `docs/fable/demo/*`
- `scripts/fable-demo-forensic-report.ts`

## Test Plan
- `npm run fable:demo`
- FABLE evidence harness test.

## Risk
Readers may mistake fixture output for live data.

## Owner Decision Needed
Approval for any live-data demo.
