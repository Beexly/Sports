# Test Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run db:generate` | PASS | Required pre-TypeScript generation step. |
| `npm run test --workspace=apps/web -- agent-os-operating-spine.test.ts` | FAIL then PASS | First run exposed a draft-task routing mismatch; fixed seed task action type to `DRAFT`; rerun passed 17 tests. |
| `npm run typecheck` | PASS | Passed across workspaces after Agent OS implementation. |
| `npm run build` | WARN | Blocked by environment/network font fetch failures from Google Fonts in `app/layout.tsx`; no Agent OS compile error surfaced before the network font failure. |
