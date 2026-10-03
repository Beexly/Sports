# WHAT IS REAL (executes real logic, wired + tested)

- **Agent OS registry** — `agent-registry.ts` (23 agents), `agent-os.ts`,
  `agent-status.ts`, `agent-capabilities.ts`, `agent-departments.ts`, `agent-authority.ts`.
  Typed data + pure functions (`getAgent`, `canAgentExecute`, `canAgentDraft`,
  `assertAgentCanReceiveExecutableTask`). Honest per-agent status; `externalActionsAllowed:false`
  for all; forbidden-action list on all.
- **Agent health** — `agent-health.ts` `summarizeAgentHealth()`; `operationalCapacity = 0`
  (only REAL|PARTIAL counted); notWired/draftOnly/manual tracked separately. Rendered.
- **Task router + runtime** — `agent-task-router.ts`, `agent-task-runtime.ts`,
  `agent-task-gates.ts`, `agent-task-priority.ts`, `agent-task-types.ts`,
  `agent-task-seed.ts`, `agent-task-seed-runtime.ts`. Real routing, fail-closed gates,
  transition rules, dedupe. `safeActionType` typed to the 14 safe actions only.
- **Task store** — `agent-task-store.ts`. In-memory `Map` runtime that *attempts* DB
  persistence via the real `CockpitTask` model. (DB write currently no-ops — see
  WHAT_IS_TYPED_ONLY.md — but the in-memory runtime is real.)
- **Workflows** — `workflow-registry.ts` (14), `workflow-runner.ts` (`planWorkflowRun`),
  `workflow-gates.ts` (`workflowCanPublish`/`workflowCanChangeModelWeights` ⇒ literal
  `false`), `workflow-events.ts`, `workflow-runtime.ts`, `workflow-event-store.ts`,
  `workflow-task-bridge.ts`, `workflow-queue.ts`, `workflow-status.ts`.
- **Jarvis operating layer** — `jarvis-operating-assessment.ts`,
  `jarvis-decision-queue.ts`, `jarvis-owner-summary.ts`, `jarvis-department-health.ts`.
  `companyHealth ∈ {CRITICAL,CAUTION,UNKNOWN}` (no green). Rendered in the cockpit.
- **Cockpit operating map** — `cockpit-operating-map.ts` (24+ surfaces → owning agent +
  workflow + review gates).
- **NFL identity resolvers** — `nfl/player-identity-resolver.ts` (GSIS-only; no name-only
  merge), `team-resolver.ts`, `game-resolver.ts` (no commence-time-only join),
  `season-week.ts` (`isSettledHistoricalSeason`). The crosswalk I had queued — built safely.
- **Stat coverage auditor** — `statking/stat-coverage-auditor.ts`; routes gaps to
  PRISM/ASCEND with `claudeReviewRequired`.
- **Projection feature registry** — `projections/projection-feature-registry.ts`; every
  feature `requiresOwnerApprovalForWeightChange` + `excludesUnsettledSeasons`.
- **Calibration math** — `calibration/brier.ts`, `ece.ts`, `display-safety.ts`,
  `calibration-report.ts`, `model-version-report.ts`. Pure, gated. (Duplicates engine math —
  see DUPLICATION_VS_MY_BRANCH.md.)
- **Market foundation** — `market/line-snapshot.ts`, `line-movement.ts`, `clv-candidate.ts`,
  `market-tasks.ts`. Coarse but gated (CLV BLOCKED until open+close+result).
- **Data reliability** — `data-reliability/stale-data-detector.ts`, `ingestion-health.ts`,
  `data-reliability-tasks.ts`.
- **Memory candidate runtime** — `memory/memory-candidate-runtime.ts`, `memory-review-queue.ts`,
  `memory-types.ts`. Review-gated; no auto-approve.
- **Cockpit UI** — `app/cockpit/page.tsx` `OperatingRuntimeZone` renders the honest assessment.
- **Offline build fix** — `app/layout.tsx` (no `next/font/google`).
