# GATE INVENTORY 2026-10-11 (DIAGNOSTIC — nothing promoted)

observed_at 2026-10-11T16:05:49Z. Source: `docs/research/2026-10-09/rating-atlas/minis/GSE_ENGINE_GATE_INVENTORY.md` (f77ac2f) claims 14 live / 5 partial / 11 documented-only.

Definitions: LIVE = runnable code with a call site on a real path; PARTIAL = function exists but uncalled/untested/partly wrapped; DOCUMENTED-ONLY = markdown claim, no function.

| # | Gate | Source said | Before | Now | Impl | Call sites | Test |
|---|---|---|---|---|---|---|---|
| 1 | FreshnessGate | LIVE | LIVE | LIVE | dfs/freshnessgate_wiring.py:read_fresh; minis/freshness_gate.py:load_stamped/freshness_ok | read_fresh: 16 dfs .py files (rvc_grade.py, b7_cpoe_rvc.py, ou_live_wp.py, prop_resid_sigma.py, ...); load_stamped: 22 files incl. minis/live_board.py | dfs/freshnessgate_wiring.py:self_test (5/5 PASS this pass); doctrine_selfcheck.py rule 1 |
| 2 | Injury Pull Gate | LIVE | PARTIAL | LIVE | intelligence/providers/injury_gate.py:require_injury_published | BEFORE: none on the branch. NOW: dfs/nfl_prop_resid_sigma_2026-10-11/prop_resid_sigma.py:pull_wk5_injuries (called by main before the live nflverse injuries pull) | dfs/nfl_prop_resid_sigma_2026-10-11/test_injury_gate_callsite.py (2/2 PASS) |
| 3 | CollegeGuard | LIVE | LIVE | LIVE | minis/live_board.py:_college_guard_check (+ minis/doctrine.py:CollegeGuard) | live_board.live_board(); minis/api/live_board.py; dfs/build_the_floor.py; cfb_engine.py; cfb_model_v1.py | doctrine_selfcheck.py rule 3 (PASS) |
| 4 | Signal Spine | LIVE | LIVE | LIVE | apps/web/lib/signals/spine.ts | 8 importers (fantasy/props.ts, dfs-solve.ts, trade.ts, ...) | apps/web/lib/signals/spine.test.ts (not run: no node deps on box) |
| 5 | Contest-Shape Guard (adviseMode) | LIVE | LIVE | LIVE | apps/web/lib/fantasy/dfs-signals.ts:adviseMode | apps/web/lib/fantasy/dfs-solve.ts:110 | apps/web/lib/fantasy/dfs-signals.test.ts (not run) |
| 6 | Per-Market Calibration Gate | LIVE | LIVE | LIVE | apps/web/lib/ops/per-market-gate.ts | apps/web/lib/ops/compute-live-calibration-metrics.ts -> app/api/cron/calibration-metrics/route.ts | apps/web/__tests__/per-market-gate.test.ts (not run) |
| 7 | Prediction-Engine Acceptance Gates (179 modules) | DOCUMENTED-NOT-WIRED | DOCUMENTED-ONLY | PARTIAL | minis/gates/prediction_engine/*.py (harness + eval code for modules 9-12, 37-40, 49-60 = 20 of 179 at 66b0c4a; landed upstream 155ac67..66b0c4a during this pass; parallel lane still adding); spec docs/gates/GATE-SPECS.md | own __main__ only; no importer | none (no test_ functions in minis/gates/prediction_engine/) |
| 8 | Model Promotion Gate (Champion/Challenger) | PARTIAL | PARTIAL | PARTIAL | packages/prediction-engine/src/promotion/evaluate.ts:evaluatePromotion; packages/ingestion-pipeline/src/publish-guards-bridge.ts:evalPromotion; minis/doctrine.py:promotion_check | none outside index re-exports (prediction-engine/src/index.ts, ingestion-pipeline/src/index.ts) and doctrine_selfcheck.py | packages/prediction-engine/src/promotion/__tests__/ (9 test files; not run); publish-guards-bridge.test.ts; doctrine_selfcheck rule 9 (PASS) |
| 9 | Selective Abstention Gate | LIVE (in publish-guards-bridge) | PARTIAL | LIVE | TS: packages/prediction-engine/src/certificate/selective-abstention.ts (chowStyleShouldAbstain, npStyleLowerEndpointFire, sampleFloorAbstain) + stratum-coverage.ts:refuseIfEmptyStratum, wrapped by publish-guards-bridge.ts evalAbstention/evalChowAbstain/evalStratumGate/evalFloorStrata. Python board default: minis/live_board.py:_rvc_abstain_default using minis/doctrine.py:FeatureRegistry | TS: none outside index re-exports. NOW: minis/live_board.py:live_board() returns _rvc_abstain_default(board, warehouse.get("rvc_clearances")) | minis/test_live_board_abstain.py (3/3 PASS); TS certificate-modules.test.ts / publish-guards-bridge.test.ts (not run) |
| 10 | Proper Scoring Gate | LIVE | PARTIAL | PARTIAL | packages/ingestion-pipeline/src/publish-guards-bridge.ts:evalReliability | none outside ingestion-pipeline/src/index.ts re-export | packages/ingestion-pipeline/src/publish-guards-bridge.test.ts (not run) |
| 11 | JEV 10K Correlated Monte Carlo | LIVE | LIVE | LIVE | apps/web/lib/fantasy/dfs-correlation.ts | apps/web/lib/fantasy/dfs-solve.ts, dfs-optimizer-edge.ts | apps/web/lib/fantasy/dfs-correlation.test.ts (not run) |
| 12 | JEV 5-Gate Mathematical Sieve | DOCUMENTED-NOT-WIRED | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none on branch (Windows-only universal_jev_signal_scanner.py) | none | none |
| 13 | JEV Epistemic Arbitration Oracle | DOCUMENTED-NOT-WIRED | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none on branch (Windows-only jev ask) | none | none |
| 14 | GSE Engine Fail-Closed Mandate | DOCUMENTED-NOT-WIRED | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none | none | none |
| 15 | DFS Lineup Validation | LIVE | PARTIAL | PARTIAL | apps/web/lib/fantasy/dfs-lineup-validation.ts:validateLineup/validateOptimizerInput | only dfs-lineup-repair.ts, which itself has no non-test importer; validateLineup has no non-test caller | apps/web/lib/fantasy/dfs-lineup-validation.test.ts; __tests__/dfs-lineup-repair.test.ts (not run) |
| 16 | Board Gate Rows | LIVE | LIVE | LIVE | apps/web/lib/board/gate-rows.ts + gate-consumer.ts | app/board/gate/page.tsx; lib/board/load-gate-slate.ts; gate-page-mode.ts; gate-certificates.ts | apps/web/__tests__/board-gate-rows.test.ts, board-gate-consumer.test.ts (not run) |
| 17 | Live Board Honesty Labels | LIVE | LIVE | LIVE | minis/live_board.py:live_board | minis/api/api.py:85 (calls api/live_board.py copy) | BEFORE: none. NOW: minis/test_live_board_abstain.py asserts baseline/diagnostic overlay labels (PASS) |
| 18 | Kill Ledger | LIVE | LIVE | LIVE | dfs/freshnessgate_wiring.py:_ledger_append; minis/doctrine.py:KillLedger | read_fresh (every refusal); KillLedger: registry_bootstrap.py, ppd_pooled_test.py, graph_vs_close_stamp.py, ppd_v2_carryin.py, cfb_ppa_model.py | doctrine_selfcheck.py rule 16 (PASS); freshness self_test (PASS) |
| 19 | GSE Score Honesty | LIVE | LIVE | LIVE | apps/web/lib/fantasy/gse-score.ts | components/fantasy/trade-analyzer.tsx, draft-assistant.tsx, bestball-board.tsx (+1) | apps/web/lib/fantasy/gse-score.test.ts (not run) |
| 20 | Banned Language Filter | LIVE | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none — only the live_board.py docstring line 8 ("NEVER outputs pick/bet/edge/play") | none | none |
| 21 | Age Gate | DOCUMENTED-NOT-WIRED (21-30 bucket) | LIVE | LIVE | apps/web/lib/auth/age-gate.ts | app/api/subscriptions/checkout/route.ts | apps/web/lib/auth/age-gate.test.ts (not run) |
| 22 | CSRF Origin Guard | DOCUMENTED-NOT-WIRED (21-30 bucket) | LIVE | LIVE | apps/web/lib/auth/csrf-origin-guard.ts | app/api/mobile/v1/devices, push/subscribe, push/unsubscribe routes | apps/web/__tests__/csrf-origin-guard.test.ts (not run) |
| 23 | In-Play Guard | DOCUMENTED-NOT-WIRED (21-30 bucket) | LIVE | LIVE | packages/ingestion-pipeline/src/in-play-guard.ts | process-sport.ts, generate-signal-slate.ts | packages/ingestion-pipeline/src/__tests__/in-play-guard.test.ts (not run) |
| 24 | Durable Write Guard | DOCUMENTED-NOT-WIRED (21-30 bucket) | LIVE | LIVE | packages/db/src/durable-write-guard.ts:requireDurableWriteStore | app/api/subscriptions/checkout, webhooks/stripe, lib/billing/reconcile-entitlements.ts, checkout-attempt.ts | apps/web/__tests__/repair-checkout-attempts-cron-route.test.ts (references; not run) |
| 25 | Numeric Guard | DOCUMENTED-NOT-WIRED (21-30 bucket) | LIVE | LIVE | apps/web/lib/claude-api/numeric-guard.ts | 9 importers (lib/studio/claude.ts, build-assets.ts, calibration-training/claude.ts, ...) | apps/web/__tests__/numeric-guard.test.ts, numeric-guard-invariants.test.ts (not run) |
| 26 | Trust Gate | DOCUMENTED-NOT-WIRED (21-30 bucket) | LIVE | LIVE | scripts/guardrails/trust-gate.mjs | package.json "guard:trust"; .github/workflows/ci.yml:183 | apps/web/__tests__/guardrails.test.ts (references; not run) |
| 27 | Evidence Guard | DOCUMENTED-NOT-WIRED (21-30 bucket) | PARTIAL | PARTIAL | intelligence/trust/evidence_guard.py:evaluate/publish | none outside intelligence/trust/__init__.py | intelligence/trust/tests/test_trust.py (40/40 PASS this pass) |
| 28 | Calibration Gate Scale | DOCUMENTED-NOT-WIRED (21-30 bucket) | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none (docs/ops/CALIBRATION_GATE_SCALE_2026-09-06.md) | none | none |
| 29 | Release Gate Plan | DOCUMENTED-NOT-WIRED (21-30 bucket) | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none (docs/gse/release-gate-plan.md) | none | none |
| 30 | Independence Gates | DOCUMENTED-NOT-WIRED (21-30 bucket) | DOCUMENTED-ONLY | DOCUMENTED-ONLY | none (docs/ops/INDEPENDENCE_GATES.md) | none | none |
| 31 | HonestyGate (rule 19, frozen walk-forward CRPS vs close) | not in source list | LIVE | LIVE | minis/doctrine.py:HonestyGate.evaluate | dfs/b7_cpoe_rvc/b7_cpoe_rvc.py, dfs/expected_metric_conditional_rvc/em_conditional_rvc.py, minis/graph_vs_close_stamp.py, ppd_pooled_test.py (+CFB files) | doctrine_selfcheck.py rule 19 (PASS) |
| 32 | FeatureRegistry (diagnostic stays diagnostic; rules 4/5/8/12-14) | not in source list | LIVE | LIVE | minis/doctrine.py:FeatureRegistry.promote/margin_head_inputs | registry_bootstrap.py (CFB), ppd_pooled_test.py, cfb_context.py; NOW also minis/live_board.py:_rvc_abstain_default | doctrine_selfcheck.py rules 4/5/8/12-14 (PASS); test_live_board_abstain.py (PASS) |
| 33 | Warehouse point-in-time (rule 1) | not in source list | LIVE | LIVE | minis/doctrine.py:Warehouse | minis/snapshot_pump.py, pump/snapshot_pump.py, freshness.py, cfb_engine.py | doctrine_selfcheck.py rule 1 (PASS) |
| 34 | Close-only fallback (freshness refusal surface) | not in source list | LIVE | LIVE | dfs/freshnessgate_wiring.py:close_only_fallback | dfs/rvc_grade.py, rvc_grading_path.py, rvc_edge5_grade.py | freshnessgate_wiring.self_test (PASS) |
| 35 | Anchor (rules 2/11: mu = Pinnacle close until PROMOTED) | not in source list | PARTIAL | PARTIAL | minis/doctrine.py:Anchor.propose_mu/propose_sigma | doctrine_selfcheck.py only | doctrine_selfcheck.py rules 2/11/18 (PASS) |
| 36 | FounderGate (rule 15) | not in source list | PARTIAL | PARTIAL | minis/doctrine.py:FounderGate.can_flip_production | doctrine_selfcheck.py only | doctrine_selfcheck.py rule 15 (PASS) |
| 37 | CLVLedger + promotion_check (rule 9) | not in source list | PARTIAL | PARTIAL | minis/doctrine.py:CLVLedger, promotion_check | doctrine_selfcheck.py only | doctrine_selfcheck.py rule 9 (PASS) |
| 38 | ADPGuard (rule 10) | not in source list | PARTIAL | PARTIAL | minis/doctrine.py:ADPGuard | doctrine_selfcheck.py only (registry_bootstrap.py names it in a string) | doctrine_selfcheck.py rule 10 (PASS) |
| 39 | CalibrationLedger (rule 6 pooling) | not in source list | PARTIAL | PARTIAL | minis/doctrine.py:CalibrationLedger | doctrine_selfcheck.py only (registry_bootstrap.py names it in a string) | doctrine_selfcheck.py rule 6 (PASS) |
| 40 | LatencyTracker (rules 7/17) | not in source list | PARTIAL | PARTIAL | minis/doctrine.py:LatencyTracker | minis/freshness.py (module with no importer) | doctrine_selfcheck.py rules 7/17 (PASS) |
| 41 | gate_enforce audit (GATE_AUDIT.json) | not in source list | PARTIAL | PARTIAL | dfs/gate_enforce.py:gated_audit/enforce | its own __main__ only; judges freshness by file mtime, imports read_fresh but does not call it | none |
| 42 | Injury gate wiring registration (GATE_AUDIT #12) | not in source list | PARTIAL | PARTIAL | dfs/injury_gate_wiring.py (module-level script) | none; mtime-based sha registration, no read_fresh | none |
| 43 | Held-out check | not in source list | PARTIAL | PARTIAL | intelligence/gates/heldout_check.py:check | none (no CI workflow or importer) | intelligence/gates/test_heldout_check.py (PASS, gates/ 9/9) |
| 44 | Manifest check | not in source list | PARTIAL | PARTIAL | intelligence/gates/manifest_check.py:missing_manifest | none (own __main__) | none |
| 45 | Claim matrix | not in source list | PARTIAL | PARTIAL | intelligence/gates/claim_matrix.py:check | none (own __main__) | intelligence/gates/test_claim_matrix.py (PASS, gates/ 9/9) |
| 46 | Honest refusal (DATA-GAP / checklist UNCHECKED at L3+) | not in source list | LIVE | LIVE | intelligence/integration/api.py:analyze (DataGapError -> DATA-GAP); intelligence/reasoning/checklist.py | intelligence/reasoning_engine/run_game.py <- emit_trace.py | intelligence/tests/e2e/test_t1_real_e2e.py (not run this pass) |
| 47 | NNTD selective-classification abstention (SYS-25) | not in source list | PARTIAL | PARTIAL | intelligence/trust/abstention.py:abstain_decision | none outside trust/__init__.py | intelligence/trust/tests/test_trust.py (PASS) |
| 48 | Leak-wall fail-closed (S3/SYS-28) | not in source list | PARTIAL | PARTIAL | intelligence/trust/leakwall.py | none outside trust/__init__.py | intelligence/trust/tests/test_trust.py (PASS) |
| 49 | Proof-ledger Wilson floor | not in source list | PARTIAL | PARTIAL | intelligence/trust/proofledger.py | intelligence/trust/evidence_guard.py (itself uncalled) | intelligence/trust/tests/test_trust.py (PASS) |

## Totals
- Source 30 recount before pass: {'LIVE': 16, 'PARTIAL': 6, 'DOCUMENTED-ONLY': 8} (claimed 14/5/11)
- Source 30 after pass: {'LIVE': 18, 'PARTIAL': 5, 'DOCUMENTED-ONLY': 7}
- All 49 before: {'LIVE': 21, 'PARTIAL': 20, 'DOCUMENTED-ONLY': 8}; after: {'LIVE': 23, 'PARTIAL': 19, 'DOCUMENTED-ONLY': 7}

## Differences vs 14/5/11
- Injury Pull Gate: LIVE claimed, PARTIAL found (zero call sites) -> wired this pass
- Selective Abstention: LIVE claimed, PARTIAL found (TS functions only re-exported) -> Python live_board default wired this pass; TS remains uncalled
- Proper Scoring Gate: LIVE claimed, PARTIAL found (evalReliability uncalled)
- DFS Lineup Validation: LIVE claimed, PARTIAL found (validateLineup has no non-test caller)
- Banned Language Filter: LIVE claimed, DOCUMENTED-ONLY found (docstring only)
- Prediction-engine acceptance gates (#7): DOCUMENTED claimed and at f508934; PARTIAL at tip 66b0c4a (upstream harness for 20/179 modules at 66b0c4a, untested)
- Items 21-26: DOCUMENTED claimed, LIVE found (code + call sites); item 27 Evidence Guard: PARTIAL (tested, uncalled)

Source inconsistency: Its own Summary lists 15 names under LIVE(14), 1 name under PARTIAL(5), and 4 names + "21-30" (=14) under DOCUMENTED-NOT-WIRED(11); 15+1+14=30. Items 21-27 are code with call sites, not documentation.

## Documented-only reopens
- #12 JEV 5-Gate Mathematical Sieve: `frontier/sports/universal_jev_signal_scanner.py (copy from Windows C:/Users/Garrett/onejev/frontier/sports/)` :: `five_gate_sieve(signal)` :: test frontier/sports/test_universal_jev_signal_scanner.py: a synthetic signal failing gate 1 (CQR width) is excluded
- #13 JEV Epistemic Arbitration Oracle: `JEV decisions API reachable from the box (Windows jev ask) or a committed client` :: `jev_ask(signal) -> verdict` :: test test asserting TRAP_OR_PASS/ABSTAIN_HIGH_VARIANCE verdicts block a row (recorded response fixture)
- #14 GSE Engine Fail-Closed Mandate: `minis/live_board.py (or the DIAGNOSTIC_BOARD producer, not on branch)` :: `_fail_closed(board): refuse any row lacking an engine verdict id` :: test minis/test_live_board_fail_closed.py: row without verdict -> board refuses row
- #20 Banned Language Filter: `minis/live_board.py` :: `_banned_language_check(board): raise on pick/bet/edge/play in any rendered string` :: test minis/test_live_board_banned_language.py: a row with "edge" in render text raises
- #28 Calibration Gate Scale: `apps/web/lib/ops/per-market-gate.ts (already the code home for calibration floors)` :: `function implementing the scale tiers in docs/ops/CALIBRATION_GATE_SCALE_2026-09-06.md` :: test apps/web/__tests__/per-market-gate.test.ts case per tier
- #29 Release Gate Plan: `scripts/guardrails/release-gate.mjs (new) + .github/workflows/ci.yml job` :: `release gate per docs/gse/release-gate-plan.md` :: test apps/web/__tests__/guardrails.test.ts case that a failing release criterion exits non-zero
- #30 Independence Gates: `scripts/guardrails/independence-gate.mjs (new)` :: `independence checks per docs/ops/INDEPENDENCE_GATES.md` :: test apps/web/__tests__/guardrails.test.ts case

## Tests run this pass
- minis/doctrine_selfcheck.py: 19/19 PASS
- dfs/freshnessgate_wiring.py:self_test (ledger redirected to /tmp): 5/5 PASS
- intelligence/trust/tests/test_trust.py: 40 passed
- intelligence/gates/: 9 passed
- minis/test_live_board_abstain.py: 3 passed
- dfs/nfl_prop_resid_sigma_2026-10-11/test_injury_gate_callsite.py: 2 passed
- TypeScript (vitest): NOT RUN — no node_modules on the box; listed test files exist but results are unverified here

## Ledger rows (dfs/kill_ledger_freshness.jsonl, appended via freshnessgate_wiring._ledger_append)
- LR-20261011-GINV-01-ABSTAIN-WIRED
- LR-20261011-GINV-02-INJURY-GATE-WIRED
- LR-20261011-GINV-03-MODEL-PROMOTION
- LR-20261011-GINV-04-TS-ABSTENTION-SCORING
- LR-20261011-GINV-05-DFS-LINEUP-VALIDATION
- LR-20261011-GINV-06-EVIDENCE-GUARD
- LR-20261011-GINV-07-GATE-ENFORCE-MTIME
- LR-20261011-GINV-08-DOCTRINE-PARTIALS
- LR-20261011-GINV-09-INTELLIGENCE-GATES
- LR-20261011-GINV-11-ACCEPTANCE-HARNESS
- LR-20261011-GINV-10-TRUST-PARTIALS
- LR-20261011-GINV-D12
- LR-20261011-GINV-D13
- LR-20261011-GINV-D14
- LR-20261011-GINV-D20
- LR-20261011-GINV-D28
- LR-20261011-GINV-D29
- LR-20261011-GINV-D30

Scope: Source 30 re-verified + every gate in minis/doctrine.py, dfs freshness/gate files, intelligence/gates, intelligence/trust, intelligence honest-refusal. NOT enumerated: ~100 apps/web product/security guard/gate test files (auth, billing, entitlement, blog, etc.) outside the engine scope of the source list.
