# FILES REVIEWED (first-hand, on Codex's `3a381d4c`)

## Read in full
- `apps/web/lib/agents/agent-status.ts`
- `apps/web/lib/agents/agent-health.ts`
- `apps/web/lib/agents/agent-registry.ts` (the 23-agent source of truth)
- `apps/web/lib/agents/agent-capabilities.ts`
- `apps/web/lib/agents/agent-authority.ts`
- `apps/web/lib/tasks/agent-task-gates.ts`
- `apps/web/lib/tasks/agent-task-types.ts`
- `apps/web/lib/tasks/agent-task-runtime.ts`
- `apps/web/lib/tasks/agent-task-store.ts`
- `apps/web/lib/jarvis/jarvis-operating-assessment.ts`
- `apps/web/lib/calibration/display-safety.ts`
- `apps/web/lib/calibration/brier.ts`
- `apps/web/lib/calibration/ece.ts`
- `apps/web/lib/workflows/workflow-gates.ts`
- `apps/web/lib/workflows/workflow-runner.ts`
- `apps/web/lib/nfl/player-identity-resolver.ts`
- `apps/web/lib/market/clv-candidate.ts`
- `apps/web/__tests__/agent-os-operating-spine.test.ts` (17 tests)
- `apps/web/app/cockpit/page.tsx` (diff — the `OperatingRuntimeZone`)
- `apps/web/app/layout.tsx` (offline-font fix, via diff)
- `apps/web/__tests__/homepage-doctrine-hero.test.ts` (diff)
- `apps/web/__tests__/morning-setup-script.test.ts` (diff)
- `scripts/morning-setup.mjs` (diff)
- `packages/db/prisma/schema.prisma` lines 1080–1108 (`CockpitTask` model) + `OperatorAgent` enum

## Verified via diff name-status / grep (not individually opened, but classified)
- `apps/web/lib/agents/{agent-os,agent-departments,agent-queue,agent-worker-dispatch}.ts`
- `apps/web/lib/tasks/{agent-task-router,agent-task-priority,agent-task-seed,agent-task-seed-runtime}.ts`
- `apps/web/lib/workflows/{workflow-registry,workflow-events,workflow-runtime,workflow-event-store,workflow-task-bridge,workflow-queue,workflow-status}.ts`
- `apps/web/lib/jarvis/{jarvis-decision-queue,jarvis-owner-summary,jarvis-department-health}.ts`
- `apps/web/lib/cockpit/cockpit-operating-map.ts`
- `apps/web/lib/nfl/{team-resolver,game-resolver,season-week}.ts`
- `apps/web/lib/statking/stat-coverage-auditor.ts`
- `apps/web/lib/projections/projection-feature-registry.ts`
- `apps/web/lib/calibration/{calibration-report,model-version-report}.ts`
- `apps/web/lib/market/{line-snapshot,line-movement,market-tasks}.ts`
- `apps/web/lib/data-reliability/{stale-data-detector,ingestion-health,data-reliability-tasks}.ts`
- `apps/web/lib/memory/{memory-candidate-runtime,memory-review-queue,memory-types}.ts`
- `apps/web/__tests__/{agent-os-runtime,jarvis-operating-runtime-cockpit}.test.ts`

## Confirmed NOT changed (grep over the full diff name-list)
`clearance-engine`, `source-rights-registry`, `data-rules`, `responsible*`,
`requirePremium*`/entitlements, `readiness`, `stripe`/`webhook`, `paywall`, `auth`.
Zero code deletions.

## Cross-referenced
- Codex's own chat transcript / handoff (db:generate, typecheck-after-regenerate, build with
  only the Sentry/OTel warning, 3 named tests) — matches my independent gate runs.
