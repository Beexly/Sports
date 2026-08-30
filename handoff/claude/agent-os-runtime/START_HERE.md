# START HERE — Agent OS Runtime

Codex fixed the offline build gate and added the first runtime layer: durable task store abstraction, workflow events, safe queue facades, data reliability tasking, memory candidates, market/CLV helpers, and calibration metrics.

Review in this order:

1. `apps/web/app/layout.tsx`
2. `apps/web/__tests__/agent-os-runtime.test.ts`
3. `apps/web/lib/tasks/agent-task-store.ts`
4. `apps/web/lib/workflows/workflow-runtime.ts`
5. `apps/web/lib/data-reliability/*`
6. `apps/web/lib/market/*`
7. `apps/web/lib/calibration/*`
