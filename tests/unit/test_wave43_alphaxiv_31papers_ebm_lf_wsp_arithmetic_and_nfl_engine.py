"""Wave 43 tests: 31 alphaXiv/arXiv papers, arithmetic fixes & deconfounded NFL engine."""

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
from gse_engine.science.wave43_alphaxiv_31paper_ebm_lf_wsp_calibration_arithmetic_and_slam_engine import (  # noqa: E501
    CLINICAL_RUO_ALPHAXIV_W43_SPORTS_WEIGHT,
    WAVE43_GSI_RLVR_TRAJECTORIES,
    evaluate_clv_vs_breakeven_hit_rate_and_beuoy_kelly,
    evaluate_conformal_kelly_fisher_deflator_and_drawdown,
    evaluate_continuous_flb_devig_vs_step_residual,
    evaluate_ebm_composition_verifier_tilting_and_bon,
    evaluate_inloop_deflation_martingale_placebo_and_evalues,
    evaluate_iwsp_and_wsr_rmsnorm_invariance_auditor,
    evaluate_latent_feedback_scaling_law_and_amplifier,
    evaluate_rossellini_isotonic_df_and_idr_shrinkage,
    evaluate_soccer_rps_weibull_aft_glicko2_and_live_tennis,
    evaluate_unbundled_vision_and_slam_dunk_ba,
    evaluate_wave43_alphaxiv_31paper_frontier_suite,
)
from gse_engine.tracking.wave43_ebm_composed_deconfounded_situational_nfl_engine import (
    WAVE43_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w43_ebm_deconfounded_pbp_features,
    evaluate_causal_w43_game_total_deconfounded_shift,
    evaluate_w43_martingale_placebo_audit,
    evaluate_wave43_ebm_deconfounded_nfl_and_alphaxiv_suite,
    evaluate_wave43_live_honest_ast_equations,
    run_wave43_alphaxiv_ebm_wsp_and_deconfounded_nfl_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave43_arithmetic_remediation_flb_clv_isotonic_fisher_and_evalues(
    tmp_path: Path,
) -> None:
    """Verify continuous FLB de-vig, CLV separation, isotonic df, Fisher-z & DSR/e-values."""
    assert CLINICAL_RUO_ALPHAXIV_W43_SPORTS_WEIGHT == 0.0

    flb = evaluate_continuous_flb_devig_vs_step_residual()
    assert flb["legacy_step_even_minus110"] == [0.4463, 0.5537]
    assert float(flb["legacy_even_step_jump"]) == pytest.approx(0.1074, abs=1e-4)
    assert flb["power_even_minus110"] == [0.5, 0.5]
    assert float(flb["power_even_jump"]) == 0.0
    assert flb["strictly_monotone_and_conserving"] is True
    assert 0.63 < float(flb["asym_neg200_pos160_power_fav"]) < 0.66
    assert 0.63 < float(flb["asym_neg200_pos160_shin_fav"]) < 0.66

    clv = evaluate_clv_vs_breakeven_hit_rate_and_beuoy_kelly()
    assert float(clv["minus110_breakeven_hit_rate"]) == pytest.approx(110.0 / 210.0, abs=1e-5)
    assert float(clv["small_move_60pct_beat_close_ev"]) < 0.0
    assert float(clv["positive_net_clv_ev"]) > 0.0
    assert clv["beuoy_kelly_beats_flat"] is True

    iso = evaluate_rossellini_isotonic_df_and_idr_shrinkage()
    assert int(iso["train_n"]) == 64
    assert int(iso["pava_effective_df_k"]) >= 6
    assert float(iso["binary_isotonic_optimism"]) > 0.02
    assert iso["shrinkage_improves_brier"] is True
    assert float(iso["oos_df_shrunk_cir_brier"]) <= float(iso["oos_pava_brier"])

    ck = evaluate_conformal_kelly_fisher_deflator_and_drawdown()
    assert float(ck["zero_edge_conformal_coverage"]) >= 0.87
    assert float(ck["zero_edge_conformal_log_growth"]) < 0.0
    assert float(ck["n25_binomial_se"]) == pytest.approx(0.1, abs=1e-6)
    assert float(ck["n50_fisher_z_se"]) == pytest.approx(0.145865, abs=1e-5)
    assert float(ck["fisher_lcb_small_n50_rho018"]) == 0.0
    assert 0.40 < float(ck["fisher_jacquier_n160_rho055"]) < 0.46
    assert float(ck["dd_ratio_nongauss_over_brownian"]) > 1.15

    ev = evaluate_inloop_deflation_martingale_placebo_and_evalues()
    assert 0.90 < float(ev["out_of_loop_dsr_prob"]) <= 1.0
    assert float(ev["gt_score"]) > 1.5
    assert 0.95 <= float(ev["null_imaginative_mean_wealth"]) <= 1.05
    assert float(ev["alt_imaginative_power_at_2"]) > 0.50

    xs = evaluate_soccer_rps_weibull_aft_glicko2_and_live_tennis()
    assert 0.0 < float(xs["soccer_rps"]) < 0.25
    assert 0.40 < float(xs["weibull_aft_prob_goal_from_55m"]) < 0.55
    assert float(xs["glicko2_mu_post_upset_win"]) > 0.0
    assert float(xs["tennis_prematch_weight_10pts"]) > float(xs["tennis_prematch_weight_120pts"])

    suite_fb = evaluate_wave43_alphaxiv_31paper_frontier_suite(tmp_path)
    assert suite_fb["clean_checkout_fallback"] is True
    assert int(suite_fb["total_unique_papers"]) == 31


def test_wave43_6papers_latent_feedback_ebm_iwsp_wsr_vision_slam_dunk(tmp_path: Path) -> None:
    """Verify Eq.(8) 778M LF scaling law, Dai-Du EBM, iWSP/WSR invariance & Vision/SLAM."""
    lf = evaluate_latent_feedback_scaling_law_and_amplifier(REPO_ROOT)
    assert lf["clean_checkout_fallback"] is False
    assert float(lf["heldout_778m_max_rel_error"]) < 0.005
    assert float(lf["compute_multiplier_kappa_271m_u200n"]) > 2.0
    assert lf["fixed_point_strictly_contracting"] is True

    lf_fb = evaluate_latent_feedback_scaling_law_and_amplifier(tmp_path)
    assert lf_fb["clean_checkout_fallback"] is True

    ebm = evaluate_ebm_composition_verifier_tilting_and_bon()
    assert float(ebm["eq162_composed_pmf_mass"]) == pytest.approx(1.0, abs=1e-7)
    assert float(ebm["eq163_kl_identity_abs_err"]) < 1e-12
    assert float(ebm["eq167_bon_expected_reward"]) > float(ebm["eq167_base_expected_reward"])
    assert ebm["fig12_reversal_verified"] is True

    wsp = evaluate_iwsp_and_wsr_rmsnorm_invariance_auditor()
    assert wsp["zero_backprop"] is True
    assert wsp["deconfounded_beats_confounded"] is True
    assert wsp["exact_rmsnorm_invariance"] is True
    assert float(wsp["post_rmsnorm_scale_diff"]) < 1e-10
    assert float(wsp["auditor_noop_false_alarm_rate"]) == 0.0

    vis = evaluate_unbundled_vision_and_slam_dunk_ba()
    assert float(vis["clinical_ruo_sports_weight"]) == 0.0
    assert vis["real_money_stake_cleared"] is False
    assert float(vis["live_stake_fraction"]) == 0.0
    assert float(vis["vision_ttft_reduction_pct"]) > 0.25
    assert float(vis["slam_drift_ratio_30m"]) > 2.5
    assert int(vis["lamaria_categories_beating_aria"]) == 3


def test_wave43_nfl_causal_iwsp_ebm_placebo_quarantine_and_ast(tmp_path: Path) -> None:
    """Verify causal W1-10 EBM/iWSP PBP signals, placebo p<0.05, quarantine & 8/8 ASTs."""
    causal = evaluate_causal_w43_ebm_deconfounded_pbp_features(as_of_week=10, repo_root=REPO_ROOT)
    assert causal["clean_checkout_fallback"] is False
    assert int(causal["max_prior_week_used"]) == 9
    quar = causal["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    for tm in ("KC", "DEN", "CIN", "BUF", "LAR", "LA", "WAS", "WSH"):
        assert tm in causal["teams"]
        assert -1.0 <= float(causal["teams"][tm]["comp_proe_norm"]) <= 1.0
        assert -1.0 <= float(causal["teams"][tm]["iwsp_def_garbage_deconfound_norm"]) <= 1.0

    assert (
        evaluate_causal_w43_ebm_deconfounded_pbp_features(as_of_week=10, repo_root=tmp_path)[
            "clean_checkout_fallback"
        ]
        is True
    )

    tot = evaluate_causal_w43_game_total_deconfounded_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -1.25 <= float(tot["total_shift_pts"]) <= 1.25

    placebo = evaluate_w43_martingale_placebo_audit(REPO_ROOT)
    assert int(placebo["games_audited"]) == 147
    assert int(placebo["null_placebo_draws"]) == 200
    assert placebo["beats_null_95pct"] is True
    assert float(placebo["empirical_p_value"]) < 0.05

    ast43 = evaluate_wave43_live_honest_ast_equations()
    assert int(ast43["parsed_evaluated_count"]) == 8
    assert ast43["zero_fabricated_bindings"] is True
    for eq in ast43["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"

    with pytest.raises(OperatorSimulationHoldError):
        evaluate_causal_w43_ebm_deconfounded_pbp_features(as_of_week=11, repo_root=REPO_ROOT)
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave43_ebm_deconfounded_nfl_and_alphaxiv_suite(as_of_week=11, repo_root=REPO_ROOT)


def test_wave43_cwd_invariance_warm_sla_and_stage2_3_wiring(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA & Stage-2/3 corpus/sim spine wiring."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave43_alphaxiv_31paper_frontier_suite(REPO_ROOT)
    _ = evaluate_wave43_ebm_deconfounded_nfl_and_alphaxiv_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    sci_w = evaluate_wave43_alphaxiv_31paper_frontier_suite(REPO_ROOT)
    trk_w = evaluate_wave43_ebm_deconfounded_nfl_and_alphaxiv_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05
    assert sci_w["wired"] is True
    assert trk_w["wired"] is True

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
    assert verif["wave43_ebm_deconfounded_nfl_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave43_alphaxiv_ebm_wsp_coupled"] is True
    )


def test_wave43_ablation_beats_w42_rlvr_364_and_hygiene() -> None:
    """Verify OOS gains over Wave 42, 340+24=364 RLVR & strict pure-ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0190
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9208
    assert float(m["gse_v41_margin_mae"]) < 9.6616
    assert float(m["gse_v41_total_mae"]) < 10.3739
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) < 0.21926
    assert float(m["overall_ece"]) < 0.07043
    assert float(w26["rliable_iqm"]) > 0.733144
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench43 = run_wave43_alphaxiv_ebm_wsp_and_deconfounded_nfl_benchmark(
        REPO_ROOT, write_artifact=False
    )
    assert bench43["real_money_stake_cleared"] is False
    assert float(bench43["live_stake_fraction"]) == 0.0
    assert float(bench43["clinical_ruo_sports_weight"]) == 0.0
    assert len(bench43["benchmark_sha256"]) == 64

    assert len(WAVE43_GSI_RLVR_TRAJECTORIES) == 6
    assert len(WAVE43_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 340
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 340
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 364

    hygiene_paths = (
        REPO_ROOT
        / "data"
        / "arxiv_2026_11_alphaxiv"
        / "alphaxiv_31paper_frontier_and_arithmetic_audit_vault_2026.json",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave43_alphaxiv_31paper_ebm_lf_wsp_calibration_arithmetic_and_slam_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave43_ebm_composed_deconfounded_situational_nfl_engine.py",
        REPO_ROOT
        / "docs"
        / "arxiv-program"
        / "research"
        / "2026-11-18"
        / (
            "deep-research-wave43-alphaxiv-31papers-ebm-lf-wsp-calibration"
            "-arithmetic-remediation-and-nfl-engine.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
