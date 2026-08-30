# Agent OS Implementation

Implemented a typed Agent OS spine under `apps/web/lib/agents`.

## What is real

- 23-seat council registry with required fields: identity, department, status, tier, mission, authority, allowed/forbidden actions, escalation, review gates, cockpit surfaces, task types, health rules, failure modes, and next executable action.
- External actions are false for every agent.
- NOT_WIRED agents cannot receive executable tasks.
- DRAFT_ONLY agents may draft but cannot publish.
- MANUAL agents remain human-triggered.
- PRISM/ASCEND/AUDIT scoring-sensitive work requires owner and review gates.
- PILOT/ECHO/RELAY remain blocked until tool/voice/browser governance exists.

## Files

- `apps/web/lib/agents/agent-os.ts`
- `apps/web/lib/agents/agent-registry.ts`
- `apps/web/lib/agents/agent-status.ts`
- `apps/web/lib/agents/agent-authority.ts`
- `apps/web/lib/agents/agent-departments.ts`
- `apps/web/lib/agents/agent-capabilities.ts`
- `apps/web/lib/agents/agent-health.ts`
