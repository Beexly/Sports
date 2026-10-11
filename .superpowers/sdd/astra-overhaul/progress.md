# SDD ledger — plan: docs/engine/research/2026-10-11/ASTRA_ARCHITECTURAL_MASTER_PLAN.md

## Pre-flight Plan Scan
| Pair / Task | What one produces vs consumes | Finding / Ruling |
|---|---|---|
| Task 1.1 vs Task 5.1 | Task 1.1 removes proof-crystal asset; Task 5.1 tests brand and visual regression | Clean: decision-hero-states.test.tsx asserts absence of proof-crystal; asset-manifest.ts dropped webp reference cleanly. |
| Task 1.2 vs Nav / Build | Task 1.2 removes /academy and /fantasy/studio | Clean: add 301 redirects in next.config.mjs to /methodology and /fantasy. |
| Task 2.1 vs Route Equivalence | /picks vs /board consolidation | Ruling: board-picks-route-equivalence.test.ts asserts both routes exist as distinct canonicals with clear differentiation. Preserve independent pages while unifying design language and cross-links. |
| Task 3.1 vs Task 4.1 | Pricing feature-gates vs DFS optimizer tiers | Clean: align feature-gates so Elite owns 150-max and correlated matrix while Pro owns standard lineup builder. |

## Progress
- Pre-flight scan complete.
- Task 1.1: complete (purged proof-crystal.webp, updated asset-manifest.ts, decision-hero-states.test.tsx passed 4/4; commit `7b2b82674`).
- Brand Safety & Guardrails: complete (fixed Lock and competitor prose in AGENTS.md, npm run lint:brand passed 4,661/4,661 tests across 19 suites, guard:trust passed 3,654 files, guard:secrets passed 14,901 files).
- Task 4.1: complete (dfs-correlation.test.ts passed 6/6, dfs-optimizer.test.ts passed 33/33, pricing-value-architecture.test.ts passed 22/22).
- Neon DB Configuration: complete (synced fresh credentials across all workspace roots and apps/web/.env.local, verified 3,861 games, 3,555 settled picks).
- Standardized DFS Pipeline: complete (executed across 685 DK entities, 4 Pareto archetypes solved via MILP, JEV oracle arbitration recorded in dfs/KICKOFF_COMMAND_DOSSIER.json).
- Code Review Feedback Addressed: complete (restored cash_mode affordable fallback in dfs_optimizer_suite.py, removed Drake London from phantom blacklist in standard_gse_pipeline.py; commit `7a7071051`).
- Teamwork Multi-Agent Fleet: running (conversation `e0b6b77e-ebc1-4793-9295-a102b7e2415d`, orchestrator `54bf42d6-0187-42fc-84af-ba49e183495d`).
