"""Unit tests for `/rea-tool-design` and `/rea-analysis-optimization`."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from intelligence.equations.equation_executor import (
    MAX_BATCH_CACHE_ENTRIES,
    execute_all_279_equation_families,
    execute_layer_equation_family_batch,
    get_equation_executor_cache_diagnostics,
    invalidate_equation_executor_caches,
)
from intelligence.rea.rea_tool_design_and_analysis_optimizer import (
    REA_RECEIPT_JSON_PATH,
    REA_REPORT_MD_PATH,
    ReaInvestigationSession,
    execute_rea_tool_design_and_optimization_suite,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_rea_tool_design_session_evidence_views_and_unknown_concurrency() -> None:
    session = ReaInvestigationSession()
    info = session.inspect_session()
    assert info["session_status"] == "active"
    assert info["analysis_provider_binding"]["provider_id"] == "gse-mcp-equations-ast-v1"
    expanded = info["tool_availability"]["expanded_tools"]
    assert len(expanded) == 8
    by_name = {t["tool_name"]: t for t in expanded}
    assert by_name["inspect_analysis_view"]["effects"] == {
        "read_only": True,
        "retains_evidence": True,
        "mutates_session_registry": False,
    }
    assert by_name["record_unknown"]["effects"] == {
        "read_only": False,
        "retains_evidence": False,
        "mutates_session_registry": True,
    }

    fv = {"altitude_ft": 5280.0, "wind_mph": 12.0575, "total_line": 44.5, "spread_home": -2.5}
    ev_summary = session.inspect_equation_families_evidence(fv, detail="summary", limit=6)
    assert ev_summary["detail"] == "summary"
    assert ev_summary["retention"] == "complete-record"
    assert ev_summary["source_complete"] is True
    assert ev_summary["page_exhausted"] is False
    assert len(ev_summary["normalized_result"]["family_receipts"]) == 6

    # Transport resource_constraint recovery without repeating producer
    err = session.inspect_equation_families_evidence(fv, detail="full", max_transport_bytes=1024)
    assert err["status"] == "error"
    assert err["error_code"] == "resource_constraint"
    assert err["details"]["resource"] == "transport"
    parent_id = err["details"]["parent_evidence_id"]
    count_before = session.producer_invocation_count

    view_sum = session.inspect_analysis_view(parent_id, {"kind": "summary"})
    assert view_sum["parent_evidence_id"] == parent_id
    assert len(view_sum["normalized_result"]["sample_receipts"]) == 5

    # Inventory view: omit logical_paths pages all; [] selects none; specific family selects match
    view_all = session.inspect_analysis_view(parent_id, {"kind": "inventory", "offset": 0, "limit": 12})
    assert len(view_all["normalized_result"]["occurrences"]) == 12
    view_empty = session.inspect_analysis_view(parent_id, {"kind": "inventory", "logical_paths": []})
    assert len(view_empty["normalized_result"]["occurrences"]) == 0
    assert view_empty["normalized_result"]["absence_established"] is True
    assert session.producer_invocation_count == count_before

    # Partial source with 0 matches must NOT establish absence
    ev_partial = session.inspect_equation_families_evidence(
        fv, detail="summary", limit=4, source_complete_override=False
    )
    view_partial_miss = session.inspect_analysis_view(
        ev_partial["evidence_id"],
        {"kind": "inventory", "logical_paths": ["FAM_NON_EXISTENT_999"]},
    )
    assert view_partial_miss["source_complete"] is False
    assert view_partial_miss["normalized_result"]["absence_established"] is False

    # Unknown registry optimistic concurrency & observed Evidence requirement
    unk = session.record_unknown(
        question="Verify altitude scaling in layer 6",
        required_authority_or_environment="Compiled AST equation executor",
    )
    assert unk["revision"] == 1
    with pytest.raises(RuntimeError, match="stale_revision"):
        session.update_unknown(unk["unknown_id"], expected_revision=2, status="partially_answered")
    with pytest.raises(ValueError, match="unverified_resolution"):
        session.update_unknown(unk["unknown_id"], expected_revision=1, status="verified_resolved")

    updated = session.update_unknown(
        unk["unknown_id"],
        expected_revision=1,
        status="verified_resolved",
        supporting_evidence_ids=[ev_summary["evidence_id"]],
        resolution_summary="Confirmed via retained Evidence.",
    )
    assert updated["revision"] == 2
    assert updated["status"] == "verified_resolved"


def test_rea_analysis_optimization_small_empty_and_invalidation_boundaries(tmp_path: Path) -> None:
    # 1. Empty registry boundary case
    empty_reg = tmp_path / "empty_registry.jsonl"
    empty_reg.write_text("", encoding="utf-8")
    empty_layer = execute_layer_equation_family_batch(1, {"x": 1.0}, registry_path=empty_reg)
    assert empty_layer["total_layer_equations_registered"] == 0
    assert empty_layer["equations_executed_count"] == 1  # fallback default equation

    # 2. Small 3-equation fixture + mtime/size invalidation check
    small_reg = tmp_path / "small_registry.jsonl"
    rows = [
        {
            "equation_id": "EQ_SM_1",
            "family_id": 1,
            "canonical_family": "FAM_001_PRESSURE",
            "family": "FAM_001_PRESSURE",
            "domain": "pressure",
            "reasoning_track": "3_offensive_line",
            "target_layer": 1,
            "status": "wired_and_tested",
            "formula_type": "linear_logit",
            "formula_spec": "0.25*x0 - 0.10*x1",
            "input_features": ["pass_block_win_rate", "pass_rush_win_rate"],
            "coefficients": {"w_primary": 0.25, "w_secondary": -0.10, "w_interaction": 0.05},
            "sample_size_n": 60,
            "min_sample_size": 30,
        },
        {
            "equation_id": "EQ_SM_2",
            "family_id": 1,
            "canonical_family": "FAM_001_PRESSURE",
            "family": "FAM_001_PRESSURE",
            "domain": "pressure",
            "reasoning_track": "3_offensive_line",
            "target_layer": 1,
            "status": "wired_and_tested",
            "formula_type": "linear_logit",
            "formula_spec": "0.50*x0 + 0.20*x1",
            "input_features": ["pass_block_win_rate", "pass_rush_win_rate"],
            "coefficients": {"w_primary": 0.50, "w_secondary": 0.20, "w_interaction": 0.05},
            "sample_size_n": 20,
            "min_sample_size": 35,
        },
    ]
    small_reg.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    fv_a = {"pass_block_win_rate": 0.65, "pass_rush_win_rate": 0.40}
    res_a = execute_layer_equation_family_batch(1, fv_a, registry_path=small_reg)
    assert res_a["total_layer_equations_registered"] == 2
    assert res_a["equations_active_above_min_sample"] == 1
    assert res_a["equations_held_below_min_sample"] == 1

    # Perturbing feature vector must bypass cached fv_a entry and produce a distinct delta
    fv_b = {"pass_block_win_rate": 1.45, "pass_rush_win_rate": 0.10}
    res_b = execute_layer_equation_family_batch(1, fv_b, registry_path=small_reg)
    assert res_b["aggregate_log_odds_delta"] != res_a["aggregate_log_odds_delta"]

    # Modifying the underlying registry file size/mtime must invalidate the cached batch
    rows.append(
        {
            "equation_id": "EQ_SM_3",
            "family_id": 2,
            "canonical_family": "FAM_002_RESTFATIGUE",
            "family": "FAM_002_RESTFATIGUE",
            "domain": "restFatigue",
            "reasoning_track": "4_trust_signals",
            "target_layer": 1,
            "status": "wired_and_tested",
            "formula_type": "linear_logit",
            "formula_spec": "0.30*x0",
            "input_features": ["pass_block_win_rate"],
            "coefficients": {"w_primary": 0.30, "w_secondary": 0.0, "w_interaction": 0.0},
            "sample_size_n": 80,
            "min_sample_size": 30,
        }
    )
    small_reg.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    res_c = execute_layer_equation_family_batch(1, fv_a, registry_path=small_reg)
    assert res_c["total_layer_equations_registered"] == 3
    assert res_c["equations_active_above_min_sample"] == 2


def test_full_rea_suite_and_typescript_mcp_contracts() -> None:
    receipt = execute_rea_tool_design_and_optimization_suite(write_artifacts=True)
    assert receipt["status"] == "PASS"
    assert REA_RECEIPT_JSON_PATH.exists()
    assert REA_REPORT_MD_PATH.exists()

    bench = receipt["rea_analysis_optimization_benchmark"]
    assert bench["status"] == "PASS"
    assert bench["oracle_verification"]["EQ_00003_exact_minus_0_088894"] is True
    assert bench["oracle_verification"]["EQ_06896_exact_minus_0_197351"] is True
    assert bench["oracle_verification"]["cold_warm_279_family_parity"] is True
    assert bench["speedup_ratios"]["warm_279_family_speedup_x"] > 100.0
    assert bench["cache_diagnostics"]["max_batch_cache_entries"] == MAX_BATCH_CACHE_ENTRIES

    ts_tools = (
        REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "rea-evidence-investigation-tools.ts"
    ).read_text(encoding="utf-8")
    ts_index = (
        REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "index.ts"
    ).read_text(encoding="utf-8")
    assert "inspectQuadEngineEvidence" in ts_tools
    assert "inspectAnalysisView" in ts_tools
    assert "resource_constraint" in ts_tools
    assert "stale_revision" in ts_tools
    assert "inspectAnalysisViewTool" in ts_index
    assert "recordUnknownTool" in ts_index
    assert "updateUnknownTool" in ts_index

    invalidate_equation_executor_caches()
    diag = get_equation_executor_cache_diagnostics()
    assert diag["retained_batch_entries"] == 0
