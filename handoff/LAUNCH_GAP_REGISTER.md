# LAUNCH GAP REGISTER — single source of truth for "how far from 100%"
Created 2026-08-23 by orchestrator (Operation 100%, Garrett away until tonight).
Row format: id | area | severity | evidence (file:line or failing cmd) | status | branch
Rules: no row without evidence; CLAIM before work; DONE/BLOCKED with hash; kill stalled tasks at 2 attempts.

## SCOREBOARD (updated every checkpoint)
edges built: 9 (prior + yacoe edge candidate)
edges killed: 4 legacy
gaps found: 8 · gaps fixed: G-1 (push), G-2 typecheck now exit=0 (4f7c2a19+948652a3) · suites: falsify 10/10 green, tsc=0 verified

## OPEN ROWS (highest severity first)
G-2 | types/build | BLOCKER->RESIDUAL | was 46 errors; repair agent fixed 45 (commit 4f7c2a19) + orchestrator fixed last one (948652a3); npx tsc --noEmit exit=0 verified firsthand 2026-08-23. Residual: yacoe-backtest-fast-slice.test.ts fails at RUNTIME (ENOENT - looks for data file under packages/prediction-engine/data/ but it lives at repo-root data/); path fix needed, not a type issue | OPEN (runtime path only) | hermes/h2-remaining-binds
G-3 | wiring | HIGH | src/index.ts barrel missing falsify/cross-market/backtest exports (falsifier patch failed old_string mismatch; tests import directly so non-blocking but barrel is the product surface) | OPEN | hermes/h2-remaining-binds
G-4 | data | MED (downgraded) | routes feed exists as per-season CSVs; orchestrator downloaded pbp_participation_2024.csv (49.7MB, schema verified: route=play-level concept + offense_players roster); built pass-play-participation APPROXIMATION join -> data/nflverse/tpr_harness_rows_2024.json (1300/1435 NGS rows matched). Caveat documented in ledger. Remaining: 2021-2023+2025 season files | PARTIAL-FIX (orchestrator 2e94c3fd ledger row; data files untracked by design) | hermes/h2-remaining-binds
G-5 | funnel-integrity | HIGH | e-process gate unverified on known-good synthetic edge before trusting real verdicts (Fable steering #3) | DONE @ f5bd9865 (known-good/known-bad gate validated) | hermes/h2-remaining-binds
G-6 | funnel-semantics | MED | STARVED vs KILLED distinction: parked binds must retain e-value and keep accumulating (Fable steering #3); current falsify.ts treats minN as hard gate only | DONE @ f5bd9865 (PARKED semantics + e-value preserved in detail) | hermes/h2-remaining-binds
G-7 | audit | MED | zero adversarial audit areas started (settlement, paywall, stripe, auth, cron x29, ingestion freshness, input validation, claim gates, states, perf, types/tests per W2 list) | OPEN - first area starts after G-2 closes | hermes/w2-audit-<area>
G-8 | docs | LOW | handoff/MORNING_BRIEF.md not yet written (final act each session) | OPEN | n/a

## CLOSED/FIXED
G-1 | git-hygiene | was-HIGH | origin had zero cycle work | FIXED@push: h2-remaining-binds@14d53794 + h1-qb-pressures-edge@a538f9b2 both on origin (ls-remote verified 2026-08-23)
