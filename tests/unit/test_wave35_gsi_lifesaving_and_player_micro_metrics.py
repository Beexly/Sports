"""Wave 35 unit tests: GSI life-saving phase physics & GSE granular player-matchup engine."""

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
from gse_engine.compute.wave32_unified_sports_situational_live_fusion import (
    optimize_all_2026_player_and_settled_projections,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    _FORBIDDEN_ODDS_RE,
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.multisport.daily_multisport_slate_engine import (
    run_all_sports_unified_situational_simulation_suite,
)
from gse_engine.observability.walk_forward_ablation import (
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science import (
    CLINICAL_RUO_SPORTS_WEIGHT,
    WAVE35_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_cte_subconcussive_waveguide,
    evaluate_gsi_koopman_cardiac_and_wbgt_autonomic_safety,
    evaluate_gsi_longitudinal_injury_and_tissue_mechanics,
    evaluate_wave35_gsi_safety_and_skill_channels,
)
from gse_engine.science.wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine import (
    CteHitImpulse,
)
from gse_engine.tracking import (
    WAVE35_TRACKING_RLVR_TRAJECTORIES,
    evaluate_dated_csv_and_live_ast_equations,
    evaluate_qb_air_yards_and_catchable_accuracy,
    evaluate_rb_speed_elusiveness_vs_lb_gap_fill,
    evaluate_wave35_player_micro_matchup_suite,
    evaluate_wr_separation_vs_db_coverage,
    run_wave35_gsi_and_micro_metrics_benchmark,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_gsi_cte_waveguide_koopman_ecg_wbgt_and_six_skill_channels(tmp_path: Path) -> None:
    """Verify Prony/Ogden CTE hysteresis, 10Hz kinematics, 500Hz ECG & 15,400-row tissue."""
    hurryup = evaluate_gsi_cte_subconcussive_waveguide(
        [
            CteHitImpulse(0.0, 26.0, 2200.0, 38.0, 0.72),
            CteHitImpulse(35.0, 30.0, 2700.0, 48.0, 0.85),
            CteHitImpulse(70.0, 32.0, 2950.0, 56.0, 0.92),
        ],
        repo_root=REPO_ROOT,
    )
    rested = evaluate_gsi_cte_subconcussive_waveguide(
        [
            CteHitImpulse(0.0, 26.0, 2200.0, 38.0, 0.72),
            CteHitImpulse(300.0, 30.0, 2700.0, 48.0, 0.85),
            CteHitImpulse(600.0, 32.0, 2950.0, 56.0, 0.92),
        ],
        repo_root=REPO_ROOT,
    )
    assert float(hurryup["sulcal_waveguide_stress_kpa"]) > float(
        rested["sulcal_waveguide_stress_kpa"]
    )
    assert float(hurryup["sulcal_waveguide_stress_kpa"]) > 40.0
    assert float(rested["sulcal_waveguide_stress_kpa"]) < 35.0
    assert hurryup["adr0003_rule_in_only_doctrine"] is True
    assert float(hurryup["clinical_ruo_sports_weight"]) == 0.0
    assert CLINICAL_RUO_SPORTS_WEIGHT == 0.0
    assert int(hurryup["nfl_10hz_kinematics_binary"]["kin_frames_10hz"]) == 175
    assert hurryup["nfl_10hz_kinematics_binary"]["kin_stream_loaded"] is True

    cardiac = evaluate_gsi_koopman_cardiac_and_wbgt_autonomic_safety(
        temp_f=91.0, humidity_pct=78.0, altitude_ft=5280.0, is_indoor=False, repo_root=REPO_ROOT
    )
    assert cardiac["ecg_stream_loaded"] is True
    assert int(cardiac["ecg_frames_500hz"]) == 500
    assert float(cardiac["koopman_spectral_radius"]) > 0.9
    assert float(cardiac["navier_stokes_phase_resultant_r"]) > 0.0
    assert float(cardiac["wbgt_celsius"]) > 27.8
    assert cardiac["exertional_heat_cardiac_protocol_flag"] is True
    assert float(cardiac["altitude_po2_ratio"]) < 0.85

    tis_buf = evaluate_gsi_longitudinal_injury_and_tissue_mechanics(
        team="CIN", home_team="BUF", as_of_week=10, repo_root=REPO_ROOT
    )
    tis_den = evaluate_gsi_longitudinal_injury_and_tissue_mechanics(
        team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert int(tis_buf["total_longitudinal_rows_scanned"]) == 15400
    assert tis_buf["is_artificial_turf"] is True
    assert float(tis_buf["turf_torque_multiplier"]) == 1.18
    assert tis_den["is_artificial_turf"] is False
    assert float(tis_den["turf_torque_multiplier"]) == 1.0

    ch = tis_buf["team_six_skill_channels"]
    assert len(ch) == 6
    for k in (
        "burst_speed_to_los_mult",
        "lateral_cut_separation_mult",
        "deep_ball_velocity_air_yds_mult",
        "contact_elusiveness_mult",
        "gap_fill_leverage_mult",
    ):
        assert 0.5 < float(ch[k]) <= 1.0
    assert 1.0 <= float(ch["ball_security_fumble_hazard_mult"]) <= 1.35

    gsi = evaluate_wave35_gsi_safety_and_skill_channels(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert gsi["cte_inter_impact_hysteresis_verified"] is True
    assert gsi["adr0003_rule_in_only_doctrine"] is True
    assert gsi["real_money_stake_cleared"] is False

    # Clean-checkout fallback with missing data files must execute deterministically
    fallback = evaluate_wave35_gsi_safety_and_skill_channels(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=tmp_path
    )
    assert fallback["wired"] is True
    assert int(fallback["away_tissue_channels"]["total_longitudinal_rows_scanned"]) == 0
    assert int(fallback["cardiac_and_wbgt_autonomic"]["ecg_frames_500hz"]) == 64


def test_gse_causal_micro_metrics_csv_gate_and_live_honest_asts() -> None:
    """Verify causal RB speed/gap-fill, QB catchable/air, WR/DB separation, CSV & ASTs."""
    rb_lb = evaluate_rb_speed_elusiveness_vs_lb_gap_fill(
        away_team="CIN", home_team="BUF", as_of_week=10, repo_root=REPO_ROOT
    )
    assert 1.8 <= float(rb_lb["away_rb_time_to_los_sec"]) <= 3.6
    assert 1.8 <= float(rb_lb["home_rb_time_to_los_sec"]) <= 3.6
    assert float(rb_lb["home_rb_ryoe_per_att"]) > 0.0
    assert 0.01 <= float(rb_lb["away_rb_elusiveness_brk_tkl_rate"]) <= 0.30
    gap_map = rb_lb["home_def_by_gap_fill_pct"]
    for lane in ("middle", "guard", "tackle", "end"):
        assert 0.2 <= float(gap_map[lane]) <= 0.8

    qb_cat = evaluate_qb_air_yards_and_catchable_accuracy(
        away_team="CIN", home_team="BUF", as_of_week=10, repo_root=REPO_ROOT
    )
    assert 0.50 <= float(qb_cat["away"]["catchable_balls_per_attempt"]) <= 0.88
    assert 0.50 <= float(qb_cat["home"]["catchable_balls_per_attempt"]) <= 0.88
    assert float(qb_cat["away"]["mean_intended_air_yards"]) > 4.0

    wr_db = evaluate_wr_separation_vs_db_coverage(
        away_team="CIN", home_team="BUF", as_of_week=10, repo_root=REPO_ROOT
    )
    assert 1.5 <= float(wr_db["away_wr_vs_home_db"]["wr_avg_separation_yds"]) <= 5.0
    assert 1.5 <= float(wr_db["home_wr_vs_away_db"]["wr_avg_separation_yds"]) <= 5.0
    assert float(wr_db["home_wr_vs_away_db"]["opp_db_yds_per_tgt_allowed"]) > 5.0
    assert int(wr_db["participation_plays_indexed"]) == 45184
    assert int(wr_db["bdb26_sumer_defender_rows"]) == 173150

    ast_w3 = evaluate_dated_csv_and_live_ast_equations(
        away_team="KC", home_team="DEN", as_of_week=3, repo_root=REPO_ROOT
    )
    ast_w10 = evaluate_dated_csv_and_live_ast_equations(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    assert int(ast_w3["docs_csv_files_causal_pre_asof"]) == 247
    assert int(ast_w10["docs_csv_files_causal_pre_asof"]) == 2221
    assert int(ast_w3["docs_csv_files_causal_pre_asof"]) < int(
        ast_w10["docs_csv_files_causal_pre_asof"]
    )
    assert int(ast_w10["docs_csv_files_total"]) == 2584
    assert int(ast_w10["parsed_evaluated_count"]) == 6
    assert ast_w10["zero_fabricated_bindings"] is True
    for eq in ast_w10["equations_evaluated"]:
        assert eq["status"] == "PARSED_EVALUATED"


def test_cwd_invariance_warm_sla_spine_wiring_and_wk11_hold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify CWD independence, <0.05s warm SLA, Stage-2/3 wiring & Week 11 simulation hold."""
    monkeypatch.chdir(tmp_path)
    _ = evaluate_wave35_gsi_safety_and_skill_channels(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    _ = evaluate_wave35_player_micro_matchup_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )

    t0 = time.perf_counter()
    gsi_w = evaluate_wave35_gsi_safety_and_skill_channels(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    w35_w = evaluate_wave35_player_micro_matchup_suite(
        away_team="KC", home_team="DEN", as_of_week=10, repo_root=REPO_ROOT
    )
    elapsed = time.perf_counter() - t0
    assert elapsed < 0.05
    assert gsi_w["wired"] is True
    assert w35_w["wired"] is True

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
        env_cfg={"is_indoor": False, "wind_mph": 20.0},
    )
    verif = assert_all_books_pdfs_ig_x_situational_wired(compiled)
    assert verif["wave35_gsi_and_micro_wired"] is True

    pre_p = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="ARI", home_team="DEN", context={"is_indoor": False, "wind_mph": 20.0}
    )
    assert (
        pre_p["simulation_trajectory_conditioners"]["wave35_gsi_safety_and_micro_metrics_coupled"]
        is True
    )

    with pytest.raises(OperatorSimulationHoldError):
        run_all_sports_unified_situational_simulation_suite(
            n_worlds=100, seed=20261117, nfl_historical_week=11
        )


def test_wave35_oos_player_147_ablation_rlvr_276_and_hygiene() -> None:
    """Verify improved OOS player MAEs, 147-game close-beating, 252+24 RLVR & clean hygiene."""
    p_opt = optimize_all_2026_player_and_settled_projections(REPO_ROOT)
    assert float(p_opt["qb_passing_yards"]["eb_opt_mae"]) <= 56.70
    assert float(p_opt["rb_rushing_yards"]["eb_opt_mae"]) <= 24.40
    assert float(p_opt["skill_players_combined"]["eb_opt_mae"]) <= 24.75
    assert p_opt["floors_verification"]["all_player_floors_held"] is True

    ab = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    m = ab["metrics"]
    w26 = ab["wave26_rliable_and_ratchet"]
    assert float(m["benchmark_7109_closing_adjusted_crps"]) <= 7.0800
    assert float(m["gse_v41_margin_mae"]) <= 9.7500
    assert float(m["gse_v41_brier"]) <= 0.21970
    assert float(m["overall_ece"]) < float(m["closing_market_overall_ece"])
    assert float(w26["fwl_partial_slope"]) >= 1.410
    assert w26["wave19_21_floors"]["all_floors_held"] is True

    bench35 = run_wave35_gsi_and_micro_metrics_benchmark(REPO_ROOT, write_artifact=False)
    assert bench35["real_money_stake_cleared"] is False
    assert float(bench35["live_stake_fraction"]) == 0.0
    assert len(bench35["benchmark_sha256"]) == 64

    assert len(WAVE35_GSI_RLVR_TRAJECTORIES) == 3
    assert len(WAVE35_TRACKING_RLVR_TRAJECTORIES) == 7
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert int(rlvr["records_compiled"]) >= 252
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 252
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = (
        REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    )
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 276

    hygiene_paths = (
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "science"
        / "wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "tracking"
        / "wave35_player_micro_metrics_and_matchup_physics_engine.py",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-17"
        / "deep-research-wave35-gsi-lifesaving-phase-physics-and-granular-player-matchup-engine.md",
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
