# Aesthetic & IA R&D — Closeout 2026-06-09

Source checkout: `C:\Users\Garrett\Sports` @ `safety/sports-wip`
Canonical: `C:\Users\Garrett\Sports-canonical-2026-06-03` @ `claude/edge-map-rebuild-2026-06-04`
Ported: 2026-06-09

## What changed

### Code — autonomous intelligence control-plane surface

**`apps/web/lib/cockpit/intelligence-control-plane.ts`** (new)
Fixture-backed implementation of the source control-plane view. Covers AUTO-001
(control-plane fixture generator), AUTO-002 (source registry seed), and AUTO-003
(domain coverage evaluator) in one consolidated module:
- `REQUIREMENTS` — 8 `IntelligenceCoverageRequirement` records from the 27-domain matrix
  (ODDS, INJURY, COACH_STAFF, SCHEME_TENDENCY, OFFICIALS, WIND, BEAT_REPORTER,
  AUTONOMOUS_SYSTEM_HEALTH)
- `COVERAGE` — parallel `DomainCoverageSnapshot` records with active/stale/blocked/manual-review counts
- `FALLBACK_CHAINS` — 4 `SourceFallbackChain` records with full `SourceFallbackStep[]` (ODDS,
  INJURY, OFFICIALS, WIND)
- `SYSTEMS` — 5 `AutonomousSystemRun` records (source-health-monitor, odds-ingestion-worker,
  football-state-worker, claim-governance-scanner, debug-trace-collector)
- `loadIntelligenceControlPlaneView()` — calls `evaluateCoverageRequirement()`,
  `evaluateFallbackChain()`, `getAutonomousSystemHealth()`, and
  `summarizeControlPlaneSnapshot()` from `@sports/types`; sorts by criticality and state

**`apps/web/app/cockpit/sources/page.tsx`** (replaced)
Old page was the `DATA_SOURCE_STACK` founder dashboard. Replaced with the typed
control-plane view: autonomous system health table, domain coverage cards, and fallback
chain breakdowns. Admin-gated (cockpit layout handles auth); fixture-backed until live
source registry + run tables are approved. Render test verifies the three main headings
and OFFICIALS coverage row.

**Tests:**
- `apps/web/__tests__/cockpit-control-plane.test.ts` — 3 unit tests (operator summary,
  P0/P1 blind spots, page content smoke check against the new headings)
- `apps/web/__tests__/cockpit-control-plane-render.test.tsx` — 1 render test (4 headings
  + OFFICIALS visible, real component via @testing-library/react)
- All 4 pass. `packages/types` 40 tests green.

### Docs — Aesthetic & IA R&D (8 files, all net-new)

| File | Description |
|---|---|
| `gse-aesthetic-rd-master-plan.md` | Full R&D plan: 84-row competitor aesthetic matrix rationale, 2025/2026 design reference analysis, operator vs public-story design modes, GSE aesthetic north-star |
| `gse-competitor-aesthetic-matrix.md` | 84-row competitor aesthetic matrix (narrative) |
| `gse-competitor-aesthetic-matrix.csv` | 84-row CSV for programmatic use |
| `gse-top-2025-2026-design-references.md` | 20 2025 reference designs + 20 2026 YTD references with relevance notes for GSE |
| `gse-design-motion-repo-watchlist.md` | 20 design/motion/data-UI OSS repos with rationale |
| `gse-design-motion-repo-watchlist.csv` | Same watchlist as CSV |
| `gse-aesthetic-claude-handoff.md` | Claude-ready build plan: ordered steps, hard rules, acceptance checklist |
| `gse-aesthetic-build-queue.jsonl` | 8-card machine-readable build queue (GSE-AESTH-01 through 08) |

The IA audit (`docs/aesthetic-ia-audit-2026-06-08.md`) was already in canonical.

## Core findings (from the aesthetic R&D pass)

**Single-theme decision: All-Dark Premium (Option B).**
Live audit showed 23/25 routes already dark. Two outliers (`/intelligence/engines`,
`/players`) are the exceptions. Rework cost: 2 pages + one token consolidation pass.
Full-light rebrand would require replacing 23 routes and abandoning the galaxy brand.

**IA verdict: 5 doors, nothing outside them.**
Current 122 routes / 46 top-level segments → 5 product doors + 35 organized children.
BOARD, PLAYERS, INTELLIGENCE, FANTASY, ACCOUNT. See audit for door-by-door breakdown,
redirect plan, and route-count impact.

**Transparency verdict: progressive disclosure, not always-open.**
Default (zero clicks): title + data + one orienting sentence. On-demand (one click):
methodology, formulas, explainers. Cut the 8 duplicate bottom `<Note>` calls, collapse
`MetricExplainer` to closed, trim PageHero descriptions to one sentence, promote
ProofView KPI cards before methodology essays.

**Copy verdict: 7 voice rules, retire `X, not Y`.**
Lead with the sport. Cap `X, not Y` at one per page. Kill fortune-cookie stacks.
One eyebrow per page, not per paragraph. Show the receipt instead of describing honesty.

## Aesthetic build queue (GSE-AESTH-01–08)

| ID | Title | Priority |
|---|---|---|
| GSE-AESTH-01 | Design token audit (cockpit vs public story tokens) | P0 |
| GSE-AESTH-02 | Cockpit table modernization (TanStack Table + Virtual spike) | P0 |
| GSE-AESTH-03 | Motion system (state transitions, drawers, tabs, reduced-motion) | P0 |
| GSE-AESTH-08 | Automated visual QA (Playwright screenshots, mobile, reduced-motion) | P0 |
| GSE-AESTH-04 | Operator command palette (cmdk cockpit navigation) | P1 |
| GSE-AESTH-05 | Evidence drawer (source proof, fallback, conflict) | P1 |
| GSE-AESTH-06 | Autonomous system topology map (xyflow spike) | P1 |
| GSE-AESTH-07 | Public design reference page (premium explainer) | P2 |

**Note on sequencing:** The IA audit Phases 1–4 (theme unification → transparency trim →
IA consolidation → copy rewrite) are prerequisite to the aesthetic build queue.
Phase 1 (theme, Size S) and Phase 2 (transparency, Size M) can ship same-day.
Phase 3 sub-tasks are independent and deploy incrementally. Phase 4 is parallelizable.

## Approval-gated items

- GSE-AESTH-04 (command palette): cockpit-only; founder review before shipping
- GSE-AESTH-06 (topology map): xyflow adds a dependency; justify against a named workflow
- GSE-AESTH-07 (public reference page): no unsupported win-rate claims; same approval as
  all public pages
- Any dependency additions: must be justified by a named GSE workflow per the hard rules

## Verify-before-building confirmed

- `intelligence-control-plane.ts` — absent in canonical; genuine net-new. Ported this pass.
- `cockpit/sources/page.tsx` — canonical had the DATA_SOURCE_STACK view; replaced with the
  control-plane surface. The old DATA_SOURCE_STACK content is now superseded; any delta
  (legal-risk overlay) can be added as a new section on the control-plane page.
- All 8 aesthetic R&D docs — absent in canonical. Ported this pass.
- `aesthetic-ia-audit-2026-06-08.md` — was already in canonical. No re-port needed.
