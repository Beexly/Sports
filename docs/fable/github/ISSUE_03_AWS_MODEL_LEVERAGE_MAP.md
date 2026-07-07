# Issue 03: AWS model leverage map

## Context
Model classes are mapped without assuming account access or model availability.

## Why It Matters
Prevents hype while preserving AWS leverage paths.

## Acceptance Criteria
- Model classes include workload, cost, risk, fallback, AWS candidate, non-AWS candidate, and decision.
- Official AWS docs are cited.
- No paid model call is required.

## Files Likely Touched
- `docs/fable/aws/AWS_MODEL_LEVERAGE_MAP.md`
- `docs/fable/aws/AWS_MODEL_ROUTER_DESIGN.md`

## Test Plan
- `npm run fable:evidence`

## Risk
AWS service availability can drift.

## Owner Decision Needed
Bedrock or model-provider access.
