# WHAT IS TYPED / DESIGNED-ONLY (not effectively live yet)

## 1. Agent-task DB persistence — in-memory only today (the one real gap)
`agent-task-store.ts` *attempts* to persist to the `CockpitTask` model, but:
- the `create` payload **omits the required `assignedAgent` column** (enum `OperatorAgent`,
  no default) → every real-DB write throws and is swallowed by the `try/catch`;
- `OperatorAgent` enumerates only **6** agents (JARVIS/SARAH/TAL/SCOUT/AVA/BOBBY) vs the
  registry's **23**, so 16 agents could never persist even if the column were supplied.

Net: against a real Postgres, Agent OS tasks live in the **in-memory `Map` only**. Safe
(graceful fallback, honest UI) but the handoff name "PERSISTED_TASK_RUNTIME" overstates it.
Fix = owner-level schema decision (extend the enum) + include `assignedAgent` in the write.
See NEXT_BEST_BUILD.md.

## 2. Workflow "runtime" is a planner, not an executor
`planWorkflowRun` returns a *plan* (routed tasks + gate decision). There is no scheduler that
actually runs workflow stages end-to-end on a cadence. The naming is honest ("plan"), and the
BullMQ/queue facades (`agent-queue.ts`, `workflow-queue.ts`) degrade to a documented
`MANUAL_NO_REDIS` state rather than pretending to run. So: governed-design + safe facade, not
a live autonomous loop.

## 3. By-design "designed, not autonomous"
All 23 agents are NOT_WIRED / DRAFT_ONLY / MANUAL. Nothing executes autonomously
(`operationalCapacity = 0`). This is intentional and honestly labeled — listed here only so
the reader doesn't mistake the rich registry for running processes.
