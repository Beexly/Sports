# Persisted Task Runtime

Implemented `apps/web/lib/tasks/agent-task-store.ts`, `agent-task-runtime.ts`, and `agent-task-seed-runtime.ts`.

## Behavior

- Agent OS seed tasks can be persisted through the existing `CockpitTask` delegate when a real DB is available.
- Stub/no-DB mode degrades to an in-memory store instead of crashing.
- Tasks are deduped by Agent OS task id.
- Blocked tasks remain blocked.
- Owner/Claude review tasks cannot be automatically completed.
- Persistence stores the complete Agent OS task payload without adding a duplicate Prisma table.
