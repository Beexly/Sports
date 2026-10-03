# Task Routing Implementation

Implemented a typed seed task queue and deterministic router under `apps/web/lib/tasks`.

## Real behavior

- Tasks include status, priority, risk, department, assigned agent, workflow, evidence, approvals, blocked reason, artifacts, next action, and safe action type.
- Blocked tasks stay blocked.
- DRAFT_ONLY agents can receive draft tasks but not executable tasks.
- NOT_WIRED agents cannot receive executable tasks.
- Owner/Claude review fields are explicit.
- Repeated task IDs update instead of spam.

## Seeded operating queue

Includes public-picks gate, CLV foundation, stale-ingestion alerting, score-source rights review, 25-pick calibration threshold, content review, subscription intelligence, ccusage rollup, memory candidate system, tool governance, historical feature registry, and stat coverage auditor.
