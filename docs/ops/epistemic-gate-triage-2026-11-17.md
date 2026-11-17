# Epistemic Calibration & Sanity Gate — failure triage (2026-11-17)

Standing context: the scheduled **Epistemic Calibration & Sanity Gate**
(`.github/workflows/epistemic_gate.yml`) has been red on `main` continuously
since ~2026-11-07. It has two steps:

1. `python tests/verify_out_of_sample_calibration.py --enforce-gate` — **passes**.
   This is the actual walk-forward calibration gate.
2. `python -m pytest tests -q --ignore=… -k "…"` — the catch-all that runs the
   whole `tests/` tree (1152 collected). Latest `main` run (`c9e170fb4`):
   **66 failed, 1086 passed, 27 skipped**.

The residual red is not one defect; it is a mixed bag of four causes. Classified
from the `44055530204` run log:

## A. Host/container-install-bound (~23) — unrunnable on a portable runner
These assert the on-disk layout of a specific Linux agent container
(`/opt/antigravity`, `/shared/user/.gemini`, `/home/runner/.agents/skills`) or a
compiled native artifact. Every assertion is a guaranteed `FileNotFoundError`
on a stock GitHub runner.

- `tests/e2e/test_tier5_adversarial_plugins_and_guardrails_challenger.py` — antigravity
  plugin launchers, skills CLI/validator, MongoDB secret adapter (14). **Fixed this cycle**
  via `@unittest.skipUnless(<host present>)` on the three container-bound classes; the
  trust-gate class in the same file always runs.
- `tests/unit/test_all_installed_skills_execution.py` (`assert 0 >= 758`) — asserts a
  locally-installed skills tree that no longer exists.
- `tests/test_twelve_repo_frontier_integration.py` + `tests/test_thirty_three_repo_frontier_integration.py`
  — Cloudflare security-audit validators at `/home/runner/.agents/skills/…`.
- `tests/unit/test_m6_symbolic_21419_equations_execution.py` — `/shared/user/.gemini/secrets`.
- `tests/test_physics_biophysics_and_oncology_21_repo_engine.py` — hard-codes `C:\`.
- `tests/test_red_team_7vector_forensic_audit.py::test_vector3…` and
  `tests/test_dfs_5000_page_corpus_and_7_equations.py::test_c11_cpp20…` — require the
  compiled `libgse_native_kernels.dll`.

## B. Roster/injury-freshness-gated (~8) — fails by design
`PreflightRosterGateError: roster config as_of 2026-11-07 is N days old (max 5)`.
The gate correctly refuses a stale roster config; the committed `as_of` is frozen at
2026-11-07, so these tests fail whenever "now" is >5 days later. Not a code defect — a
data-freshness decision.
- `tests/test_week9_dual_slate_dfs.py` (5), `tests/e2e/test_tier5_adversarial_equations_and_csv_challenger.py`
  and the M8 ledger test, `tests/test_red_team_7vector_forensic_audit.py::test_vector2_content_pack…`.

## C. Stale value pins / artifact drift (~19)
Hard-coded ledger records, receipt sha256s, and counts that no longer match the
single-source ledger / regenerated artifacts (the maintainer's C10–C14 roll-forward
pattern applies).
- `tests/test_week9_forensic_autopsy_fixes.py` (`'47-19-1 (+24.92u)'`, `2 >= 150`),
  `tests/unit/test_full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py`
  (`+24.92u` vs `+26.50u`), `tests/unit/test_run_0730_cst_fresh_pull_and_email_dispatch.py`
  (sha `219 == 225`, `'10/10 PASS'`), `tests/unit/test_deep_read_books_pdfs_21419_equations.py`
  (receipt sha), `tests/unit/test_deep_read_grok_muse_motif_comp_intel.py` (missing
  `data/corpus/research_records.jsonl`), `tests/test_red_team_7vector_forensic_audit.py`
  (`28 == 14`, `KeyError 'Malik Davis'`, EQ-DFS-14 Tweedie), `tests/unit/test_packt_…`
  (`1.048 > 1.5`), `tests/unit/test_bojieli_…`, `tests/unit/test_comprehensive_full_stack_and_engine_review.py`,
  `tests/unit/test_gse_27_skill_unified_execution_and_verification_engine.py`,
  `tests/test_week10_360_dfs_and_stage0_gates.py`, `tests/test_dfs_5000_page_corpus_and_7_equations.py::test_10…`.

## D. Real API drift (~2)
- `tests/unit/test_spatial_micro_metrics_pbp_and_dfs_bridge.py` — two tests call
  `NFLMultiHorizonTrendsAndPreGameVisionEngine()` with no args; the class no longer
  accepts that. Genuine constructor drift to reconcile.

## E. Bazel config (~2)
- `tests/python/test_bazel_monorepo_build_optimization.py` — asserts `aspect_rules_js`
  in `WORKSPACE.bazel` and a `monorepo_governance_configs` target in `BUILD.bazel`.

## Plan
Land A first (skip the host-bound suites where the host is absent — never delete or
weaken the assertions), then D and E (small, real), then B (decide roster-config
freshness policy) and C (regenerate the drifted artifacts from the single-source ledger).
