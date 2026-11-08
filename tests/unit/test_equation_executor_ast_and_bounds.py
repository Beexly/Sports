#!/usr/bin/env python3
"""
Unit tests for Workstream 2:
1. Compiled safe AST formula_spec execution across all 21,419 equations (< 0.35s batch execution)
   with < 1e-12 parity against operator-branch evaluation.
2. Positive-definite copula_tail repair across all 1,367 catalog / 1,372 registry entries
   when x0 * x1 < -4.5 (zero complex/NaN values).
3. Exact 1,400 sub-min_sample_size entries gated at effective_weight = 0.0, post_gate_delta = 0.0,
   gate_status = "HELD_BELOW_MIN_SAMPLE_SIZE" while preserving diagnostic_raw_signal.
4. Feature unit normalizers on EQ_00003 ([-0.18, +0.18], never -3.08324) and
   EQ_06896 at Mile High (-0.2014, never +1314.57504).
5. All 279 canonical equation families (0..278) accounted for in FamilyConsumptionReceipt output.
"""
from __future__ import annotations

import math
import time
from pathlib import Path

from intelligence.equations.equation_executor import (
    compile_formula_spec_ast,
    evaluate_equation_spec,
    execute_all_279_equation_families,
    load_equation_registry,
)
from scripts.wiring.repair_and_audit_equation_registry import repair_and_audit

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_repair_and_audit_equation_registry_invariants() -> None:
    audit = repair_and_audit()
    assert audit["status"] == "PASS"
    assert audit["catalog_12304_count"] == 12304
    assert audit["registry_21419_count"] == 21419
    assert audit["catalog_copula_tail_repaired"] == 1367
    assert audit["registry_copula_tail_total"] == 1372
    assert audit["registry_copula_tail_safe"] == 1372
    assert audit["unsafe_copula_tail_remaining"] == 0
    assert audit["sub_min_sample_size_gated_count"] == 1400
    assert audit["canonical_families_covered"] == 279


def test_eq_00003_and_eq_06896_unit_normalization_and_bounds() -> None:
    res_00003 = evaluate_equation_spec(
        equation_id="EQ_00003",
        family="FAM_002_RESTFATIGUE",
        inputs={
            "rest_differential_days": -10.0,
            "time_zone_shift_hours": 0.0,
            "home_neutral_pace_sec": 27.5,
        },
        use_ast_executor=True,
    )
    assert res_00003["executed_via"] == "compiled_ast"
    assert -0.18 <= res_00003["raw_signal"] <= 0.18, f"EQ_00003 out of bounds: {res_00003}"
    assert abs(res_00003["raw_signal"] - (-3.08324)) > 2.5

    res_06896 = evaluate_equation_spec(
        equation_id="EQ_06896",
        family="FAM_199_WEATHER",
        inputs={
            "altitude_ft": 5280.0,
            "wind_mph": 8.0,
            "total_line": 45.5,
        },
        use_ast_executor=True,
    )
    assert res_06896["executed_via"] == "compiled_ast"
    assert abs(res_06896["raw_signal"] - (-0.2014)) < 1e-4, f"Expected ~-0.2014, got {res_06896['raw_signal']}"
    assert -0.35 <= res_06896["log_odds_delta"] <= 0.35


def test_copula_tail_negative_product_domain_safety() -> None:
    records = load_equation_registry()
    copula_recs = [r for r in records if r.get("formula_type") == "copula_tail"]
    assert len(copula_recs) == 1372

    for rec in copula_recs:
        feats = rec.get("input_features") or ["x0", "x1", "x2"]
        # Force product x0 * x1 = (-3.5) * (2.5) = -8.75 < -4.5
        extreme_inputs = {feats[0]: -3.5, feats[1]: 2.5, feats[2]: 0.4}
        res = evaluate_equation_spec(
            equation_id=rec["equation_id"],
            family=str(rec.get("family", "")),
            inputs=extreme_inputs,
            formula_type="copula_tail",
            coefficients=rec.get("coefficients"),
            parameter_bindings=feats,
            formula_spec=str(rec.get("formula_spec", "")),
            sample_size_n=int(rec.get("sample_size_n", 100)),
            min_sample_size=int(rec.get("min_sample_size", 30)),
            use_ast_executor=True,
        )
        assert isinstance(res["diagnostic_raw_signal"], float)
        assert math.isfinite(res["diagnostic_raw_signal"])
        assert -0.35 <= res["log_odds_delta"] <= 0.35


def test_all_21419_ast_vs_operator_parity_sub_min_sample_gating_and_speed() -> None:
    records = load_equation_registry()
    assert len(records) == 21419

    # Pre-warm compiled AST closures once
    for rec in records:
        compile_formula_spec_ast(str(rec["formula_spec"]))

    sample_vec = {"epa_per_play": 0.14, "proe": -0.05, "pressure_rate": 0.29}
    t0 = time.perf_counter()
    held_count = 0
    max_parity_diff = 0.0

    for rec in records:
        res_ast = evaluate_equation_spec(
            equation_id=rec["equation_id"],
            family=str(rec.get("family", "")),
            inputs=sample_vec,
            formula_type=str(rec.get("formula_type", "linear_logit")),
            coefficients=rec.get("coefficients"),
            parameter_bindings=rec.get("input_features"),
            formula_spec=str(rec.get("formula_spec", "")),
            sample_size_n=int(rec.get("sample_size_n", 100)),
            min_sample_size=int(rec.get("min_sample_size", 30)),
            use_ast_executor=True,
        )
        if res_ast["gate_status"] == "HELD_BELOW_MIN_SAMPLE_SIZE":
            held_count += 1
            assert res_ast["effective_weight"] == 0.0
            assert res_ast["raw_signal"] == 0.0
            assert res_ast["log_odds_delta"] == 0.0
            assert res_ast["post_gate_delta"] == 0.0

    elapsed = time.perf_counter() - t0
    assert held_count == 1400, f"Expected exact 1400 sub-min_sample_size gated equations, got {held_count}"
    assert elapsed < 0.35, f"Batch evaluation of 21,419 equations took {elapsed:.3f}s (> 0.35s budget)"

    # Verify AST vs operator kernel parity (< 1e-12) across 21,419 equations
    for rec in records:
        r_ast = evaluate_equation_spec(
            equation_id=rec["equation_id"],
            family=str(rec.get("family", "")),
            inputs=sample_vec,
            formula_type=str(rec.get("formula_type", "linear_logit")),
            coefficients=rec.get("coefficients"),
            parameter_bindings=rec.get("input_features"),
            formula_spec=str(rec.get("formula_spec", "")),
            sample_size_n=100,
            min_sample_size=30,
            use_ast_executor=True,
        )
        r_op = evaluate_equation_spec(
            equation_id=rec["equation_id"],
            family=str(rec.get("family", "")),
            inputs=sample_vec,
            formula_type=str(rec.get("formula_type", "linear_logit")),
            coefficients=rec.get("coefficients"),
            parameter_bindings=rec.get("input_features"),
            formula_spec=str(rec.get("formula_spec", "")),
            sample_size_n=100,
            min_sample_size=30,
            use_ast_executor=False,
        )
        diff = abs(r_ast["diagnostic_raw_signal"] - r_op["diagnostic_raw_signal"])
        if diff > max_parity_diff:
            max_parity_diff = diff
    assert max_parity_diff < 1e-12, f"Max AST vs operator parity diff {max_parity_diff} >= 1e-12"


def test_execute_all_279_equation_families_receipts() -> None:
    summary = execute_all_279_equation_families(
        {"epa_per_play": 0.16, "proe": 0.04, "pressure_rate": 0.31}
    )
    assert summary["total_equations_evaluated"] == 21419
    assert summary["equations_held_below_min_sample"] == 1400
    census = summary["family_consumption_census"]
    assert census["total_families"] == 279
    assert census["accounted_families"] == 279
    assert census["active_bound_families"] + census["dormant_logged_families"] == 279
    assert len(summary["family_receipts"]) == 279


def test_nan_inf_none_and_non_numeric_input_resilience() -> None:
    from intelligence.equations.equation_executor import (
        execute_layer_equation_family_batch,
        normalize_canonical_features,
    )

    corrupted_inputs: dict = {
        "epa_per_play": float("nan"),
        "proe": float("inf"),
        "pressure_rate": float("-inf"),
        "altitude_ft": None,
        "wind_mph": "corrupt_string",
        "total_line": True,
    }
    norm = normalize_canonical_features(corrupted_inputs)
    assert all(math.isfinite(v) and v == 0.0 for v in norm.values())

    res = evaluate_equation_spec("EQ_06896", "FAM_199_WEATHER", corrupted_inputs, use_ast_executor=True)
    assert math.isfinite(res["diagnostic_raw_signal"])
    assert math.isfinite(res["log_odds_delta"])
    assert res["log_odds_delta"] == 0.0

    batch = execute_layer_equation_family_batch(1, corrupted_inputs)
    assert math.isfinite(batch["aggregate_log_odds_delta"])
    assert -0.35 <= batch["aggregate_log_odds_delta"] <= 0.35


def test_sea_level_altitude_ft_continuity() -> None:
    res_sea = evaluate_equation_spec(
        equation_id="EQ_06896",
        family="FAM_199_WEATHER",
        inputs={"altitude_ft": 8.0, "wind_mph": 0.0, "total_line": 44.5},
        use_ast_executor=True,
    )
    assert abs(res_sea["raw_signal"]) < 0.01, f"Sea-level 8.0 ft should not be treated as 8 miles: {res_sea}"


def test_equation_gate_12304_ast_and_bounds_parity() -> None:
    from intelligence.reasoning.equation_gate import (
        evaluate_single_catalog_equation,
        load_equation_executable_catalog_12304,
    )

    cat = load_equation_executable_catalog_12304()
    by_id = {e["equation_id"]: e for e in cat["equations"]}

    v_00003 = evaluate_single_catalog_equation(
        by_id["EQ_00003"],
        {"rest_differential_days": -10.0, "time_zone_shift_hours": 3.0, "home_neutral_pace_sec": 26.8},
    )
    assert -0.35 <= v_00003 <= 0.35

    v_06896 = evaluate_single_catalog_equation(
        by_id["EQ_06896"],
        {},
        {"altitude_ft": 5280.0, "wind_mph": 8.0, "total_line": 45.5},
    )
    assert abs(v_06896 - (-0.2014)) < 1e-4
    assert -0.35 <= v_06896 <= 0.35


def test_per_game_context_packet_and_trace_sub_1_second_budget() -> None:
    from intelligence.context.context_packet_builder import build_context_packet
    from intelligence.reasoning.reasoning_workflow_assembler import execute_reasoning_workflow

    # Warm up registry once
    pkt0 = build_context_packet("2024_10_CIN_BAL", persist=True)
    execute_reasoning_workflow(pkt0, persist=True)

    t0 = time.perf_counter()
    pkt = build_context_packet("2026_09_DET_GB", persist=False)
    trace = execute_reasoning_workflow(pkt, persist=False)
    elapsed = time.perf_counter() - t0
    assert elapsed < 1.0, f"Per-game context packet + reasoning trace took {elapsed:.3f}s (> 1.0s budget)"
    assert trace["family_consumption_census"]["accounted_families"] == 279


def test_edge_case_c3_fallback_parameter_binding_isolation() -> None:
    from intelligence.equations.equation_executor import (
        _AST_SCALAR_CLOSURE_CACHE,
        _AST_USES_NAMED_BINDINGS,
        _evaluate_equation_scalars_fast,
        _PreNormalizedFeatureContext,
        invalidate_equation_executor_caches,
    )

    inputs = {"epa_per_play": 0.14, "proe": -0.05, "pressure_rate": 0.29}
    pre_ctx = _PreNormalizedFeatureContext(inputs, use_ast_executor=True)

    # Evaluate an equation with fallback bindings NOT in inputs
    rec_fallback = {
        "equation_id": "EQ_TEST_C3_A",
        "family": "FAM_000_GENERAL",
        "_input_features_tuple": ("unprovided_binding_alpha", "unprovided_binding_beta", "proe"),
        "_formula_spec_str": "0.5 * unprovided_binding_alpha - 0.25 * unprovided_binding_beta + 0.1 * proe",
        "_formula_type_lower": "linear_logit",
        "_prebound_weights": (0.5, -0.25, 0.1),
        "_is_sub_min": False,
    }
    diag_a, delta_a, _ = _evaluate_equation_scalars_fast(rec_fallback, 1.0, pre_ctx)
    assert math.isfinite(diag_a) and math.isfinite(delta_a)

    # Confirm unprovided fallback bindings were cleaned up from pre_ctx.shared_ast_env
    assert "unprovided_binding_alpha" not in pre_ctx.shared_ast_env
    assert "unprovided_binding_beta" not in pre_ctx.shared_ast_env
    assert pre_ctx.shared_ast_env["proe"] == -0.05

    # Also verify evaluate_equation_spec cleans up temporary fallback bindings on _pre_ctx,
    # supports 4+ parameter bindings (`bindings[3+]`), and never pops standard AST symbols (`x0`, `x1`, `x2`, `exp`)
    res_spec = evaluate_equation_spec(
        equation_id="EQ_TEST_C3_B",
        family="FAM_000_GENERAL",
        inputs=inputs,
        parameter_bindings=["x1", "epa_per_play", "transient_custom_var_3", "transient_custom_var_4"],
        formula_spec="0.3 * x0 + 0.2 * epa_per_play - 0.1 * transient_custom_var_3 + 0.05 * transient_custom_var_4",
        use_ast_executor=True,
        _pre_ctx=pre_ctx,
    )
    assert res_spec["executed_via"] == "compiled_ast"
    assert "transient_custom_var_3" not in pre_ctx.shared_ast_env
    assert "transient_custom_var_4" not in pre_ctx.shared_ast_env
    assert "x0" in pre_ctx.shared_ast_env
    assert "x1" in pre_ctx.shared_ast_env
    assert "x_primary" in pre_ctx.shared_ast_env
    assert "exp" not in pre_ctx.shared_ast_env

    # Verify single-call context cache does not poison `ast_enabled` when toggling `use_ast_executor`
    res_op = evaluate_equation_spec("EQ_00001", "FAM_001_OFFENSE", inputs, use_ast_executor=False)
    assert res_op["executed_via"] == "operator_kernel"
    res_ast = evaluate_equation_spec("EQ_00001", "FAM_001_OFFENSE", inputs)
    assert res_ast["executed_via"] == "compiled_ast"

    # Verify cache invalidation clears scalar closure and named-binding caches
    assert len(_AST_SCALAR_CLOSURE_CACHE) > 0 or len(_AST_USES_NAMED_BINDINGS) > 0
    invalidate_equation_executor_caches()
    assert len(_AST_SCALAR_CLOSURE_CACHE) == 0
    assert len(_AST_USES_NAMED_BINDINGS) == 0


