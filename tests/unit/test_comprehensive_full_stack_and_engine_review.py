"""Unit tests for the 4-Phase Comprehensive Full-Stack & Engine Review Auditor.

Covers:
  - Phase 1: Code Quality & Architecture (26-layer registry, 22 proprietary GSE metrics,
    AST compilation safety, Two-Host portability with 0 local path violations)
  - Phase 2: Security & Performance (0 hardcoded secrets, safe AST eval with __builtins__: {},
    paywall redaction invariants, -250/-300+ Heavy-Juice Sportsbook Firewall, >100x vectorized
    NumPy speedup on 22 metrics, <0.35s execution for 21,419 equations)
  - Phase 3: Testing & Documentation (overnight test suites, 458 Mega-Sweep books & 472 provenance
    entries, docs/<bucket>/research/2026-11-07/ filing compliance)
  - Phase 4: Best Practices, Guardrails & CI/CD Readiness (trust-gate.mjs, mobile lint-rules.js,
    connected-workflow-dossier-guard.py, and 10/10 charges of run_charge_regression_suite.py)
  - Edge cases: adversarial AST expressions, synthetic secret detection, synthetic Two-Host
    path violation detection, heavy-juice boundary values (-285 / -300 / -320),
    and machine-readable receipt + P0-P3 markdown report generation.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.audit.comprehensive_full_stack_and_engine_review import (
    DEFAULT_REVIEW_RECEIPT_PATH,
    DEFAULT_REVIEW_REPORT_MD_PATH,
    audit_docs_filing_compliance,
    audit_phase_1_code_quality_and_architecture,
    audit_phase_2_security_and_performance,
    audit_phase_3_testing_and_documentation,
    audit_phase_4_best_practices_and_cicd,
    render_markdown_review_report,
    run_comprehensive_4phase_full_review,
    scan_intelligence_two_host_portability,
    scan_text_for_hardcoded_secrets,
    verify_ast_sandbox_blocks_untrusted_expressions,
)
from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
    evaluate_360_degree_picks_props_parlays_and_sgps,
)
from intelligence.dfs.overnight_9model_fleet_projection_and_200pt_dfs_stress_tester import (
    evaluate_9model_fleet_consensus_on_ticket,
)
from intelligence.equations.equation_executor import (
    compile_formula_spec_ast,
)


def test_phase_1_code_quality_and_architecture_passes() -> None:
    phase1 = audit_phase_1_code_quality_and_architecture()
    assert phase1["status"] == "PASS"

    p1a = phase1["phase_1a_code_quality"]
    assert p1a["status"] == "PASS"
    assert p1a["equations_cataloged"] == 21419
    assert p1a["equations_wired_and_tested"] == 21419
    assert p1a["placeholder_formula_specs"] == 0
    assert p1a["held_below_min_sample_size"] == 1400
    assert p1a["zero_synthetic_tanh_verified"] is True
    assert p1a["families_accounted"] == 279
    assert p1a["proprietary_gse_metrics_count"] == 22
    assert p1a["missing_metric_files"] == []
    assert p1a["proprietary_csv_tables_verified"] == 11
    assert p1a["lobo_4fold_optimized_beats_equal"] is True
    assert p1a["lobo_4fold_optimized_beats_market"] is True
    assert p1a["all_6_metric_families_pass_ablation"] is True
    assert p1a["two_host_portability"]["passed"] is True
    assert p1a["two_host_portability"]["violations_count"] == 0

    p1b = phase1["phase_1b_architecture_and_design"]
    assert p1b["status"] == "PASS"
    assert p1b["gsi_sandbox_isolated"] is True
    assert p1b["mobile_workspace_isolated"] is True
    assert p1b["mega_sweep_module_deduplicated"] is True
    assert p1b["armed_workflows_status"] == "ARMED"
    assert p1b["layers_26_populated"] == 26
    assert p1b["l26_entered_last"] is True
    assert p1b["frontier_dfs_equations_count"] == 30
    assert p1b["dk_200pt_lineups_verified"] is True
    assert p1b["overnight_9model_fleet_registered"] is True


def test_phase_2_security_and_performance_passes() -> None:
    phase2 = audit_phase_2_security_and_performance()
    assert phase2["status"] == "PASS"

    p2a = phase2["phase_2a_security_audit"]
    assert p2a["status"] == "PASS"
    assert p2a["hardcoded_secret_hits_count"] == 0
    assert p2a["ast_sandbox_verification"]["passed"] is True
    assert p2a["ast_sandbox_verification"]["builtins_empty_dict_verified"] is True
    assert all(p2a["paywall_redaction_invariants"].values()) is True
    assert p2a["heavy_juice_and_conjunction_firewall"]["verified"] is True
    assert p2a["heavy_juice_and_conjunction_firewall"]["minus_285_pass_specimen_blocked"] is True
    assert p2a["heavy_juice_and_conjunction_firewall"]["minus_320_heavy_juice_trap_blocked"] is True
    assert p2a["heavy_juice_and_conjunction_firewall"]["solo_source_trap_blocked"] is True
    assert p2a["heavy_juice_and_conjunction_firewall"]["fleet_9_of_9_unanimous_pass_on_minus_300"] is True
    assert p2a["external_supply_chain_quarantine_verified"] is True

    p2b = phase2["phase_2b_performance_engineering"]
    assert p2b["status"] == "PASS"
    assert p2b["proprietary_22_metrics_vectorized_speedup_x"] > 100.0
    assert p2b["exceeds_100x_vectorized_speedup_target"] is True
    assert p2b["equations_21419_batch_elapsed_sec"] < 0.35
    assert p2b["within_0_35s_equation_budget"] is True
    assert p2b["rea_bounded_cache_diagnostics"]["max_batch_cache_entries"] == 64


def test_phase_3_testing_and_documentation_passes() -> None:
    phase3 = audit_phase_3_testing_and_documentation(run_pytest_suites=False)
    assert phase3["status"] == "PASS"

    p3a = phase3["phase_3a_testing_coverage"]
    assert p3a["status"] == "PASS"
    assert p3a["all_suites_present"] is True
    assert p3a["overnight_test_suites_verified"] == 9
    assert p3a["total_test_functions_count"] >= 25
    assert p3a["total_assert_statements_count"] >= 150

    p3b = phase3["phase_3b_documentation_and_filing"]
    assert p3b["status"] == "PASS"
    assert p3b["bucket_root_filing_violations"] == []
    assert p3b["dated_2026_11_07_artifacts_count"] >= 25
    assert p3b["required_corpus_receipts_missing"] == []
    assert p3b["mega_sweep_458_books_and_472_provenance_verified"] is True


def test_phase_4_best_practices_and_cicd_passes() -> None:
    phase4 = audit_phase_4_best_practices_and_cicd(run_all_10_charges=False)
    assert phase4["status"] == "PASS"

    p4a = phase4["phase_4a_surface_and_brand_guardrails"]
    assert p4a["status"] == "PASS"
    assert p4a["trust_gate"]["passed"] is True
    assert p4a["mobile_lint_rules"]["passed"] is True
    assert p4a["mobile_lint_rules"]["violations_count"] == 0
    assert p4a["connected_workflow_dossier_guard"]["passed"] is True

    p4b = phase4["phase_4b_charge_regression_and_cicd"]
    assert p4b["status"] == "PASS"
    assert p4b["passed_count"] == 10
    assert p4b["total_charges"] == 10
    assert p4b["all_10_charges_passed"] is True

    charges_by_num = {c["charge"]: c for c in p4b["charges"]}
    assert charges_by_num[5]["status"] == "PASS"
    assert "test_wave_consumption_proofs.py" in charges_by_num[5]["detail"] or "passed" in charges_by_num[5]["detail"]
    assert charges_by_num[10]["status"] == "PASS"
    assert charges_by_num[10]["consumption_test_file_present"] is True
    assert charges_by_num[10]["ast_and_279_family_tests_passed"] is True
    assert charges_by_num[10]["registry_exact_21419"] is True
    assert charges_by_num[10]["unsquared_copula_tail_count"] == 0
    assert charges_by_num[10]["gsi_sandbox_quarantined"] is True


def test_edge_cases_docs_filing_compliance_violations(tmp_path: Path) -> None:
    docs_root = tmp_path / "docs"
    dated_engine = docs_root / "engine" / "research" / "2026-11-07"
    dated_engine.mkdir(parents=True)
    for i in range(26):
        (dated_engine / f"artifact-{i:02d}-2026-11-07.md").write_text("# Valid\n", encoding="utf-8")

    # 1. Clean canonical layout passes
    clean_audit = audit_docs_filing_compliance(docs_root=docs_root)
    assert clean_audit["passed"] is True
    assert clean_audit["bucket_root_filing_violations"] == []
    assert clean_audit["undated_research_root_violations"] == []
    assert clean_audit["retired_docs_research_violations"] == []
    assert clean_audit["dated_2026_11_07_artifacts_count"] == 26

    # 2. Stray dated file directly under bucket root (docs/engine/2026-11-07-stray.md) flips Phase 3B to FAIL
    stray_bucket_root = docs_root / "engine" / "2026-11-07-stray.md"
    stray_bucket_root.write_text("# Stray bucket root\n", encoding="utf-8")
    p3_fail = audit_phase_3_testing_and_documentation(run_pytest_suites=False, docs_root=docs_root)
    assert p3_fail["phase_3b_documentation_and_filing"]["status"] == "FAIL"
    assert p3_fail["status"] == "FAIL"
    assert "docs/engine/2026-11-07-stray.md" in p3_fail["phase_3b_documentation_and_filing"]["bucket_root_filing_violations"]
    stray_bucket_root.unlink()

    # 3. Un-dated file directly under <bucket>/research/ flips Phase 3B to FAIL
    stray_res_root = docs_root / "engine" / "research" / "2026-11-07-undated.md"
    stray_res_root.write_text("# Stray research root\n", encoding="utf-8")
    audit_undated = audit_docs_filing_compliance(docs_root=docs_root)
    assert audit_undated["passed"] is False
    assert "docs/engine/research/2026-11-07-undated.md" in audit_undated["undated_research_root_violations"]
    stray_res_root.unlink()

    # 4. File inside retired docs/research/2026-11-07/ dumping ground flips Phase 3B to FAIL
    retired_dir = docs_root / "research" / "2026-11-07"
    retired_dir.mkdir(parents=True)
    retired_file = retired_dir / "legacy-dump-2026-11-07.md"
    retired_file.write_text("# Retired dumping ground\n", encoding="utf-8")
    audit_retired = audit_docs_filing_compliance(docs_root=docs_root)
    assert audit_retired["passed"] is False
    assert "docs/research/2026-11-07/legacy-dump-2026-11-07.md" in audit_retired["retired_docs_research_violations"]


def test_edge_cases_two_host_portability_and_secret_scanner(tmp_path: Path) -> None:
    # 1. Synthetic Two-Host path violation inside a temporary directory
    bad_file = tmp_path / "bad_host_path.py"
    forbidden_win_path = "C:\\" + "Users\\" + "Garrett" + "\\Sports\\data.csv"
    bad_file.write_text(f'DATA_PATH = "{forbidden_win_path}"\n', encoding="utf-8")

    scan_bad = scan_intelligence_two_host_portability(intel_dir=tmp_path)
    assert scan_bad["passed"] is False
    assert scan_bad["violations_count"] == 1
    assert scan_bad["violations"][0]["file"] == "bad_host_path.py"

    # Clean file should produce zero violations
    clean_dir = tmp_path / "clean"
    clean_dir.mkdir()
    (clean_dir / "portable.py").write_text(
        "from pathlib import Path\nREPO_ROOT = Path(__file__).resolve().parents[1]\n",
        encoding="utf-8",
    )
    scan_clean = scan_intelligence_two_host_portability(intel_dir=clean_dir)
    assert scan_clean["passed"] is True
    assert scan_clean["violations_count"] == 0

    # 2. Synthetic hardcoded secret detection vs placeholder filtering
    fake_stripe = "sk_live_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4"
    secret_hits = scan_text_for_hardcoded_secrets(
        f'STRIPE_SECRET = "{fake_stripe}"\n',
        rel_path="leaked_client.py",
    )
    assert len(secret_hits) == 1
    assert secret_hits[0]["rule"] == "stripe.secret.live"

    placeholder_stripe = "sk_live_" + "placeholder1234567890123456"
    placeholder_hits = scan_text_for_hardcoded_secrets(
        f'STRIPE_SECRET = "{placeholder_stripe}"\n',
        rel_path="example_config.py",
    )
    assert placeholder_hits == []


def test_edge_cases_ast_security_and_heavy_juice_boundaries() -> None:
    # 1. Adversarial AST expressions must be blocked by compile_formula_spec_ast
    ast_sandbox = verify_ast_sandbox_blocks_untrusted_expressions()
    assert ast_sandbox["passed"] is True
    assert ast_sandbox["adversarial_payloads_tested"] == 13
    assert ast_sandbox["adversarial_payloads_blocked"] == 13
    assert ast_sandbox["escaped_payloads"] == []

    adversarial_inputs = [
        "",
        "   ",
        "__import__('os').system('echo pwned')",
        "eval('1 + 1')",
        "exec('x = 1')",
        "(lambda z: z + 1)(x0)",
        "x0.__class__.__mro__",
        "x0[0]",
        "[i for i in (1, 2, 3)]",
        "1 + * 2",
        "max(1, 2, key=x0.__class__.__mro__[1].__subclasses__())",
        "__builtins__",
        "True",
        "False",
    ]
    for bad_expr in adversarial_inputs:
        with pytest.raises(ValueError):
            compile_formula_spec_ast(bad_expr)

    # Valid mathematical expression with extreme numerical values remains finite
    fn = compile_formula_spec_ast("0.70 * (logit_inv(0.25 * x0 - 0.10 * x1 + 0.05 * x2) - 0.5)")
    val = fn({"x0": 100.0, "x1": -100.0, "x2": 0.0})
    assert -1.0 <= val <= 1.0

    # 2. Heavy-Juice Sportsbook Firewall & 9-Model Fleet boundary checks
    board_360 = evaluate_360_degree_picks_props_parlays_and_sgps(
        context_packet={},
        reasoning_trace={
            "final_reasoning_delta": 0.10,
            "l4_l5_deterministic_audit": {"all_5_tracks_l4_l5_verified": True},
            "market_entered_last_and_smallest": {"entered_last": True, "applied_weight": 0.05},
        },
    )
    assert board_360["pass_discipline_verified"] is True
    assert board_360["heavy_juice_minus_300_trap_blocked"] is True

    # -300 heavy-juice ticket rejected unanimously by all 9 models
    hj_300 = evaluate_9model_fleet_consensus_on_ticket(
        {
            "ticket_id": "TKT-BOUNDARY-MINUS-300",
            "market_category": "FULL_GAME_ML",
            "selection": "HEAVY_JUICE_-300",
            "american_odds": -300,
            "model_prob": 0.79,
            "post_fwl_prob": 0.79,
            "market_devig_prob": 0.75,
            "agreement_sources": ["situational_26_layer", "pbp_10k_trajectory"],
            "independent_edge_decision": "PLAY",
            "cqr_lower_bound": 0.77,
        }
    )
    assert hj_300["consensus_decision"] == "PASS"
    assert hj_300["unanimous_9_of_9"] is True

    # Clean -110 ticket with strong edge & 2+ sources passes 9/9 PLAY
    clean_110 = evaluate_9model_fleet_consensus_on_ticket(
        {
            "ticket_id": "TKT-BOUNDARY-MINUS-110",
            "market_category": "FULL_GAME_SPREAD",
            "selection": "BAL -3.5 (-110)",
            "american_odds": -110,
            "model_prob": 0.585,
            "post_fwl_prob": 0.580,
            "market_devig_prob": 0.500,
            "agreement_sources": ["situational_26_layer", "pbp_10k_trajectory", "conformal_cqr"],
            "independent_edge_decision": "PLAY",
            "cqr_lower_bound": 0.535,
        }
    )
    assert clean_110["consensus_decision"] == "PLAY"
    assert clean_110["unanimous_9_of_9"] is True


def test_full_review_end_to_end_receipt_and_markdown_report(tmp_path: Path) -> None:
    receipt_out = tmp_path / "receipt.json"
    md_out = tmp_path / "report.md"

    payload = run_comprehensive_4phase_full_review(
        write_artifacts=True,
        run_pytest_suites=False,
        run_all_10_charges=False,
        receipt_path=receipt_out,
        markdown_report_path=md_out,
    )
    assert payload["overall_status"] == "PASS"
    assert payload["p0_unresolved_blockers_count"] == 0
    assert payload["p1_unresolved_blockers_count"] == 0
    assert payload["phases_passed_count"] == 4
    assert receipt_out.exists()
    assert md_out.exists()

    loaded_receipt = json.loads(receipt_out.read_text(encoding="utf-8"))
    assert loaded_receipt["overall_status"] == "PASS"
    assert set(loaded_receipt["phases"].keys()) == {
        "phase_1_code_quality_and_architecture",
        "phase_2_security_and_performance",
        "phase_3_testing_and_documentation",
        "phase_4_best_practices_and_cicd",
    }

    md_text = md_out.read_text(encoding="utf-8")
    assert "## Phase 1: Code Quality & Architecture Review" in md_text
    assert "## Prioritized Findings & Remediation Matrix (`P0–P3`)" in md_text
    assert render_markdown_review_report(payload).startswith("# COMPREHENSIVE 4-PHASE")

    # Verify canonical artifacts in docs/engine/research/2026-11-07/ exist and pass
    assert DEFAULT_REVIEW_RECEIPT_PATH.exists(), f"Missing canonical receipt: {DEFAULT_REVIEW_RECEIPT_PATH}"
    assert DEFAULT_REVIEW_REPORT_MD_PATH.exists(), (
        f"Missing canonical markdown report: {DEFAULT_REVIEW_REPORT_MD_PATH}"
    )
    canonical_receipt = json.loads(DEFAULT_REVIEW_RECEIPT_PATH.read_text(encoding="utf-8"))
    assert canonical_receipt["overall_status"] == "PASS"
    assert canonical_receipt["p0_unresolved_blockers_count"] == 0
    assert canonical_receipt["p1_unresolved_blockers_count"] == 0
