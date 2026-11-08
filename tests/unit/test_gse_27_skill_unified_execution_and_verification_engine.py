"""
Unit and Integration Tests for GSE 27-Skill Unified Execution and Verification Engine.
"""

from __future__ import annotations

import json
from pathlib import Path

from intelligence.funnel.gse_27_skill_unified_execution_and_verification_engine import (
    INVOKED_27_SKILLS_CATALOG,
    execute_pillar1_workflow_and_governance,
    execute_pillar2_security_and_money_path,
    execute_pillar3_dspy_dgx_tao_ethos,
    execute_pillar4_ui_ux_component_and_doop,
    execute_pillar5_perf_deploy_and_verification,
    run_all_27_skills_execution_and_verification,
)


def test_invoked_27_skills_catalog_completeness():
    assert len(INVOKED_27_SKILLS_CATALOG) == 27
    skill_ids = {item["id"] for item in INVOKED_27_SKILLS_CATALOG}
    expected_ids = {
        "verification-loop",
        "verification-before-completion",
        "gse-run",
        "gse-connected-game-workflow",
        "api-security-testing",
        "application-security-testing",
        "ci-security-scanning-with-strix",
        "coding-agent",
        "dspy-gepa",
        "dgx-spark-skills",
        "ethos-write",
        "learned",
        "incident-response-smart-fix",
        "max-leverage",
        "owasp-top-10-testing",
        "synced",
        "tao-setup",
        "frontend-design",
        "frontend-developer",
        "frontend-mobile-development-component-scaffold",
        "application-performance-performance-optimization",
        "impeccable-lite",
        "perf-compare",
        "application-design-center-design-deploy",
        "deployment-pipeline-design",
        "doop-design",
        "ui-ux-designer",
    }
    assert skill_ids == expected_ids


def test_pillar1_workflow_and_governance():
    p1 = execute_pillar1_workflow_and_governance()
    assert p1.passed is True
    assert len(p1.connected_game_stage_receipts) == 6
    assert p1.roster_2026_truth_verified is True
    assert p1.heavy_juice_firewall_verified is True
    assert len(p1.learned_lesson_digest_sha256) == 64
    assert len(p1.incident_smart_fix_phases) == 4


def test_pillar2_security_and_money_path():
    p2 = execute_pillar2_security_and_money_path()
    assert p2.passed is True
    assert p2.critical_or_high_findings == 0
    assert len(p2.owasp_api_top10_checks) == 10
    assert len(p2.owasp_web_top10_checks) == 10
    assert set(p2.ast_four_pillars_status.keys()) == {"SAST", "DAST", "IAST", "SCA"}
    assert p2.strix_sarif_summary["gate_decision"] == "PASS"
    assert all(p2.coding_agent_money_path_invariants.values())
    assert all(p2.max_leverage_free_path_invariants.values())


def test_pillar3_dspy_dgx_tao_ethos():
    p3 = execute_pillar3_dspy_dgx_tao_ethos()
    assert p3.passed is True
    assert p3.dspy_gepa_status["passed_examples"] == 11
    assert p3.dspy_gepa_status["failed_examples"] == 0
    assert p3.dgx_spark_sinkhorn_status["total_vectorized_snaps"] == 1750000
    assert p3.dgx_spark_sinkhorn_status["sinkhorn_converged_below_1e_6"] is True
    assert p3.tao_stealth_skeleton_status["stealth_skeleton_readiness"] == "86.12/100"
    assert p3.ethos_write_public_copy_audit["zero_em_or_en_dashes"] is True
    assert p3.ethos_write_public_copy_audit["zero_internal_math_jargon"] is True
    assert p3.ethos_write_public_copy_audit["uses_strict_100_scale"] is True


def test_pillar4_ui_ux_component_and_doop():
    p4 = execute_pillar4_ui_ux_component_and_doop()
    assert p4.passed is True
    assert p4.surface_mode == "Operate"
    assert p4.web_component_verified is True
    assert p4.mobile_lint_zero_violations is True
    assert all(ratio >= 4.5 for ratio in p4.wcag_contrast_ratios.values())
    assert len(p4.doop_canvas_frames) == 3


def test_pillar5_perf_deploy_and_verification():
    p5 = execute_pillar5_perf_deploy_and_verification()
    assert p5.passed is True
    perf = p5.perf_compare_bootstrap_report
    assert perf["verdict"] == "faster"
    assert perf["ci_97_5_high_pct"] < -1.0
    assert perf["candidate_failure_rate"] == 0.0
    assert p5.adc_terraform_validation["gcs_remote_backend_isolated"] is True
    assert p5.adc_terraform_validation["secret_manager_sensitive_vars_enforced"] is True
    assert len(p5.deployment_pipeline_stages) == 4
    assert len(p5.verification_loop_6_phases) == 6


def test_run_all_27_skills_execution_and_verification_persists_receipt():
    receipt = run_all_27_skills_execution_and_verification(persist_receipt=True)
    assert receipt["total_skills_invoked"] == 27
    assert receipt["all_27_skills_passed"] is True
    assert len(receipt["receipt_sha256"]) == 64

    repo_root = Path(__file__).resolve().parents[2]
    out_file = (
        repo_root
        / "docs"
        / "engine"
        / "research"
        / "2026-11-07"
        / "gse-27-skill-unified-execution-and-verification-receipt.json"
    )
    assert out_file.exists()
    loaded = json.loads(out_file.read_text(encoding="utf-8"))
    assert loaded["receipt_sha256"] == receipt["receipt_sha256"]
