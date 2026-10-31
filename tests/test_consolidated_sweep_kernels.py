"""Unit tests for engine/kernels/consolidated_sweep_kernels.py."""
from __future__ import annotations

import math
from pathlib import Path
import pytest

from engine.kernels.consolidated_sweep_kernels import (
    load_consolidated_2026_pbp_metrics,
    compute_c281_tprr_yprr_composite,
    compute_c285_iterative_ridge_matchup_delta,
    compute_c287_wopr,
    compute_mockingboard_altitude,
    compute_c297_referee_crew_penalty_kernel,
    compute_c300_rynoonan_idp_tackles_kernel,
    compute_c316_havoc_rate_modifier,
    compute_patton_poe_p2s_mitigation,
    compute_coach_a_structural_coverage_modifiers,
    compute_ghatz_situational_epa_modifier,
    compute_locktalk_1q_script_stop_and_hfa,
    compute_locktalk_qb_vulture_goal_line_split,
    compute_whitebison_prop_calibration_blend,
)


def test_load_consolidated_2026_pbp_metrics_verified() -> None:
    metrics = load_consolidated_2026_pbp_metrics()
    assert metrics["total_pbp_rows"] == 18738
    assert metrics["total_ftn_rows"] == 18019
    assert len(metrics["teams"]) == 32
    assert 0.18 <= metrics["locktalk_1q_math_summary"]["q1_scoring_share_empirical"] <= 0.22


def test_c281_c287_and_altitude() -> None:
    c281 = compute_c281_tprr_yprr_composite(
        tprr=0.28, yprr=2.45, man_rate=0.35, yprr_vs_man=2.80, yprr_vs_zone=2.25
    )
    assert c281["c281_composite"] > 0.3885
    assert 1.0 < c281["share_multiplier"] <= 1.35

    wopr = compute_c287_wopr(target_share=0.28, air_yards_share=0.38)
    assert math.isclose(wopr, 1.5 * 0.28 + 0.7 * 0.38, rel_tol=1e-4)

    alt = compute_mockingboard_altitude(
        wopr=wopr,
        c281_composite=c281["c281_composite"],
        first_read_share=0.32,
        route_participation=0.92,
    )
    assert alt["altitude_score"] > 55.0
    assert 1.0 < alt["tilt_multiplier"] <= 1.08


def test_c285_c316_and_ghatz_from_real_pbp() -> None:
    metrics = load_consolidated_2026_pbp_metrics()
    ridge = compute_c285_iterative_ridge_matchup_delta("BUF", "CAR", metrics)
    assert -0.18 <= ridge["net_epa_delta"] <= 0.18

    havoc = compute_c316_havoc_rate_modifier("CAR", "GB", metrics)
    assert 0.82 <= havoc["disruption_mult"] <= 1.24
    assert 0.86 <= havoc["turnover_mult"] <= 1.18

    ghatz = compute_ghatz_situational_epa_modifier("BUF", "ARI", down=3, ydstogo=8, def_shell="man_blitz", metrics=metrics)
    assert -0.15 <= ghatz <= 0.15


def test_c297_and_c300_rynoonan_idp_kernel() -> None:
    ref = compute_c297_referee_crew_penalty_kernel(dpi_rate_mult=1.20, off_hold_rate_mult=1.15, home_bias_z=1.0, is_home_offense=True)
    assert ref["deep_shot_ev_delta_yds"] > 0.0
    assert ref["drive_stall_prob_delta"] > 0.0

    idp = compute_c300_rynoonan_idp_tackles_kernel(
        opp_rush_att_proj=29.0,
        opp_completions_proj=23.0,
        opp_sacks_proj=3.0,
        player_snap_share=0.96,
        tackle_efficiency_rate=0.165,
        box_alignment_mult=1.08,
        market_line=7.5,
        devig_over_prob=0.50,
    )
    assert idp["expected_tackles"] > 8.5
    assert idp["recommended_side"] == "OVER"
    assert idp["clears_c300_5pct_rule"] is True


def test_patton_and_coach_a_rules() -> None:
    patton = compute_patton_poe_p2s_mitigation(
        raw_pressure_prob=0.38, qb_fault_sack_share=0.10, screen_rate=0.15, rpo_rate=0.12, quick_game_rate=0.38
    )
    assert patton["mitigated_pressure_prob"] < patton["raw_pressure_prob"]

    bn = compute_coach_a_structural_coverage_modifiers(
        def_shell="sim_blitz", off_play="inside_zone", down=1, ydstogo=10
    )
    assert bn["sack_tfl_mult"] == pytest.approx(1.08, abs=1e-4)
    assert bn["explosive_mult"] <= 0.90

    qtrs = compute_coach_a_structural_coverage_modifiers(
        def_shell="two_high_quarters", off_play="deep_shot", down=2, ydstogo=8
    )
    assert qtrs["breakaway_mult"] < 0.85
    assert qtrs["short_gain_mult"] > 1.05


def test_locktalk_1q_math_conservation_and_qb_vulture() -> None:
    metrics = load_consolidated_2026_pbp_metrics()
    # Verify exact zero-sum HFA conservation across Q1..Q4
    q_tilts = [
        compute_locktalk_1q_script_stop_and_hfa("GB", "CAR", "GB", qtr=q, drive_num=1, full_game_hfa_pts=2.0, metrics=metrics)["per_snap_hfa_tilt_epa"]
        for q in (1, 2, 3, 4)
    ]
    assert q_tilts[0] > 0.0
    assert math.isclose(sum(q_tilts), 0.0, abs_tol=1e-4)

    # Verify QB vulture distinguishes Josh Allen (BUF) from Kirk Cousins (ATL) with k=10 inside-the-5 shrinkage
    buf_gl = compute_locktalk_qb_vulture_goal_line_split("BUF", yardline_100=2, metrics=metrics)
    atl_gl = compute_locktalk_qb_vulture_goal_line_split("ATL", yardline_100=2, metrics=metrics)
    assert buf_gl["qb_rush_share"] > 0.40
    assert atl_gl["qb_rush_share"] < 0.16
    assert math.isclose(buf_gl["qb_rush_share"] + buf_gl["rb_rush_share"], 1.0, abs_tol=1e-6)


def test_whitebison_prop_calibration_blend() -> None:
    blended = compute_whitebison_prop_calibration_blend(raw_mc_prob=0.70, devig_market_prob=0.50, prop_weight_model=0.55)
    assert math.isclose(blended, 0.55 * 0.70 + 0.45 * 0.50, rel_tol=1e-6)


def test_locktalk_qb_vulture_pocket_passer_shrinks_below_anchor() -> None:
    metrics = load_consolidated_2026_pbp_metrics()
    atl_yl1 = compute_locktalk_qb_vulture_goal_line_split("ATL", yardline_100=1, metrics=metrics)
    assert atl_yl1["qb_rush_share"] < 0.2879
    assert math.isclose(atl_yl1["qb_rush_share"] + atl_yl1["rb_rush_share"], 1.0, abs_tol=1e-6)


def test_team_to_qb_2026_matches_verified_week8_starters() -> None:
    from intelligence.coaching.qb_disguise_blitz_matrix import TEAM_TO_QB_2026, evaluate_qb_matchup_2x2

    expected_2026_starters = {
        "ARI": "Jacoby Brissett",
        "ATL": "Michael Penix Jr.",
        "CIN": "Joe Burrow",
        "LV": "Kirk Cousins",
        "MIA": "Malik Willis",
        "MIN": "Kyler Murray",
        "NO": "Tyler Shough",
        "NYG": "Jameis Winston",
        "NYJ": "Geno Smith",
        "PHI": "Tanner McKee",
        "SF": "Brock Purdy",
    }
    for tm, expected_qb in expected_2026_starters.items():
        assert TEAM_TO_QB_2026[tm] == expected_qb, f"{tm} mapped to {TEAM_TO_QB_2026.get(tm)} instead of {expected_qb}"
        res = evaluate_qb_matchup_2x2(tm, opp_disguise_rate=0.30, opp_blitz_rate=0.28)
        assert res["qb_name"] == expected_qb
        assert res["team"] == tm


def test_quarter_calibration_preserves_2026_empirical_shares_under_negative_delta() -> None:
    import numpy as np
    from scripts.ops import gse_coach_mind_simulator as sim

    sealed_obj, digest = sim.load_sealed_object_readonly()
    master = sim.load_master_w1_w7_tendencies()
    r = sim.simulate_matchup_pbp(
        "MIN",
        "DET",
        [],
        [],
        sealed_state=sealed_obj,
        expected_hash=digest,
        n_sims=2000,
        seed=903,
        w1_w7_override={"away": dict(master["MIN"]), "home": dict(master["DET"])},
        return_vectors=True,
        posted_home_spread=-3.0,
        posted_total=46.5,
    )
    v = r["vectors"]
    q1_mean = float(np.mean(v["away_q1"] + v["home_q1"]))
    q2_mean = float(np.mean(v["away_q2"] + v["home_q2"]))
    q3_mean = float(np.mean(v["away_q3"] + v["home_q3"]))
    q4_mean = float(np.mean(v["away_q4"] + v["home_q4"]))
    tot_mean = float(np.mean(v["total_pts_out"]))

    q1_share = q1_mean / tot_mean
    assert 0.175 <= q1_share <= 0.215, f"Q1 share {q1_share:.4f} outside 2026 empirical band [0.175, 0.215]"
    assert q1_mean < q2_mean, f"Inverted Q1 ({q1_mean:.2f}) >= Q2 ({q2_mean:.2f})"
    assert q1_mean < q4_mean, f"Inverted Q1 ({q1_mean:.2f}) >= Q4 ({q4_mean:.2f})"
    assert float(r["pathwise_conservation_residuals"]["max_residual"]) <= 1e-6


def test_week8_injury_latest_status_and_specialist_position_filters() -> None:
    import pandas as pd
    from scripts.ops.run_week8_slate import build_player_profiles, REPO_ROOT

    pw_df = pd.read_csv(REPO_ROOT / "data" / "nflverse" / "pennydata_2026_player_week_stats.csv")
    inj_df = pd.read_csv(REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv")
    db = build_player_profiles(pw_df, inj_df)
    pmap = db["players"]
    specs = db["specialists"]

    # Lamar Jackson, Emeka Egbuka, and Tyler Warren must NOT be marked Out in Week 8 due to Week 7 bleedover
    assert pmap["BAL:lamar jackson"]["is_out_w8"] is False
    assert pmap["TB:emeka egbuka"]["is_out_w8"] is False
    assert pmap["IND:tyler warren"]["is_out_w8"] is False

    # Every edge1 specialist must be a defensive front / edge player, never CB or S
    for tm, sp in specs.items():
        if sp.get("edge1") is not None:
            assert sp["edge1"]["position"] in ("DE", "OLB", "DL", "EDGE"), (
                f"{tm} edge1 {sp['edge1']['player_name']} has invalid position {sp['edge1']['position']}"
            )
        if sp.get("lb1") is not None:
            assert sp["lb1"]["position"] in ("LB", "ILB", "MLB", "OLB"), (
                f"{tm} lb1 {sp['lb1']['player_name']} has invalid position {sp['lb1']['position']}"
            )
    assert specs["PHI"]["rb1"]["player_name"] == "Saquon Barkley"


def test_stage_d_overlay_cap_and_prop_projection_no_saturation() -> None:
    import numpy as np
    from scripts.ops.run_week8_slate import project_player_prop_prob

    rng = np.random.default_rng(42)
    tm_pass = rng.normal(245.0, 42.0, size=5000)

    # Low-GP backup (GP=3) with outlier 2026 average (42.0 yds) vs DK line 12.5 must be shrunk strongly toward Layer-1 line
    backup_res = project_player_prop_prob(
        market="Receiving Yards",
        line=12.5,
        stat_pg=42.0,
        player_gp=3,
        position="WR",
        team_vec=tm_pass,
        team_baseline=245.0,
        overlay_log_odds_deltas=[0.08, 0.05],
        devig_over=0.50,
        devig_under=0.50,
    )
    assert backup_res["model_p"] < 0.60, f"Low-GP backup prop prob {backup_res['model_p']:.4f} was not shrunk"

    # Two distinct established starters (GP=7) with different residual strengths must NOT collapse to identical 0.5866
    p1 = project_player_prop_prob(
        market="Receiving Yards",
        line=64.5,
        stat_pg=82.0,
        player_gp=7,
        position="WR",
        team_vec=tm_pass,
        team_baseline=258.0,
        overlay_log_odds_deltas=[0.12, 0.06],
        devig_over=0.50,
        devig_under=0.50,
    )
    p2 = project_player_prop_prob(
        market="Receiving Yards",
        line=52.5,
        stat_pg=61.0,
        player_gp=7,
        position="WR",
        team_vec=tm_pass,
        team_baseline=250.0,
        overlay_log_odds_deltas=[0.06, 0.03],
        devig_over=0.50,
        devig_under=0.50,
    )
    assert abs(p1["model_p"] - p2["model_p"]) > 0.012
    assert abs(p1["model_p"] - 0.5866) > 0.002


def test_consume_oct30_signal_pack_real_data() -> None:
    from engine.kernels.consolidated_sweep_kernels import consume_oct30_signal_pack

    kc_vs_den = consume_oct30_signal_pack(
        off_team="KC",
        def_team="DEN",
        qb_name="Patrick Mahomes",
        rb_name="K.Walker",
    )
    assert abs(sum(kc_vs_den["s1_rz_xtd_share"].values()) - 1.0) <= 0.01
    assert abs(kc_vs_den["s1_rz_xtd_share"]["TE"] - 0.290) <= 0.005
    assert kc_vs_den["s2_def_missed_tackles"]["mtkl"] == 56.0
    assert kc_vs_den["s2_def_missed_tackles"]["rank_fewest"] == 32
    assert kc_vs_den["s2_def_missed_tackles"]["yac_hidden_yards_mult"] > 1.04

    det_def = consume_oct30_signal_pack(
        off_team="GB",
        def_team="DET",
        qb_name="Jordan Love",
        rb_name="J.Jacobs",
    )
    assert det_def["s2_def_missed_tackles"]["mtkl"] == 12.0
    assert det_def["s2_def_missed_tackles"]["rank_fewest"] == 1
    assert det_def["s2_def_missed_tackles"]["yac_hidden_yards_mult"] < 0.96

    den_vs_kc = consume_oct30_signal_pack(
        off_team="DEN",
        def_team="KC",
        qb_name="Bo Nix",
        rb_name="J.Dobbins",
    )
    assert abs(den_vs_kc["s3_qb_throwaway"]["thawy_per_dropback"] - 0.0969) <= 0.001
    assert abs(kc_vs_den["s4_rb_rushing_epa"]["epa_per_att"] - 0.096) <= 0.002
    assert kc_vs_den["s5_off_quadrant"]["quadrant"].startswith("Q1:")
    assert den_vs_kc["s5_off_quadrant"]["quadrant"].startswith("Q4:")
    assert abs(kc_vs_den["s6_def_quarter_epa"]["q1_epa_allowed"] - (-0.123)) <= 0.002
    assert kc_vs_den["s7_paired_flip_guard"]["paired_flip_enforced"] is True
    assert 1.30 <= kc_vs_den["s7_paired_flip_guard"]["contender_inflation_ratio"] <= 1.60


def test_compute_tau_hat_4th_down_coach_tax_simulation_consumer() -> None:
    import pytest
    from engine.kernels.consolidated_sweep_kernels import compute_tau_hat_4th_down_coach_tax

    res = compute_tau_hat_4th_down_coach_tax(
        team="BAL",
        season=2026,
        yardline_100=38,
        ydstogo=3,
        score_differential=-3,
        game_seconds_remaining=900,
        qtr=3,
        wp=0.45,
    )
    assert 0.20 <= res["tau_hat"] <= 0.80
    assert res["fallback_level"] in ("unit", "pooled", "league", "league_region")
    assert "walk-forward" in res["fit_stamp"]
    assert res["action_predicted"] in ("GO", "FGA", "PUNT")
    assert res["action_optimal"] in ("GO", "FGA", "PUNT")
    assert res["wp_gap"] >= -1e-9
    assert abs((res["wp_optimal"] - res["wp_behavior"]) - res["wp_gap"]) <= 1e-6
    if res["action_predicted"] == res["action_optimal"]:
        assert res["wp_gap"] == 0.0

    with pytest.raises(ValueError):
        compute_tau_hat_4th_down_coach_tax(
            team="BAL",
            season=2026,
            yardline_100=38,
            ydstogo=3,
            score_differential=-3,
            game_seconds_remaining=900,
            qtr=3,
            wp=0.50,
            is_stand_in_wp=True,
        )


def test_b4_hierarchical_fg_and_eq_physics_001_altitude_kernel() -> None:
    from engine.kernels.consolidated_sweep_kernels import (
        compute_b4_hierarchical_fg_make_prob,
        compute_eq_physics_001_ball_flight_modifier,
    )

    p30 = compute_b4_hierarchical_fg_make_prob(kick_distance_yds=30.0, elevation_ft=0.0, wind_mph=5.0, temp_f=65.0, is_dome=False)
    p45 = compute_b4_hierarchical_fg_make_prob(kick_distance_yds=45.0, elevation_ft=0.0, wind_mph=5.0, temp_f=65.0, is_dome=False)
    p55_sea = compute_b4_hierarchical_fg_make_prob(kick_distance_yds=55.0, elevation_ft=0.0, wind_mph=5.0, temp_f=65.0, is_dome=False)
    p55_den = compute_b4_hierarchical_fg_make_prob(kick_distance_yds=55.0, elevation_ft=5280.0, wind_mph=5.0, temp_f=65.0, is_dome=False)
    p55_wind = compute_b4_hierarchical_fg_make_prob(kick_distance_yds=55.0, elevation_ft=0.0, wind_mph=22.0, temp_f=38.0, is_dome=False)

    assert 0.94 <= p30 <= 0.99
    assert 0.76 <= p45 <= 0.84
    assert 0.56 <= p55_sea <= 0.66
    assert p55_den > p55_sea + 0.03
    assert p55_wind < p55_sea - 0.05

    phys_den = compute_eq_physics_001_ball_flight_modifier(elevation_ft=5280.0, temp_f=58.0, wind_mph=6.0, is_dome=False, qb_spin_rpm=620.0)
    phys_wind = compute_eq_physics_001_ball_flight_modifier(elevation_ft=100.0, temp_f=40.0, wind_mph=20.0, is_dome=False, qb_spin_rpm=510.0)
    assert phys_den["air_density_ratio"] < 0.86
    assert phys_den["fg_range_bonus_yds"] > 2.0
    assert phys_wind["deep_pass_completion_mult"] < phys_den["deep_pass_completion_mult"]


def test_b6_b9_ol_qb_pressure_sack_survival_attribution() -> None:
    from engine.kernels.consolidated_sweep_kernels import compute_b6_b9_ol_qb_pressure_sack_survival

    nix = compute_b6_b9_ol_qb_pressure_sack_survival(
        ol_pbwr=0.61,
        def_prwr=0.44,
        qb_time_to_throw_sec=2.78,
        qb_sack_per_dropback=9.0 / 227.0,
        qb_throwaway_per_dropback=0.0969,
    )
    watson = compute_b6_b9_ol_qb_pressure_sack_survival(
        ol_pbwr=0.55,
        def_prwr=0.44,
        qb_time_to_throw_sec=3.05,
        qb_sack_per_dropback=25.0 / 235.0,
        qb_throwaway_per_dropback=0.0128,
    )
    assert nix["throwaway_escape_prob_given_pressure"] > watson["throwaway_escape_prob_given_pressure"]
    assert watson["qb_sack_fault_share"] > nix["qb_sack_fault_share"]
    assert 0.02 <= nix["expected_sack_prob_per_dropback"] < watson["expected_sack_prob_per_dropback"]


def test_adaptive_conformal_interval_aci_and_nguyen_yurko_snap_timing() -> None:
    import numpy as np
    from engine.kernels.consolidated_sweep_kernels import (
        compute_adaptive_conformal_interval_aci,
        compute_nguyen_yurko_snap_timing_variance,
    )

    rng = np.random.default_rng(7)
    samples = rng.normal(24.0, 6.0, size=5000)
    aci_calm = compute_adaptive_conformal_interval_aci(
        sim_samples=samples,
        target_alpha=0.10,
        gamma_step=0.02,
        recent_errors=[0, 0, 0, 0, 0],
        dependence_slack=0.01,
    )
    aci_shock = compute_adaptive_conformal_interval_aci(
        sim_samples=samples,
        target_alpha=0.10,
        gamma_step=0.02,
        recent_errors=[1, 1, 1, 1, 1],
        dependence_slack=0.03,
    )
    assert aci_shock["width"] > aci_calm["width"]
    assert aci_shock["alpha_adapted"] < aci_calm["alpha_adapted"]

    timing = compute_nguyen_yurko_snap_timing_variance(
        motion_rate=0.68,
        neutral_pace_sec=26.2,
        qb_cadence_entropy=0.74,
    )
    assert timing["snap_timing_variance_mult"] > 1.0
    assert timing["def_pass_rush_jump_penalty"] < 0.0


def test_simulate_matchup_pbp_consumes_oct30_signal_pack_and_tau_hat() -> None:
    from scripts.ops.gse_coach_mind_simulator import (
        DEFAULT_SEALED_BASELINE,
        canonical_hash,
        freeze_deep,
        simulate_matchup_pbp,
    )

    sealed = freeze_deep(DEFAULT_SEALED_BASELINE)
    res = simulate_matchup_pbp(
        sealed_state=sealed,
        expected_hash=canonical_hash(sealed),
        away="KC",
        home="DEN",
        away_inj=[],
        home_inj=[],
        n_sims=400,
        seed=42,
    )
    csk = res["consolidated_sweep_kernels"]
    assert "oct30_signal_pack_away" in csk
    assert "oct30_signal_pack_home" in csk
    assert csk["oct30_signal_pack_away"]["s2_def_missed_tackles"]["mtkl"] == 56.0
    assert "tau_hat_4th_down_away" in csk
    assert "tau_hat_4th_down_home" in csk
    assert "walk-forward" in csk["tau_hat_4th_down_away"]["fit_stamp"]
    assert csk["physics_ball_flight"]["fg_range_bonus_yds"] > 2.0
    assert "b6_b9_survival_away" in csk
    assert "aci_conformal_margin" in csk
    assert csk["aci_conformal_margin"]["width"] > 0.0
    assert csk["aci_conformal_margin"]["role"] == "drift_monitor_only"
    assert "romano_cqr_margin" in csk
    assert csk["romano_cqr_margin"]["r1_separate_quote"] is True
    assert "barber_weighted_margin" in csk
    assert "argon_rk4_magnus" in csk
    assert "move37_discrete_sindy" in csk
    assert "gelman_vehtari_process_gate" in csk


def test_wave2_romano_cqr_barber_weighted_and_process_gates() -> None:
    import numpy as np
    from engine.kernels.consolidated_sweep_kernels import (
        assert_gelman_vehtari_process_gates,
        compute_barber_weighted_conformal_interval,
        compute_romano_cqr_honest_interval,
    )

    rng = np.random.default_rng(123)
    cal_y = rng.normal(24.0, 6.5, size=250)
    cal_q_lo = np.full(250, 14.5)
    cal_q_hi = np.full(250, 33.5)

    cqr = compute_romano_cqr_honest_interval(
        pred_q_lo=15.0,
        pred_q_hi=33.0,
        cal_y=cal_y,
        cal_q_lo=cal_q_lo,
        cal_q_hi=cal_q_hi,
        alpha=0.10,
    )
    assert cqr["lower"] < 15.5
    assert cqr["upper"] > 32.5
    assert cqr["width"] == pytest.approx(cqr["upper"] - cqr["lower"])
    assert cqr["r1_separate_quote"] is True
    assert cqr["method"] == "Romano_et_al_2019_CQR_1905.03222"

    bw = compute_barber_weighted_conformal_interval(
        pred_center=24.0,
        cal_residuals=np.abs(cal_y - 24.0),
        decay_rho=0.96,
        alpha=0.10,
    )
    assert bw["lower"] < 24.0 < bw["upper"]
    assert bw["r1_separate_quote"] is True
    assert bw["effective_sample_size"] > 10.0

    gate_ok = assert_gelman_vehtari_process_gates(
        r_hat_max=1.004,
        ess_bulk_min=620.0,
        ess_tail_min=480.0,
        num_divergences=0,
        raw_vi_interval_used=False,
    )
    assert gate_ok["promotion_gate_passed"] is True
    with pytest.raises(ValueError, match="raw VI intervals are banned"):
        assert_gelman_vehtari_process_gates(
            r_hat_max=1.004,
            ess_bulk_min=620.0,
            ess_tail_min=480.0,
            num_divergences=0,
            raw_vi_interval_used=True,
        )


def test_wave2_argon_rk4_magnus_and_move37_discrete_sindy() -> None:
    import numpy as np
    from engine.kernels.consolidated_sweep_kernels import (
        compute_argon_rk4_magnus_ball_flight,
        compute_move37_discrete_sindy_team_state,
    )

    sea_level = compute_argon_rk4_magnus_ball_flight(
        v0_mps=29.5,
        launch_angle_deg=31.0,
        spin_rpm=1850.0,
        altitude_ft=0.0,
        wind_mph=0.0,
        temp_f=70.0,
    )
    denver = compute_argon_rk4_magnus_ball_flight(
        v0_mps=29.5,
        launch_angle_deg=31.0,
        spin_rpm=1850.0,
        altitude_ft=5280.0,
        wind_mph=0.0,
        temp_f=70.0,
    )
    assert denver["carry_yards"] > sea_level["carry_yards"] + 1.5
    assert denver["grossmann_cost_accuracy_gate_passed"] is True

    with pytest.raises(RuntimeError, match="PINN arm is BLOCKED pending a Part II dossier"):
        compute_argon_rk4_magnus_ball_flight(
            v0_mps=29.5,
            launch_angle_deg=31.0,
            spin_rpm=1850.0,
            altitude_ft=0.0,
            pinn_forward_arm=True,
        )

    # Planted discrete dynamical system for MOVE-37 SINDy test
    rng = np.random.default_rng(99)
    T = 40
    X = np.zeros((T, 2), dtype=float)
    X[0] = [0.25, -0.15]
    for t in range(T - 1):
        X[t + 1, 0] = 0.82 * X[t, 0] - 0.18 * X[t, 1] + rng.normal(0.0, 0.003)
        X[t + 1, 1] = 0.12 * X[t, 0] + 0.76 * X[t, 1] + rng.normal(0.0, 0.003)

    sindy = compute_move37_discrete_sindy_team_state(
        state_panel=X,
        threshold_lambda=0.04,
    )
    assert sindy["planted_law_gate_passed"] is True
    assert sindy["planted_true_support_recall"] >= 0.80
    assert sindy["planted_false_discovery_rate"] <= 0.10
    assert sindy["oos_beats_ridge_persistence"] is True





