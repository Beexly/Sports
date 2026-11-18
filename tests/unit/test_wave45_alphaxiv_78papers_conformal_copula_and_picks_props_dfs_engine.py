"""Wave 45 tests: 78 alphaXiv papers (59 new), conformal/copula/DFS & unified NFL engine."""

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
from gse_engine.science.wave45_alphaxiv_59new_conformal_copula_parlay_dfs_and_referee_engine import (  # noqa: E501
    CLINICAL_RUO_ALPHAXIV_W45_SPORTS_WEIGHT,
    WAVE45_GSI_RLVR_TRAJECTORIES,
    evaluate_agent_containment_debate_and_multisport_cfa_hawkes,
    evaluate_anytime_valid_conformal_martingales_aci_and_blown_lead,
    evaluate_copula_boxscore_multivariate_kelly_parlay_and_dfs_ip,
    evaluate_nfl_humility_4th_down_ep_snap_timing_and_ghosts,
    evaluate_wave45_alphaxiv_78paper_conformal_copula_dfs_suite,
)
from gse_engine.tracking.wave45_skill_wopr_snap_continuity_props_and_milp_dfs_nfl_engine import (  # noqa: E501
    WAVE45_TRACKING_RLVR_TRAJECTORIES,
    evaluate_causal_w45_game_total_wopr_te_shift,
    evaluate_causal_w45_skill_wopr_and_snap_features,
    evaluate_w45_martingale_and_shortcut_audit,
    evaluate_w45_walk_forward_props_and_milp_dfs_harmony,
    evaluate_wave45_live_honest_ast_equations,
    evaluate_wave45_skill_harmony_props_dfs_and_78paper_suite,
    run_wave45_78paper_picks_props_and_milp_dfs_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave45_science_78papers_conformal_copula_humility_and_cfa(tmp_path: Path) -> None:
    """Verify all 4 Wave 45 scientific pillars across 78 unique papers and tmp fallback."""
    assert CLINICAL_RUO_ALPHAXIV_W45_SPORTS_WEIGHT == 0.0

    aci = evaluate_anytime_valid_conformal_martingales_aci_and_blown_lead()
    assert float(aci["naive_optional_stop_fpr"]) > 0.20
    assert float(aci["promote_anytime_fpr"]) <= 0.05
    assert aci["anytime_valid_verified"] is True
    assert float(aci["bc_aci_post_shift_width"]) < float(aci["standard_aci_post_shift_width"])
    assert aci["bias_recentering_verified"] is True
    assert float(aci["doob_exact_blown_80_bound"]) == pytest.approx(0.25, abs=1e-9)
    assert aci["blown_lead_paradox_verified"] is True
    assert float(aci["clean_control_flaw_tpr"]) == 1.0
    assert float(aci["clean_control_fpr"]) == 0.0
    assert aci["paired_clean_control_calibrated"] is True

    cop = evaluate_copula_boxscore_multivariate_kelly_parlay_and_dfs_ip()
    assert float(cop["copula_3way_joint_prob"]) > float(cop["indep_3way_joint_prob"])
    assert float(cop["copula_3way_p95_sum"]) > float(cop["indep_3way_p95_sum"])
    assert cop["copula_tail_shift_verified"] is True
    assert float(cop["implicit_cash_factorization_err"]) < 1e-9
    assert float(cop["underpriced_corr_log_growth_gain"]) > 0.0
    assert int(cop["dfs_portfolio_lineups"]) == 3
    assert cop["all_lineups_cap_valid"] is True
    assert int(cop["max_pairwise_overlap"]) <= 4
    assert float(cop["portfolio_3_p95_score"]) > float(cop["single_lineup_p95_score"])
    assert cop["portfolio_ceiling_lift_verified"] is True

    hum = evaluate_nfl_humility_4th_down_ep_snap_timing_and_ghosts()
    assert hum["toss_up_decision"] == "TOSS_UP_HUMILITY_ABSTAIN"
    assert hum["clear_decision"] == "CONFIDENT_GO"
    assert hum["humility_abstention_verified"] is True
    assert float(hum["raw_soft_sched_win_rate"]) > float(hum["raw_elite_sched_win_rate"])
    assert float(hum["ridge_elite_sched_rating"]) > float(hum["ridge_soft_sched_rating"])
    assert hum["opponent_adjustment_verified"] is True
    assert float(hum["snap_sync_low_var_epa"]) > float(hum["snap_desync_high_var_epa"])
    assert hum["snap_sync_verified"] is True

    cfa = evaluate_agent_containment_debate_and_multisport_cfa_hawkes()
    assert float(cfa["clinical_ruo_sports_weight"]) == 0.0
    assert cfa["cfa_gain_verified"] is True
    assert float(cfa["debate_critic_hacking_rate"]) < float(cfa["rlaif_single_judge_hacking_rate"])
    assert float(cfa["transmissible_hacking_post_quarantine"]) == 0.0
    assert cfa["leakbench_ruo_zero_isolated"] is True

    sci = evaluate_wave45_alphaxiv_78paper_conformal_copula_dfs_suite(REPO_ROOT)
    assert sci["wired"] is True
    assert int(sci["total_unique_papers"]) == 78
    assert int(sci["brand_new_unique_papers"]) == 59
    assert float(sci["clinical_ruo_sports_weight"]) == 0.0
    assert sci["real_money_stake_cleared"] is False
    assert float(sci["live_stake_fraction"]) == 0.0
    assert len(str(sci["suite_sha256"])) == 64

    fb = evaluate_wave45_alphaxiv_78paper_conformal_copula_dfs_suite(tmp_path)
    assert fb["wired"] is True
    assert fb["clean_checkout_fallback"] is True
    assert int(fb["total_unique_papers"]) == 78


def test_wave45_causal_nfl_props_milp_dfs_placebo_ast_and_wiring(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify causal W1-10 picks, 5-market props, SciPy MILP DFS, W11 hold & wiring."""
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_wave45_skill_harmony_props_dfs_and_78paper_suite(
            away_team="KC", home_team="DEN", as_of_week=11, repo_root=REPO_ROOT
        )

    feat = evaluate_causal_w45_skill_wopr_and_snap_features(as_of_week=10, repo_root=REPO_ROOT)
    assert int(feat["max_prior_week_used"]) == 9
    quar = feat["quarantined_metrics_weights"]
    assert len(quar) == 5
    assert all(float(v) == 0.0 for v in quar.values())
    assert "baitbench_w45_shortcut_probe" in quar

    tot = evaluate_causal_w45_game_total_wopr_te_shift(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert -1.20 <= float(tot["total_shift_pts"]) <= 1.20

    harmony = evaluate_w45_walk_forward_props_and_milp_dfs_harmony(REPO_ROOT)
    assert int(harmony["slates_evaluated"]) == 9
    assert int(harmony["player_dk_evaluations"]) == 2784
    assert harmony["all_5_prop_markets_beat_naive"] is True
    assert float(harmony["overall_gated_prop_hit_rate"]) > 0.65
    props = harmony["props_5_markets"]
    assert float(props["rush_yds"]["tier1_hit_rate"]) > 0.72
    assert float(props["rec_yds"]["tier1_hit_rate"]) > 0.72
    assert float(props["anytime_td"]["gse_brier"]) < float(props["anytime_td"]["naive_brier"])
    dfs = harmony["dfs_milp_backtest"]
    assert dfs["beats_raw_fppg_mae"] is True
    assert float(dfs["mean_gse_cash_dk_pts"]) > float(dfs["mean_chalk_dk_pts"])
    assert float(dfs["mean_gse_gpp_dk_pts"]) > float(dfs["mean_chalk_dk_pts"])
    assert dfs["zero_cap_violations"] is True
    assert float(harmony["max_kkt_harmony_residual"]) < 1e-6

    audit = evaluate_w45_martingale_and_shortcut_audit(REPO_ROOT)
    assert int(audit["games_audited"]) == 147
    assert int(audit["null_placebo_draws"]) == 500
    assert float(audit["empirical_p_value"]) <= 0.015
    assert audit["beats_null_99pct"] is True
    assert float(audit["shortcut_max_output_perturbation"]) == 0.0
    assert audit["shortcut_invariance_verified"] is True

    ast_res = evaluate_wave45_live_honest_ast_equations()
    assert ast_res["zero_fabricated_bindings"] is True
    assert int(ast_res["parsed_evaluated_count"]) == 8
    assert all(e["status"] == "PARSED_EVALUATED" for e in ast_res["equations_evaluated"])

    clean_s = evaluate_wave45_skill_harmony_props_dfs_and_78paper_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    probe_s = evaluate_wave45_skill_harmony_props_dfs_and_78paper_suite(
        away_team="KC",
        home_team="DEN",
        as_of_week=10,
        is_indoor=False,
        repo_root=REPO_ROOT,
        shortcut_probe={
            "raw_postgame_dfs_ownership_leak": 999.0,
            "baitbench_w45_shortcut_probe": -500.0,
        },
    )
    assert float(clean_s["w45_close_residual_signal"]) == pytest.approx(
        float(probe_s["w45_close_residual_signal"]), abs=1e-12
    )

    monkeypatch.chdir(tmp_path)
    t0 = time.perf_counter()
    _ = evaluate_wave45_alphaxiv_78paper_conformal_copula_dfs_suite(REPO_ROOT)
    _ = evaluate_wave45_skill_harmony_props_dfs_and_78paper_suite(
        away_team="KC", home_team="DEN", as_of_week=10, is_indoor=False, repo_root=REPO_ROOT
    )
    assert (time.perf_counter() - t0) < 0.05

    fb_trk = evaluate_wave45_skill_harmony_props_dfs_and_78paper_suite(
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
    assert verif["wave45_skill_harmony_props_dfs_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 12.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave45_picks_props_milp_dfs_harmony_coupled"]
        is True
    )


def test_wave45_ablation_beats_w44_rlvr_388_and_hygiene() -> None:
    """Verify OOS gains over Wave 44, 364+24=388 RLVR & strict pure-ASCII hygiene."""
    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) < 7.0097
    assert float(m["raw_gse_v41_margin_crps"]) < 6.9115
    assert float(m["gse_v41_margin_mae"]) < 9.6502
    assert float(m["gse_v41_total_mae"]) < 10.3136
    assert float(m["gse_v41_total_mae"]) < float(m["closing_market_total_mae"])
    assert float(m["gse_v41_brier"]) < 0.21919
    assert float(m["overall_ece"]) <= 0.07022
    assert float(w26["rliable_iqm"]) > 0.733366
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench45 = run_wave45_78paper_picks_props_and_milp_dfs_benchmark(
        REPO_ROOT, write_artifact=False
    )
    assert bench45["real_money_stake_cleared"] is False
    assert float(bench45["live_stake_fraction"]) == 0.0
    assert float(bench45["clinical_ruo_sports_weight"]) == 0.0
    assert len(str(bench45["benchmark_sha256"])) == 64

    assert len(WAVE45_GSI_RLVR_TRAJECTORIES) == 6
    assert len(WAVE45_TRACKING_RLVR_TRAJECTORIES) == 6
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 364
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 364
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 388

    hygiene_paths = (
        REPO_ROOT / ".licenses" / "alphaxiv_arxiv_wave45_78papers_LICENSE.txt",
        REPO_ROOT
        / "data"
        / "arxiv_2026_11_alphaxiv"
        / "alphaxiv_78paper_conformal_copula_dfs_parlay_nfl_and_referee_vault_2026.json",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave45_alphaxiv_59new_conformal_copula_parlay_dfs_and_referee_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave45_skill_wopr_snap_continuity_props_and_milp_dfs_nfl_engine.py",
        REPO_ROOT
        / "docs"
        / "arxiv-program"
        / "research"
        / "2026-11-18"
        / (
            "deep-research-wave45-alphaxiv-78papers-conformal-copula-dfs-parlay"
            "-nfl-humility-and-picks-props-dfs-harmony.md"
        ),
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
