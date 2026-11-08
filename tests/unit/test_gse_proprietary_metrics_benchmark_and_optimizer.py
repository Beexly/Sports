"""
Unit and Integration Tests for GSE Proprietary Created Stats, Metrics & Kernels Optimizer.
"""

from __future__ import annotations

from intelligence.coaching.gse_proprietary_metrics_benchmark_and_optimizer import (
    DEFAULT_RECEIPT_PATH,
    PROPRIETARY_GSE_METRICS_CATALOG,
    load_proprietary_coaching_csv_summary,
    run_proprietary_metrics_ablation_and_optimization,
)


def test_all_22_proprietary_gse_metrics_catalog_and_csv_warehouse() -> None:
    assert len(PROPRIETARY_GSE_METRICS_CATALOG) == 22
    ids = [m.metric_id for m in PROPRIETARY_GSE_METRICS_CATALOG]
    assert ids[0] == "M-GSE-01"
    assert ids[-1] == "M-GSE-22"

    csv_summary = load_proprietary_coaching_csv_summary()
    assert csv_summary["verified_table_count"] == csv_summary["expected_table_count"]
    assert csv_summary["total_rows_across_proprietary_tables"] > 400


def test_proprietary_metrics_ablation_and_weight_optimization() -> None:
    report = run_proprietary_metrics_ablation_and_optimization(n_historical_slates=320, seed=20261108)
    assert report["total_proprietary_metrics_cataloged"] == 22
    assert report["all_22_metrics_wired_and_tested"] is True

    bench = report["out_of_sample_4fold_optimization_benchmark"]
    assert bench["optimized_beats_unoptimized_equal"] is True
    assert bench["optimized_beats_market_baseline"] is True
    assert bench["logit_mse_optimized_james_stein_ridge"] < bench["logit_mse_unoptimized_equal_weights"]
    assert bench["logit_mse_unoptimized_equal_weights"] < bench["logit_mse_market_only"]
    assert bench["dk_lineup_mae_optimized_james_stein_pts"] < bench["dk_lineup_mae_unoptimized_equal_pts"]
    assert bench["dk_lineup_mae_unoptimized_equal_pts"] < bench["dk_lineup_mae_market_only_pts"]

    # Every single family A..F must improve accuracy when included (ablation increases MSE)
    for fam, fam_res in report["family_ablation_verification"].items():
        assert fam_res["family_improves_accuracy"] is True, f"Family {fam} failed ablation check"

    # Vectorized speedup must be > 10x
    assert report["vectorized_execution_benchmark"]["vectorized_speedup_x"] > 10.0
    assert DEFAULT_RECEIPT_PATH.exists()

    # Verify 26-layer stack & 279 equation family metadata on all 22 proprietary metrics
    for spec in PROPRIETARY_GSE_METRICS_CATALOG:
        assert len(spec.layer_ids) >= 1
        assert bool(spec.track_id)
        assert bool(spec.weekly_step_id)
        assert spec.equation_family_id.startswith("FAM_")

    # Verify empirical CSV blending and binary-outcome Brier + Brier Skill Score
    assert bench["binary_outcome_brier_optimized"] < bench["binary_outcome_brier_unoptimized_equal"]
    assert bench["binary_outcome_brier_unoptimized_equal"] <= bench["binary_outcome_brier_market_only"]
    assert bench["binary_outcome_brier_skill_score"] > 0.0

