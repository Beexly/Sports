# Issue 01: Claim evidence ledger

## Context
The ledger classifies high-risk FABLE/NFL/AWS claims.

## Why It Matters
Unsupported claims need visible downgrade.

## Acceptance Criteria
- Ledger JSON validates.
- High-risk proven claims have evidence files.
- Legal claims require source-rights evidence or legal marker.

## Files Likely Touched
- `docs/fable/evidence/*`
- `apps/web/lib/fable/evidence/*`

## Test Plan
- `npm run fable:claims`

## Risk
Incomplete claim extraction from OneNote.

## Owner Decision Needed
Legal review process for future legal markers.
