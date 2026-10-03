# Issue 06: Clean Rooms synthetic partner demo

## Context
Clean Rooms concepts are represented with synthetic partner schemas only.

## Why It Matters
Partnership can be technically imaginable without exposing raw data.

## Acceptance Criteria
- Partner schemas cover media, DFS/fantasy, sportsbook/operator, team/training, data-provider, and community cohort.
- Allowed and disallowed query examples exist.
- Privacy thresholds are explicit.

## Files Likely Touched
- `docs/fable/aws/clean-rooms-demo/*`

## Test Plan
- Docs review plus `npm run fable:evidence`.

## Risk
Synthetic demo could be mistaken for a real partnership.

## Owner Decision Needed
Partner and legal review.
