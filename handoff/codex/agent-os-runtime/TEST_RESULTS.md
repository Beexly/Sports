# Test Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run db:generate` | PASS | Prisma client regenerated before runtime TypeScript work. |
| `npm run test --workspace=apps/web -- agent-os-runtime.test.ts homepage-doctrine-hero.test.ts` | FAIL then PASS | First run exposed expected queue pause ordering; updated test expectation to owner pause. |
| `npm run typecheck` | PASS | All workspaces passed. |
| `npm run build` | PASS | Build gate fixed; Google Fonts network failure removed. Existing Sentry/OpenTelemetry warning remains non-fatal. |
| `npm run test --workspace=apps/web -- agent-os-operating-spine.test.ts agent-os-runtime.test.ts homepage-doctrine-hero.test.ts` | PASS | 30 tests passed. |
| `npm run test --workspace=apps/web -- jarvis-operating-runtime-cockpit.test.ts agent-os-operating-spine.test.ts agent-os-runtime.test.ts` | PASS | 29 tests passed for cockpit runtime wiring plus existing Agent OS spine/runtime coverage. |
| `npm run db:generate && npm run typecheck` | PASS | Prisma regenerated first; typecheck passed across workspaces after cockpit runtime wiring. |
