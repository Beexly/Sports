# BullMQ / Worker Orchestration Runtime

Implemented safe queue facades in:

- `apps/web/lib/agents/agent-queue.ts`
- `apps/web/lib/agents/agent-worker-dispatch.ts`
- `apps/web/lib/workflows/workflow-queue.ts`

## Behavior

- Safe internal tasks can be queued only after task routing accepts them.
- Owner approval and Claude review tasks pause.
- NOT_WIRED/executable mismatches block.
- Missing Redis is labeled `MANUAL_NO_REDIS`, not hidden as healthy.
- CHAIN owns workflow orchestration state.
