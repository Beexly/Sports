# Claude Handoff: Autonomous Intelligence Engine

Generated: 2026-06-09
Repo: C:\Users\Garrett\Sports

## Objective

Turn GSE from a research-rich sports site into a source-governed autonomous decision OS. The implementation must make every P0/P1 data domain observable, backed up, and debuggable.

## Code Already Added

- packages/types/src/world-model.ts now includes SignalDomain, SourceFallbackChain, coverage requirements, AutonomousSystemRun, ControlPlaneSnapshot, and helper functions for fallback/coverage/health summaries.
- packages/types/src/__tests__/world-model.test.ts covers fallback source selection, legal blocks, coverage freshness, autonomous system status, and control-plane summaries.

## Build Queue

| ID | Priority | Task | Output |
| --- | --- | --- | --- |
| AUTO-001 | P0 | Add control-plane fixture generator | Create JSON fixture from SourceFallbackChain, CoverageEvaluation, and AutonomousSystemRun types for cockpit development. |
| AUTO-002 | P0 | Seed source registry docs/data | Create canonical source records for Odds API, nflverse, SportsDataIO candidate, TheRundown candidate, weather, officials, and manual review paths. |
| AUTO-003 | P0 | Build domain coverage evaluator | Read coverage requirements and current source runs, then emit blind spot/degraded/covered states. |
| AUTO-004 | P0 | Extend health route after storage approval | Add autonomous system and domain coverage checks to /api/health without exposing private source details publicly. |
| AUTO-005 | P1 | Add cockpit Source Health view | Show source health, freshness, legal state, active fallback, and manual-review queue. |
| AUTO-006 | P1 | Add debug trace IDs to workers | Attach trace_id, source_run_id, and decision_id to ingestion, pick generation, settlement, and content drafting. |
| AUTO-007 | P1 | Build source-failure simulator | Inject provider timeout/stale/legal-block scenarios and assert withhold/fallback behavior. |
| AUTO-008 | P1 | Build reporter/analyst registry | Track beat writers, outlets, claim types, reliability, contradictions, and official confirmation latency. |
| AUTO-009 | P1 | Build officials/referee profile pipeline | Join nflreadr officials with PBP penalty/game totals and generate observational trend cards. |
| AUTO-010 | P1 | Build stadium/wind model | Join stadium coordinates/roof/azimuth to weather sources and produce football-impact wind features. |
| AUTO-011 | P2 | Agent handoff compression gate | Require source ledger, file list, validation status, and next task in every Claude/Codex handoff artifact. |
| AUTO-012 | P2 | Cost and provider budget circuit breakers | Pause non-critical API/model usage when budget thresholds or provider error budgets burn too fast. |

## Implementation Rules

- Start with fixtures and read-only cockpit surfaces before database schema changes.
- Do not expose private source names, reliability scores, or raw provider payloads publicly.
- Any P0/P1 domain without coverage should degrade or withhold dependent output.
- Every worker must have trace IDs, run IDs, failure counts, and runbook links.
- Every source must have legal state and allowed surfaces before it can power a user-facing claim.

## Validation Commands

- npm.cmd run test --workspace=packages/types
- npm.cmd run typecheck --workspace=packages/types
- npm.cmd run typecheck --workspaces --if-present
