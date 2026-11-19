"""Wave 44 tests: 28 alphaXiv/arXiv DFL, causal sports, integrity, RG & NFL engine."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

import pytest
from scripts.ops.gse_coach_mind_simulator import (
    compute_pre_projection_universal_and_deep_non_stationary_priors,
)

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    _FORBIDDEN_ODDS_RE,
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science.wave44_alphaxiv_28paper_dfl_cvar_causal_mspem_integrity_and_rg_engine import (  # noqa: E501
    CLINICAL_RUO_ALPHAXIV_W44_SPORTS_WEIGHT,
    WAVE44_GSI_RLVR_TRAJECTORIES,
    evaluate_agent_integrity_reverification_anti_hacking_and_pool_diversity,
    evaluate_causal_sports_mspem_dynamo_ate_att_and_parr,
    evaluate_dfl_cvar_spo_lpas_dro_and_solver_free_surrogate,
    evaluate_influencer_survivorship_betxplain_and_rg_messaging,
    evaluate_wave44_alphaxiv_28paper_dfl_causal_integrity_suite,
)
from gse_engine.tracking.wave44_dfl_rim_officiating_kicker_parr_dynamo_and_anti_shortcut_nfl_engine import (  # noqa: E501
    WAVE44_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w44_dfl_rim_kicker_features,
    evaluate_causal_w44_game_total_pace_air_shift,
    evaluate_w44_martingale_and_baitbench_shortcut_audit,
    evaluate_wave44_dfl_rim_kicker_parr_and_integrity_suite,
    evaluate_wave44_live_honest_ast_equations,
    run_wave44_alphaxiv_28paper_dfl_causal_and_integrity_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave44_science_28papers_dfl_causal_integrity_and_rg(tmp_path: Path) -> None:
    """Verify all 4 Wave 44 scientific pillars across 28 preprints and tmp fallback."""
    assert CLINICAL_RUO_ALPHAXIV_W44_SPORTS_WEIGHT == 0.0

    dfl = evaluate_dfl_cvar_spo_lpas_dro_and_solver_free_surrogate()
    assert dfl["cvar_spo_beats_mse_tail_regret"] is True
    assert float(dfl["cvar90_regret_cvar_spo"]) < float(dfl["cvar90_regret_mse"])
    assert dfl["strict_propriety_verified"] is True
    assert float(dfl["weighted_psr_true_score"]) < float(dfl["weighted_psr_miss_score"])
    assert float(dfl["shapley_efficiency_err"]) == pytest.approx(0.0, abs=1e-9)
    assert dfl["shapley_efficiency_verified"] is True
    assert dfl["lpas_beats_fixed_dro"] is True
    assert dfl["strategic_non_monotonicity_verified"] is True
    assert int(dfl["solver_calls_per_grad_step"]) == 0
    assert dfl["dfl_ld_dual_gap_bounded"] is True

    cau = evaluate_causal_sports_mspem_dynamo_ate_att_and_parr()
    assert float(cau["clinical_ruo_sports_weight"]) == 0.0
    assert float(cau["mspem_naive_collider_slope"]) < 0.0
    assert float(cau["mspem_iptw_corrected_slope"]) > 0.0
    assert cau["paradox_sign_reversal_corrected"] is True
    assert float(cau["dynamo_kernel_rmse"]) < float(cau["dynamo_static_ols_rmse"])
    assert cau["dynamo_crowd_shift_recovered"] is True
    assert float(cau["ate_att_high_overlap_gap"]) < float(cau["ate_att_low_overlap_gap"])
    assert cau["overlap_divergence_verified"] is True
    assert float(cau["kicker_long_raw_pct"]) < float(cau["kicker_chip_raw_pct"])
    assert float(cau["kicker_long_parr"]) > float(cau["kicker_chip_parr"])
    assert cau["parr_reorders_specialist_above_raw"] is True
    assert float(cau["rim_clutch"]) > float(cau["rim_blowout"])
    assert cau["rim_clutch_gt_blowout"] is True
    assert cau["collider_bias_detected"] is True

    agt = evaluate_agent_integrity_reverification_anti_hacking_and_pool_diversity()
    assert agt["phantom_pass_rejected"] is True
    assert float(agt["overclaim_recall"]) == 1.0
    assert "CLAUDE.md" in agt["overclaim_unread_files_flagged"]
    assert float(agt["reagent_metric_mismatch"]) == 0.0
    assert float(agt["ridar_reduction_pct"]) > 0.35
    assert agt["evidence_view_gaming_prevented"] is True
    assert agt["union_pool_beats_single_pool"] is True
    assert float(agt["baitbench_masked_hidden_acc"]) == 1.0
    assert float(agt["baitbench_shortcut_weight"]) == 0.0

    rg = evaluate_influencer_survivorship_betxplain_and_rg_messaging()
    assert int(rg["slips_audited"]) == 5467
    assert float(rg["displayed_survivorship_win_rate"]) > 0.90
    assert rg["all_four_staking_rois_negative"] is True
    for key in ("roi_flat", "roi_inverse", "roi_square_root", "roi_fixed_return"):
        assert float(rg[key]) < 0.0
    assert rg["manipulative_flagged_and_clean_passed"] is True
    assert int(rg["betxplain_clean_cues_count"]) == 0
    assert str(rg["rg_message_mode"]) == "personalized_budget_reflection_with_normative_anchor"

    sci = evaluate_wave44_alphaxiv_28paper_dfl_causal_integrity_suite(REPO_ROOT)
    assert sci["wired"] is True
    assert int(sci["total_unique_papers"]) == 28
    assert float(sci["clinical_ruo_sports_weight"]) == 0.0
    assert sci["real_money_stake_cleared"] is False
    assert float(sci["live_stake_fraction"]) == 0.0
    assert len(str(sci["suite_sha256"])) == 64

    fb = evaluate_wave44_alphaxiv_28paper_dfl_causal_integrity_suite(tmp_path)
    assert fb["wired"] is True
    assert fb["clean_checkout_fallback"] is True
    assert int(fb["total_unique_papers"]) == 28


def test_wave44_causal_nfl_hold_placebo_baitbench_ast_and_wiring(tmp_path: Path) -> None:
    """Verify causal W1-10 NFL features, W11 hold, 500-draw placebo, BAITBENCH & wiring."""
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave44_dfl_rim_kicker_parr_and_integrity_suite(
            away_team="KC", home_team="DEN", as_of_week=11, repo_root=REPO_ROOT
        )

    feat = evaluate_causal_w44_dfl_rim_kicker_features(as_of_week=10, repo_root=REPO_ROOT)
    assert int(feat["max_prior_week_used"]) == 9
    quar = feat["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    assert "baitbench_postgame_shortcut_probe" in quar

    tot = evaluate_causal_w44_game_total_pace_air_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -1.25 <= float(tot["total_shift_pts"]) <= 1.25

    audit = evaluate_w44_martingale_and_baitbench_shortcut_audit(REPO_ROOT)
    assert int(audit["games_audited"]) == 147
    assert int(audit["null_placebo_draws"]) == 500
    assert float(audit["empirical_p_value"]) <= 0.05
    assert audit["beats_null_95pct"] is True
    assert float(audit["baitbench_max_output_perturbation"]) == 0.0
    assert audit["shortcut_invariance_verified"] is True

    ast_res = evaluate_wave44_live_honest_ast_equations()
    assert ast_res["zero_fabricated_bindings"] is True
    assert int(ast_res["parsed_evaluated_count"]) == 8
    assert all(
        e["status"] == "PARSED_EVALUATED" for e in ast_res["equations_evaluated"]
    )

    clean_s = evaluate_wave44_dfl_rim_kicker_parr_and_integrity_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    probe_s = evaluate_wave44_dfl_rim_kicker_parr_and_integrity_suite(
        away_team="KC",
        home_team="DEN",
        as_of_week=10,
        is_indoor=False,
        repo_root=REPO_ROOT,
        shortcut_probe={
            "raw_penalty_count_unweighted": 999.0,
            "baitbench_postgame_shortcut_probe": -500.0,
        },
    )
    assert float(clean_s["w44_close_residual_signal"]) == pytest.approx(
        float(probe_s["w44_close_residual_signal"]), abs=1e-12
    )

    t0 = time.perf_counter()
    evaluate_wave44_dfl_rim_kicker_parr_and_integrity_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    elapsed_warm = time.perf_counter() - t0
    assert elapsed_warm < 0.05

    fb_trk = evaluate_wave44_dfl_rim_kicker_parr_and_integrity_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=tmp_path
    )
    assert fb_trk["wired"] is True
    assert fb_trk["real_money_stake_cleared"] is False

    compiled = compile_all_books_pdfs_ig_x_and_situational_priors(
        away_team="ARI",
        home_team="DEN",
        week=10,
        merged_game_context={},
        stage1a_receipt=None,
        stage1b_receipt=None,
        pbp_ftn_32={},
        x_and_ig_360_charting={},
        full_repo_situational={},
        gdrive_onedrive_overlay={},
        uncompressed_25k_bridge={},
        x_layer2_overlay={},
        q1_to_q51_registry={},
        env_cfg={"is_indoor": False, "wind_mph": 12.0},
    )
    verif = assert_all_books_pdfs_ig_x_situational_wired(compiled)
    assert verif["wave44_dfl_rim_kicker_parr_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave44_alphaxiv_dfl_rim_parr_coupled"] is True
    )


def test_wave44_ablation_beats_w43_rlvr_376_and_hygiene() -> None:
    """Verify monotone OOS gains over Wave 43, 352+24=376 RLVR & strict ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0141
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9159
    assert float(m["gse_v41_margin_mae"]) < 9.6552
    assert float(m["gse_v41_total_mae"]) < 10.3545
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) < 0.21922
    assert float(m["overall_ece"]) < 0.07031
    assert float(w26["rliable_iqm"]) > 0.733358
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench44 = run_wave44_alphaxiv_28paper_dfl_causal_and_integrity_benchmark(
        REPO_ROOT, write_artifact=False
    )
    assert bench44["real_money_stake_cleared"] is False
    assert float(bench44["live_stake_fraction"]) == 0.0
    assert float(bench44["clinical_ruo_sports_weight"]) == 0.0
    assert len(str(bench44["benchmark_sha256"])) == 64

    assert len(WAVE44_GSI_RLVR_TRAJECTORIES) == 6
    assert len(WAVE44_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 352
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 352
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 376

    hygiene_paths = (
        REPO_ROOT / ".licenses" / "alphaxiv_arxiv_wave44_28papers_LICENSE.txt",
        REPO_ROOT
        / "data"
        / "arxiv_2026_11_alphaxiv"
        / "alphaxiv_28paper_dfl_causal_sports_integrity_and_rg_vault_2026.json",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave44_alphaxiv_28paper_dfl_cvar_causal_mspem_integrity_and_rg_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave44_dfl_rim_officiating_kicker_parr_dynamo_and_anti_shortcut_nfl_engine.py",
        REPO_ROOT
        / "docs"
        / "arxiv-program"
        / "research"
        / "2026-11-18"
        / (
            "deep-research-wave44-alphaxiv-28papers-dfl-cvar-causal-rim-mspem-parr"
            "-agent-integrity-and-nfl-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
