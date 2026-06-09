# Autonomous Intelligence R&D — Closeout 2026-06-08

Source checkout: `C:\Users\Garrett\Sports` @ `safety/sports-wip`
Canonical: `C:\Users\Garrett\Sports-canonical-2026-06-03` @ `claude/edge-map-rebuild-2026-06-04`
Ported: 2026-06-08

## What changed

**Code (already in canonical — world-model.ts was identical):**

The research checkout extended `packages/types/src/world-model.ts` with the full autonomous
control-plane layer. Verified against canonical before porting — both files were identical at
731 lines. The code was already synced from the prior scheme/GitHub pass.

New type domains added in that pass (all already in canonical):
- `SignalDomain` (27 domains, P0–P3)
- `SignalCriticality`, `SourceHealthStatus`, `FallbackMode`, `NoDataPolicy`, `FallbackChainStatus`
- `SourceFallbackStep`, `SourceFallbackChain`, `SourceFallbackEvaluation`
- `IntelligenceCoverageRequirement`, `DomainCoverageSnapshot`, `CoverageEvaluation`
- `AutonomousSystemKind`, `AutonomousSystemStatus`, `AutonomousSystemRun`
- `ControlPlaneSummary`, `ControlPlaneSnapshot`
- Helpers: `isFallbackStepUsable`, `evaluateFallbackChain`, `evaluateCoverageRequirement`,
  `getAutonomousSystemHealth`, `summarizeControlPlaneSnapshot`

**Tests (already in canonical — world-model.test.ts was identical):**

The control-plane test suite (5 new `it` blocks covering fallback selection, legal blocks,
coverage freshness, autonomous system health, and control-plane summary) was already ported.
40 tests green, typecheck clean.

**Docs (net-new — ported this pass):**

| File | Description |
|---|---|
| `gse-autonomous-intelligence-engine.md` | Five-layer engine architecture, "everything matters" rule, backup system rule, build sequence, non-negotiables |
| `gse-autonomous-system-health-spec.md` | 10-system register, 6 health states, debug contract, control-plane views |
| `gse-autonomous-intelligence-claude-handoff.md` | Build queue (AUTO-001–012), implementation rules, validation commands |
| `gse-autonomous-intelligence-build-queue.jsonl` | Machine-readable build queue for AUTO-001–012 |
| `gse-intelligence-domain-coverage-matrix.md` | 27-domain coverage matrix with primary/fallback/governance per domain |
| `gse-intelligence-domain-coverage-matrix.csv` | Same matrix as 28-row CSV for programmatic use |
| `gse-source-fallback-map.jsonl` | 27 fallback chains, one per domain, with criticality/policy/minimum fields |

## Core principle now encoded

Every signal can matter, but nothing gets to hallucinate.

P0/P1 domains need: primary source → fallback → no-data policy → output-withholding behavior
→ operator alert → debug trace → recovery rule. If a P0 source fails with no backup, the
product withholds dependent output instead of guessing.

## Build queue (AUTO-*) — priority order

**P0 (must precede any public control-plane surface):**
- AUTO-001: Control-plane fixture generator (JSON fixtures for cockpit dev)
- AUTO-002: Source registry seed files (Odds API, nflverse, TheRundown, weather, officials)
- AUTO-003: Domain coverage evaluator (emit blind spot/degraded/covered states)
- AUTO-004: Extend `/api/health` (after storage/schema approval — founder-gated, never public source details)

**P1 (cockpit intelligence layer):**
- AUTO-005: Cockpit Source Health view (source health, freshness, legal state, fallback, review queue)
- AUTO-006: Debug trace IDs on workers (ingestion, pick generation, settlement, content drafting)
- AUTO-007: Source-failure simulator (inject provider timeout/stale/legal-block scenarios)
- AUTO-008: Reporter/analyst registry (beat writers, outlets, claim types, reliability, contradictions)
- AUTO-009: Officials/referee profile pipeline (nflreadr + PBP penalty/game totals → trend cards)
- AUTO-010: Stadium/wind model (coordinates/roof/azimuth → football-impact wind features)

**P2 (operational hygiene):**
- AUTO-011: Agent handoff compression gate
- AUTO-012: Cost and provider budget circuit breakers

## Approval-gated items in this queue

- AUTO-004 (`/api/health` extension) requires storage/schema approval before building.
- AUTO-007 (source-failure simulator) requires staging environment.
- AUTO-008 (reporter registry) requires beat-reporter sourcing and legal review.
- AUTO-009 (officials pipeline) is observational-only; no bias or misconduct language.
- AUTO-010 (stadium/wind) builds on existing `schedule-context.ts` NWS path; lat-long
  + altitude registry is the net-new piece (maps to BUILD-008 from the main queue).

## Verify-before-building confirmed

- Code: world-model.ts and world-model.test.ts are identical in both checkouts. **No port needed.**
- Docs: 7 files were missing from canonical. **All ported this pass.**
- The `RECONCILIATION-2026-06-08.md` file already exists in canonical and covers the prior passes;
  this closeout adds the autonomous intelligence pass context.
