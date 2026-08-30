# Issue 04: AgentCore security firebreak

## Context
Future agents need default-deny permissions.

## Why It Matters
Agents must not gain deploy, paid-resource, publishing, or source-automation authority by default.

## Acceptance Criteria
- Agent roles are listed.
- Tool permissions are explicit.
- Failure modes and rollback paths exist.

## Files Likely Touched
- `docs/fable/aws/AGENTCORE_SECURITY_FIREBREAK.md`
- `docs/fable/aws/AGENT_TOOL_PERMISSION_MATRIX.md`
- `docs/fable/aws/AGENT_EVALUATION_RUBRICS.md`

## Test Plan
- Docs review plus `npm run fable:evidence`.

## Risk
Future implementation could exceed documented permissions.

## Owner Decision Needed
Tool allowlist and approval policy.
