# Experiment Log

| Experiment | Status | Command | Result | Decision |
| --- | --- | --- | --- | --- |
| FABLE evidence harness | local | `npm run fable:evidence` | pending final run | required |
| Fixture forensic demo | local | `npm run fable:demo` | pending final run | demo-only |
| First-level targeted FABLE tests | complete | app vitest command | passed 18 tests | keep |
| Workspace typecheck | failed | `npm run typecheck --workspaces --if-present` | BigInt target issue | fix separately |
