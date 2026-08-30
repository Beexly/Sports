# Typecheck Results

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run typecheck` | 2 | Initial failure captured in `TYPECHECK_FAILURE_RAW.log`; missing Prisma exports from stale generated client. |
| `npm run db:generate` | 0 | Regenerated Prisma Client v5.22.0 from `packages/db/prisma/schema.prisma`. |
| `npm run typecheck` | 0 | Passed across web, data-ingestion, db, ingestion-pipeline, prediction-engine, types, and workers. |
| `npm run test --workspace=apps/web -- cockpit-transitions.test.ts promotions-guards.test.ts promotions-public-payload.test.ts moderation-tooling.test.ts calibration-api.test.ts` | 0 | Passed 91 affected app tests covering cockpit tasks/transitions, promotions, moderation, and calibration route coverage. |
| `npm run test --workspace=packages/data-ingestion -- --runInBand` | 1 | Invalid Vitest option; reran with the workspace's native script below. |
| `npm run test --workspace=packages/data-ingestion` | 0 | Passed 100 data-ingestion tests including odds/source coverage. |
