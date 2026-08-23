# LAUNCH GAP REGISTER — single source of truth for "how far from 100%"
Created 2026-08-23 by orchestrator (Operation 100%, Garrett away until tonight).
Row format: id | area | severity | evidence (file:line or failing cmd) | status | branch
Rules: no row without evidence; CLAIM before work; DONE/BLOCKED with hash; kill stalled tasks at 2 attempts.

## SCOREBOARD (updated every checkpoint)
edges built: 8 (yacoe/tpr/separation harnesses, falsifier, cross-market, modelProb spec, RED/GREEN pair, run-real-backtest)
edges killed: 4 legacy (CAND-001, C-28 echo, C-41 retrospective, L-17 totals) · edges survived: 0
gaps found: see rows · gaps fixed: G-1 FIXED@14d53794-partial · suites: vitest green (18/18 wave3), tsc=46 errors OPEN (G-2)

## OPEN ROWS (highest severity first)
G-2 | types/build | BLOCKER | `npx tsc --noEmit` exit=2, 46 errors in packages/prediction-engine (falsify.test 5, separation.test 19, tpr.test 16, yacoe-slice 1, run-real-backtest 5); repo law typecheck=0 | OPEN (repair agent deleg_e5f2b9fd in flight) | hermes/h2-remaining-binds
G-3 | wiring | HIGH | src/index.ts barrel missing falsify/cross-market/backtest exports (falsifier patch failed old_string mismatch; tests import directly so non-blocking but barrel is the product surface) | OPEN | hermes/h2-remaining-binds
G-4 | data | HIGH | TPR + separation harnesses starved: NGS receiving lacks `routes`; pbp_participation not ingested (R34/R36 verdicts) | OPEN - needs nflverse pbp_participation download | hermes/h2-remaining-binds
G-5 | funnel-integrity | HIGH | e-process gate unverified on known-good synthetic edge before trusting real verdicts (Fable steering #3) | OPEN | hermes/h2-remaining-binds
G-6 | funnel-semantics | MED | STARVED vs KILLED distinction: parked binds must retain e-value and keep accumulating (Fable steering #3); current falsify.ts treats minN as hard gate only | OPEN | hermes/h2-remaining-binds
G-7 | audit | MED | zero adversarial audit areas started (settlement, paywall, stripe, auth, cron x29, ingestion freshness, input validation, claim gates, states, perf, types/tests per W2 list) | OPEN - first area starts after G-2 closes | hermes/w2-audit-<area>
G-8 | docs | LOW | handoff/MORNING_BRIEF.md not yet written (final act each session) | OPEN | n/a

## CLOSED/FIXED
G-1 | git-hygiene | was-HIGH | origin had zero cycle work | FIXED@push: h2-remaining-binds@14d53794 + h1-qb-pressures-edge@a538f9b2 both on origin (ls-remote verified 2026-08-23)
