"""Unit tests for intelligence/coaching/pm_sweep_convergence_kernels.py."""

from __future__ import annotations

import math
from pathlib import Path
import sys

import numpy as np
import pytest

_REPO_ROOT = str(Path(__file__).resolve().parents[1])
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from intelligence.coaching.pm_sweep_convergence_kernels import (
    COVERAGE_SHELL_NAMES,
    EMPIRICAL_COACH_GO_COMPLIANCE,
    LEAGUE_INT_PER_TWP_PRIOR,
    PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING,
    SIGNAL_PACK_MISSED_TACKLES_2026,
    SIGNAL_PACK_QUALIFIED_RB_BENCHMARK_COUNT,
    SUMERSPORTS_JSN_2026_BENCHMARK,
    SUMERSPORTS_LAR_UNDERVALUATION_2026,
    TAU_WALKFORWARD_ACC_DELTA,
    TIMO_BEHIND_LOS_INFLATION_RATIO,
    TIMO_OL_PRESSURE_WEIGHT,
    TIMO_QB_P2S_WEIGHT,
    VERIFIED_PFR_THROWAWAY_RATES_2026,
    coach_fourth_down_behavioral_fork,
    eb_interception_catch_rate_shrinkage,
    hierarchical_fg_make_prob,
    multilevel_snap_timing_cadence_penalty,
    predict_presnap_coverage_shell,
    qb_breakdown_convergence_kernel,
    trench_stuff_and_fractional_tackles,
)


def test_qb_breakdown_convergence_kernel_weights_and_throwaway_table() -> None:
    assert TIMO_OL_PRESSURE_WEIGHT == pytest.approx(0.72, abs=1e-6)
    assert TIMO_QB_P2S_WEIGHT == pytest.approx(0.68, abs=1e-6)
    assert TIMO_BEHIND_LOS_INFLATION_RATIO == pytest.approx(0.4370 / 0.3211, rel=1e-5)

    # Verified PFR throwaway rates from 7-Signal Pack
    assert VERIFIED_PFR_THROWAWAY_RATES_2026["Bo Nix"] == pytest.approx(0.097, abs=1e-6)
    assert VERIFIED_PFR_THROWAWAY_RATES_2026["Bryce Young"] == pytest.approx(0.094, abs=1e-6)
    assert VERIFIED_PFR_THROWAWAY_RATES_2026["Jayden Daniels"] == pytest.approx(0.079, abs=1e-6)

    nix = qb_breakdown_convergence_kernel(
        ol_pressure_rate=0.32,
        qb_self_pressure_rate=0.20,
        qb_fault_p2s_rate=0.18,
        ol_leak_p2s_rate=0.14,
        time_to_throw_sec=2.72,
        scramble_rate_under_pressure=0.19,
        sack_rate_under_pressure=0.13,
        behind_los_screen_share=0.15,
        qb_name="Bo Nix",
    )
    assert nix["pfr_throwaway_rate"] == pytest.approx(0.097, abs=1e-6)
    assert nix["non_screen_throwaway_rate"] > nix["pfr_throwaway_rate"]
    assert nix["non_screen_pressure_rate"] > nix["attributed_pressure_rate"]
    assert nix["scrack_signed"] > 0.0
    assert 0.5 < nix["scrack_index"] <= 1.0
    assert 0.0 < nix["clean_pocket_survival"] < 1.0
    assert 0.0 < nix["ngs_continuous_pressure_prob"] < 1.0

    # Vectorized time-to-throw monotonically increases continuous pressure hazard
    ttt_vec = np.array([2.0, 2.5, 3.0, 3.5])
    vec_res = qb_breakdown_convergence_kernel(time_to_throw_sec=ttt_vec, qb_name="Jayden Daniels")
    surv = vec_res["clean_pocket_survival"]
    haz = vec_res["instantaneous_pressure_hazard"]
    ngs_p = vec_res["ngs_continuous_pressure_prob"]
    assert surv.shape == (4,)
    assert np.all(np.diff(surv) < 0.0)
    assert np.all(np.diff(haz) > 0.0)
    assert np.all(np.diff(ngs_p) > 0.0)


def test_predict_presnap_coverage_shell_lockdown_cb_jsn_and_rams() -> None:
    # Verify PFF 2026 Lockdown Man CB registry
    assert PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING["Travis Hunter (JAX)"] == pytest.approx(0.0)
    assert PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING["Trent McDuffie (LAR)"] == pytest.approx(2.8)
    assert PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING["Dee Alford (BUF)"] == pytest.approx(20.0)
    assert PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING["Daylen Everette (PIT)"] == pytest.approx(25.7)
    assert PFF_2026_MAN_LOCKDOWN_CB_PASSER_RATING["Jourdan Lewis (JAX)"] == pytest.approx(35.0)

    # 3rd & short vs Travis Hunter in man-heavy spot
    res_hunter = predict_presnap_coverage_shell(
        down=3,
        ydstogo=2.0,
        personnel="12",
        motion_at_snap=False,
        score_diff=3.0,
        def_cover1_base_rate=0.34,
        primary_cb_name="Travis Hunter (JAX)",
    )
    probs = res_hunter["shell_probabilities"]
    assert set(probs.keys()) == set(COVERAGE_SHELL_NAMES)
    assert math.isclose(sum(probs.values()), 1.0, abs_tol=1e-6)
    assert math.isclose(
        res_hunter["man_coverage_prob"] + res_hunter["zone_coverage_prob"], 1.0, abs_tol=1e-6
    )
    assert res_hunter["is_pff_lockdown_man_cb"] is True
    assert res_hunter["man_target_suppression_mult"] < 0.85
    assert res_hunter["man_yprr_suppression_mult"] < 0.82

    # SumerSports JSN elite dominance multiplier & LA Rams undervaluation spot
    assert SUMERSPORTS_JSN_2026_BENCHMARK["target_share"] == pytest.approx(0.353)
    assert SUMERSPORTS_JSN_2026_BENCHMARK["air_yards_share"] == pytest.approx(0.443)
    assert SUMERSPORTS_JSN_2026_BENCHMARK["epa_per_target"] == pytest.approx(0.53)
    assert SUMERSPORTS_LAR_UNDERVALUATION_2026["net_epa_rank"] == 5
    assert SUMERSPORTS_LAR_UNDERVALUATION_2026["expected_win_rate"] == pytest.approx(0.69)

    res_jsn = predict_presnap_coverage_shell(
        down=2,
        ydstogo=8.0,
        personnel="11",
        motion_at_snap=True,
        score_diff=-10.0,
        receiver_name="Jaxon Smith-Njigba",
        receiver_target_share=0.353,
        receiver_air_yards_share=0.443,
        receiver_epa_per_target=0.53,
        team_abbr="LAR",
    )
    assert res_jsn["jsn_dominance_multiplier"] > 1.08
    assert res_jsn["is_rams_undervaluation_spot"] is True
    assert res_jsn["rams_pythagorean_win_gap"] == pytest.approx(0.69 - 3.0 / 7.0, abs=1e-6)


def test_hierarchical_fg_make_prob_exact_calibration_and_physics() -> None:
    # Exact neutral benchmarks: 97% at 30 yds, 80% at 45 yds, 61% at 55 yds
    fg30 = hierarchical_fg_make_prob(30.0)
    fg45 = hierarchical_fg_make_prob(45.0)
    fg55 = hierarchical_fg_make_prob(55.0)
    assert fg30["fg_make_prob"] == pytest.approx(0.97, abs=1e-4)
    assert fg45["fg_make_prob"] == pytest.approx(0.80, abs=1e-4)
    assert fg55["fg_make_prob"] == pytest.approx(0.61, abs=1e-4)

    # Denver altitude (5,280 ft) increases 55-yd FG probability via EQ-PHYSICS-001 drag reduction
    fg55_den = hierarchical_fg_make_prob(55.0, altitude_ft=5280.0)
    assert fg55_den["drag_reduction_frac"] == pytest.approx(1.0 - math.exp(-5280.0 / 27800.0), abs=1e-5)
    assert fg55_den["fg_make_prob"] > fg55["fg_make_prob"] + 0.04

    # High wind (20 mph) & freezing temp (25°F) outdoors lowers make probability vs dome
    fg52_wind = hierarchical_fg_make_prob(52.0, wind_mph=20.0, temp_f=25.0, is_dome=False)
    fg52_dome = hierarchical_fg_make_prob(52.0, wind_mph=20.0, temp_f=25.0, is_dome=True)
    assert fg52_wind["fg_make_prob"] < fg52_dome["fg_make_prob"] - 0.10


def test_coach_fourth_down_behavioral_fork_29pct_compliance_and_tau() -> None:
    assert EMPIRICAL_COACH_GO_COMPLIANCE == pytest.approx(0.29, abs=1e-6)
    assert TAU_WALKFORWARD_ACC_DELTA == pytest.approx(0.111585, abs=1e-6)

    # Spot where GO is WP-optimal (+4.5% over FG), but average coach (tau_hat=0) kicks FG
    fork_avg = coach_fourth_down_behavioral_fork(
        wp_go=0.585,
        wp_fg=0.540,
        wp_punt=0.470,
        coach_tau_hat=0.0,
        yardline_100=28,
        ydstogo=3,
    )
    assert fork_avg["prescriptive_optimal_action"] == "GO"
    assert fork_avg["action_predicted"] == "FG"
    assert 0.20 <= fork_avg["coach_go_prob"] <= 0.40
    assert fork_avg["wp_gap"] > 0.0

    # Aggressive coach (high positive tau_hat) flips predicted action to GO and narrows wp_gap
    fork_agg = coach_fourth_down_behavioral_fork(
        wp_go=0.585,
        wp_fg=0.540,
        wp_punt=0.470,
        coach_tau_hat=0.32,
        yardline_100=28,
        ydstogo=3,
    )
    assert fork_agg["action_predicted"] == "GO"
    assert fork_agg["coach_go_prob"] > fork_avg["coach_go_prob"]
    assert fork_agg["wp_gap"] < fork_avg["wp_gap"]


def test_eb_interception_shrinkage_and_multilevel_snap_timing() -> None:
    assert LEAGUE_INT_PER_TWP_PRIOR == pytest.approx(0.52, abs=1e-6)

    # Denver benchmark: 13 INTs on 17 TWP (~76.5% / 77%) shrinks to ~55%
    den_eb = eb_interception_catch_rate_shrinkage(13, 17)
    assert den_eb["raw_int_catch_rate"] == pytest.approx(13.0 / 17.0, abs=1e-5)
    assert 0.54 <= den_eb["eb_shrunk_int_catch_rate"] <= 0.56
    assert den_eb["expected_rate_regression_delta"] < -0.20

    # Nguyen & Yurko (CMU arXiv:2502.16313) silent road count penalty vs home high-variance cadence
    home_cadence = multilevel_snap_timing_cadence_penalty(
        qb_cadence_sd_sec=0.44,
        is_silent_road_count=False,
        crowd_noise_db=82.0,
    )
    road_silent = multilevel_snap_timing_cadence_penalty(
        qb_cadence_sd_sec=0.34,
        is_silent_road_count=True,
        crowd_noise_db=106.0,
    )
    assert home_cadence["c248_getoff_delta_sec"] > 0.0  # Freezes pass rushers
    assert road_silent["c248_getoff_delta_sec"] < 0.0   # Edge rushers jump snap faster
    assert road_silent["adjusted_edge_getoff_sec"] < home_cadence["adjusted_edge_getoff_sec"]
    assert road_silent["pressure_disruption_mult"] > home_cadence["pressure_disruption_mult"]
    assert road_silent["false_start_prob_per_snap"] > home_cadence["false_start_prob_per_snap"]


def test_trench_stuff_and_fractional_tackles_b12_and_signal_pack() -> None:
    assert SIGNAL_PACK_MISSED_TACKLES_2026["DET"] == 12
    assert SIGNAL_PACK_MISSED_TACKLES_2026["PHI"] == 49
    assert SIGNAL_PACK_MISSED_TACKLES_2026["CLE"] == 51
    assert SIGNAL_PACK_MISSED_TACKLES_2026["DEN"] == 56
    assert SIGNAL_PACK_QUALIFIED_RB_BENCHMARK_COUNT == 39

    carries = [-2.0, 0.0, 3.0, 4.0, 5.0, 12.0, 18.0, 1.0, -1.0, 6.0]
    det_res = trench_stuff_and_fractional_tackles(
        carries,
        ball_carrier_mass_kg=100.0,
        pre_contact_speed_mps=7.0,
        defender_speed_drops_mps=[4.0, 2.0, 1.0],
        def_team_abbr="DET",
    )
    den_res = trench_stuff_and_fractional_tackles(
        carries,
        ball_carrier_mass_kg=100.0,
        pre_contact_speed_mps=7.0,
        defender_speed_drops_mps=[4.0, 2.0, 1.0],
        def_team_abbr="DEN",
    )
    assert det_res["stuff_rate"] == pytest.approx(0.30, abs=1e-6)
    assert det_res["explosive_run_rate"] == pytest.approx(0.20, abs=1e-6)
    assert det_res["fractional_tackle_sum"] == pytest.approx(1.0, abs=1e-6)
    assert np.allclose(det_res["fractional_tackle_credits"], [4 / 7, 2 / 7, 1 / 7])
    assert det_res["missed_tackle_yac_multiplier"] < 1.0
    assert den_res["missed_tackle_yac_multiplier"] > 1.10


def test_wr_360_all_metrics_kernel_garrett_wilson_vs_zay_flowers() -> None:
    from intelligence.coaching.pm_sweep_convergence_kernels import wr_360_all_metrics_kernel

    # Garrett Wilson (NYJ vs LV): TE_MIDDLE_SEAM_FUNNEL (28.6% TE share allowed),
    # 64.7% open target rate, 7.92 n_eff_receivers dispersion, 9.1 mph MetLife wind,
    # NYJ projected positive script margin (+9.48 internal), 8.27% OL sack rate allowed
    gw = wr_360_all_metrics_kernel(
        neutral_pass_rate_pct=51.0,
        proe_pct=-2.64,
        motion_pct=48.3,
        play_action_pct=19.7,
        sequence_predictability_flag=True,
        ol_sack_rate_allowed_pct=8.27,
        dl_unblitzed_disruption_pct=16.0,
        qb_fault_sack_share_pct=0.0,
        time_to_pressure_sec=2.48,
        route_stem_time_sec=2.45,
        def_funnel_classification="TE_MIDDLE_SEAM_FUNNEL",
        def_wr_target_share_allowed_pct=58.1,
        def_te_target_share_allowed_pct=28.6,
        def_epa_rank=23,
        def_missed_tackles_w1_w7=46,
        def_yac_allowed_per_comp=6.05,
        motion_plus_pa_epa_beater=0.212,
        off_neutral_sec_per_snap=27.8,
        opp_neutral_sec_per_snap=24.8,
        off_plays_per_game=60.3,
        projected_spread_margin=9.48,
        wind_mph=9.1,
        temp_f=58.0,
        is_dome=False,
        recent_snap_pct=0.85,
        route_participation_pct=0.91,
        target_share_pct=25.9,
        n_eff_receivers=7.92,
        adot_yds=10.8,
        air_yards_share_pct=35.1,
        open_target_rate_pct=64.7,
        catchable_target_rate_pct=80.4,
        contested_catch_rate_pct=50.0,
        yprr_vs_man=2.08,
        yprr_vs_zone=1.88,
        opp_man_coverage_pct=22.4,
        wr_dvoa_pct=-2.1,
        horizontal_cross_speed_mph=18.4,
        season_fppg=15.1,
        season_xfppg=16.2,
        base_rec_yards_mean=63.4,
        base_receptions_mean=5.1,
    )
    assert gw["wopr"] == pytest.approx(1.5 * 0.259 + 0.7 * 0.351, abs=1e-4)
    assert gw["env_yards_delta"] < 0.0  # 9.1 mph wind > 8.0 mph threshold
    assert gw["funnel_wr_mult"] < 1.0   # LV TE_MIDDLE_SEAM_FUNNEL taxes outside WR share
    assert gw["yac_tackling_mult"] > 1.05  # LV 46 missed tackles & 6.05 YAC/comp boosts YAC
    assert 52.0 <= gw["adjusted_rec_yards"] <= 62.5
    assert 4.2 <= gw["adjusted_receptions"] <= 5.2

