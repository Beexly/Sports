from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from research.hypotheses.multi_game_glycogen_and_pinn_sandbox import (
    RESEARCH_SANDBOX_QUARANTINED,
    MultiGameGlycogenDepletionEngine,
    compute_alam_football_crosswind_drag,
    compute_chitturi_route_disturbance_score,
    compute_elbo_and_ornstein_uhlenbeck_sgd_posterior_variance,
    compute_kent_cleat_surface_entrapment,
    compute_mallat_scattering_intermittency_residual,
    compute_ocular_quiet_eye_latency_multiplier,
    compute_pinn_navier_stokes_composite_loss,
    deconfound_cumulative_ryoe_r2,
    evaluate_acrisure_tahoma31_turf_shear_upgrade,
    evaluate_bezier_route_curve,
    optimize_bayesian_asymmetric_loss_action,
)
from scripts.ops.dfs_stochastic_milp_optimizer import (
    build_sample_week9_dfs_slate_pool,
    evaluate_newell_tiered_gpp_expected_payout,
    optimize_dfs_portfolio,
)
from scripts.ops.locked_production_pipeline import (
    ESPN_2026_EDGE_PRWR_LEADERS,
    ESPN_2026_OT_PBWR_LEADERS,
    WEEK9_SEA_ARI_PASS_CATCHER_MATRIX,
    WEEK9_TRENCH_MISMATCH_SPOTLIGHT,
    enforce_production_sanity_gates,
    validate_roster_and_coordinate_mutation_guard,
)
from scripts.ops.memory_mapped_spatial_backtest import evaluate_in_memory_telemetry_rows
from tests.verify_out_of_sample_calibration import run_historical_backtest_eval


def test_enforce_production_sanity_gates_hurdle_and_dirichlet_conservation():
    raw_df = pd.DataFrame(
        {
            "player_id": ["STAR_RECEIVER", "DEPTH_RECEIVER_A", "INJURED_SHADOW_PLAYER"],
            "raw_projected_volume": [8.5, 4.2, 3.1],
        }
    )
    priors = {"STAR_RECEIVER": 0.85, "DEPTH_RECEIVER_A": 0.08, "INJURED_SHADOW_PLAYER": 0.00}
    out = enforce_production_sanity_gates(raw_df, priors, team_target_cap=10.0)
    by_id = dict(zip(out["player_id"], out["conserved_volume"]))
    assert by_id["STAR_RECEIVER"] == pytest.approx(10.0, abs=1e-9)
    assert by_id["DEPTH_RECEIVER_A"] == 0.0
    assert by_id["INJURED_SHADOW_PLAYER"] == 0.0
    assert float(out["conserved_volume"].sum()) == pytest.approx(10.0, abs=1e-9)


def test_anti_hallucination_roster_and_coordinate_guard():
    with pytest.raises(ValueError, match="A.J. Brown"):
        validate_roster_and_coordinate_mutation_guard([{"player_name": "A.J. Brown", "team": "NE"}])

    with pytest.raises(ValueError, match="Trey Hendrickson"):
        validate_roster_and_coordinate_mutation_guard([{"player_name": "Trey Hendrickson", "team": "BAL"}])

    with pytest.raises(ValueError, match="Forbidden spatial coordinate mutation"):
        validate_roster_and_coordinate_mutation_guard(
            [{"player_name": "A.J. Brown", "team": "PHI"}],
            coordinate_scale_x=1.04,
            coordinate_scale_y=1.04,
        )

    ok = validate_roster_and_coordinate_mutation_guard(
        [
            {"player_name": "A.J. Brown", "team": "PHI"},
            {"player_name": "Trey Hendrickson", "team": "CIN"},
            {"player_name": "Theo Benedet", "team": "CHI"},
        ]
    )
    assert ok["roster_verified"] is True


def test_espn_2026_pbwr_prwr_and_week9_sea_ari_matrix():
    assert ESPN_2026_OT_PBWR_LEADERS["Jordan Mailata"]["pbwr"] == 0.93
    assert ESPN_2026_OT_PBWR_LEADERS["Theo Benedet"]["pbwr"] == 0.93
    assert ESPN_2026_EDGE_PRWR_LEADERS["Abdul Carter"]["prwr"] == 0.35
    assert ESPN_2026_EDGE_PRWR_LEADERS["Chop Robinson"]["prwr"] == 0.35
    assert ESPN_2026_EDGE_PRWR_LEADERS["DeMarcus Lawrence"]["team"] == "SEA"
    assert WEEK9_TRENCH_MISMATCH_SPOTLIGHT["ARI_OL_vs_SEA_DL"]["ari_ol_pbwr_rank"] == 31
    assert WEEK9_TRENCH_MISMATCH_SPOTLIGHT["GB_OL_PROTECTION_FLOOR"]["gb_season_pbwr"] == 0.31

    raw_ari = pd.DataFrame(
        [
            {"player_id": r["player_id"], "raw_projected_volume": r["target_share_prior"] * 34.0}
            for r in WEEK9_SEA_ARI_PASS_CATCHER_MATRIX
            if r["team"] == "ARI"
        ]
    )
    priors_ari = {r["player_id"]: r["route_participation"] for r in WEEK9_SEA_ARI_PASS_CATCHER_MATRIX if r["team"] == "ARI"}
    conserved_ari = enforce_production_sanity_gates(raw_ari, priors_ari, team_target_cap=34.0)
    by_id = dict(zip(conserved_ari["player_id"], conserved_ari["conserved_volume"]))
    assert by_id["Kendrick Bourne"] == 0.0
    assert by_id["Marvin Harrison Jr."] == 0.0
    assert by_id["Trey McBride"] > by_id["Michael Wilson"] > 0.0
    assert float(conserved_ari["conserved_volume"].sum()) == pytest.approx(34.0, abs=1e-9)


def test_epistemic_out_of_sample_calibration_gate_rejects_noise_and_approves_signal():
    rng = np.random.default_rng(42)
    true_y = rng.choice([0, 1], size=500, p=[0.75, 0.25])
    base_p = np.clip(np.full(500, 0.25) + rng.normal(0, 0.04, 500), 0.01, 0.99)
    noisy_p = np.clip(base_p + rng.normal(0, 0.14, 500), 0.01, 0.99)
    better_p = np.clip(0.65 * base_p + 0.35 * true_y, 0.01, 0.99)

    rej = run_historical_backtest_eval(true_y, base_p, noisy_p)
    assert rej["PROMOTION_GATE_STATUS"] == "REJECTED"

    app = run_historical_backtest_eval(true_y, base_p, better_p)
    assert app["PROMOTION_GATE_STATUS"] == "APPROVED"


def test_quarantined_glycogen_pinn_mallat_and_memory_slice():
    assert RESEARCH_SANDBOX_QUARANTINED is True

    eng = MultiGameGlycogenDepletionEngine(
        {
            "BREECE_HALL": {"initial_glycogen": 450.0, "cho_intake_g_kg": 7.5, "mass_kg": 100.0},
            "A_J_BROWN": {"initial_glycogen": 420.0, "cho_intake_g_kg": 5.0, "mass_kg": 103.0},
        }
    )
    g1 = eng.process_game_workload_discharge("BREECE_HALL", accumulated_work_joules=3.2e7)
    assert g1 < 450.0
    g2 = eng.simulate_weekly_regeneration_recharge("BREECE_HALL", rest_days=3.0)
    assert g2 > g1
    risk, mult = eng.evaluate_soft_tissue_injury_risk("BREECE_HALL")
    assert risk in {"CRITICAL_SOFT_TISSUE_WARNING", "ELEVATED_FATIGUE_RISK", "OPTIMAL_METABOLIC_HEALTH"}
    assert 0.78 <= mult <= 1.00

    pinn = compute_pinn_navier_stokes_composite_loss([0.1, -0.1], [0.05, 0.05], [0.02], [0.03])
    assert pinn["total_composite_loss"] > 0.0

    mallat = compute_mallat_scattering_intermittency_residual([0.1, 0.2, 0.15, 2.8, 0.2, 0.1])
    assert mallat["intermittency_ratio"] > 0.5

    turf = evaluate_acrisure_tahoma31_turf_shear_upgrade(780.0, 1150.0, 0.20, grip_upgrade_factor=1.04)
    assert turf["coordinates_mutated"] is False
    assert 0.0 < turf["slip_probability"] < 1.0

    mem = evaluate_in_memory_telemetry_rows(
        [
            ("2026_08_CHI_SEA", 1, 1, 0, 25.0, 26.6, 4.5, 1.2),
            ("2026_08_CHI_SEA", 1, 2, 0, 25.4, 26.7, 5.1, 1.4),
        ]
    )
    assert mem["play_blocks"] == 1
    assert mem["processed_nodes"] == 2
    assert mem["total_kinetic_energy_joules"] > 0.0


def test_wave3_alam_crosswind_kent_cleat_bezier_routes_and_congelio_ryoe_deconfounding():
    # Alam et al. (2012): C_D0 = 0.19 at 0 deg yaw, increases under crosswind toward C_D90 = 0.78
    zero_wind = compute_alam_football_crosswind_drag(wind_speed_mph=0.0, ball_speed_mph=52.0, crosswind_angle_deg=90.0)
    cross_wind = compute_alam_football_crosswind_drag(wind_speed_mph=22.0, ball_speed_mph=45.0, crosswind_angle_deg=90.0)
    assert zero_wind["cd_effective"] == pytest.approx(0.19, abs=1e-4)
    assert cross_wind["cd_effective"] > zero_wind["cd_effective"]
    assert cross_wind["drag_multiplier_vs_zero_yaw"] > 1.5
    assert cross_wind["drag_force_n"] > zero_wind["drag_force_n"]

    # Kent et al. (2015): Natural grass divot tearing (3.2 kN, 145 Nm) vs infill turf (4.5 kN, 197 Nm)
    grass = compute_kent_cleat_surface_entrapment(is_artificial_turf=False, vertical_load_kn=2.8)
    turf = compute_kent_cleat_surface_entrapment(is_artificial_turf=True, vertical_load_kn=2.8)
    assert grass["peak_horizontal_force_kn"] == pytest.approx(3.2, abs=1e-4)
    assert turf["peak_horizontal_force_kn"] == pytest.approx(4.5, abs=1e-4)
    assert grass["peak_rotational_torque_nm"] == pytest.approx(145.0, abs=1e-4)
    assert turf["peak_rotational_torque_nm"] == pytest.approx(197.0, abs=1e-4)
    assert turf["hershman_sprain_hazard_multiplier"] == pytest.approx(1.22, abs=1e-4)
    assert grass["divot_force_limiting_active"] is True
    assert turf["divot_force_limiting_active"] is False

    # Chu et al. (2019, arXiv:1908.02423v1): Bernstein Bezier curve endpoint & trajectory properties
    ctrl = [[0.0, 0.0], [5.0, 2.0], [12.0, 8.0]]
    curve = evaluate_bezier_route_curve(ctrl, [0.0, 0.5, 1.0])
    assert curve.shape == (3, 2)
    assert np.allclose(curve[0], [0.0, 0.0])
    assert np.allclose(curve[-1], [12.0, 8.0])

    # Chitturi (2024): Route disturbance average minimum defender clearance
    tight_cov = compute_chitturi_route_disturbance_score(
        0.75,
        route_points_xy=curve,
        defender_points_xy=[[5.2, 2.1], [11.8, 7.9]],
    )
    open_cov = compute_chitturi_route_disturbance_score(
        0.75,
        route_points_xy=curve,
        defender_points_xy=[[20.0, 20.0], [25.0, 18.0]],
    )
    assert open_cov["avg_min_defender_clearance_yds"] > tight_cov["avg_min_defender_clearance_yds"]
    assert open_cov["combined_route_viability_score"] > tight_cov["combined_route_viability_score"]

    # Congelio (2023): De-confounding cumulative rushing yards R^2 ~ 0.99 into per-carry RYOE
    carries = [100, 300, 600, 900, 1400, 1800]
    exp_yds = [420, 1280, 2550, 3820, 5950, 7650]
    act_yds = [410, 1340, 2490, 4010, 6180, 7920]
    ryoe_audit = deconfound_cumulative_ryoe_r2(act_yds, exp_yds, carries)
    assert ryoe_audit["cumulative_volume_confounded_r2"] > 0.99
    assert ryoe_audit["volume_inflation_gap"] > 0.30


def test_wave4_ocular_quiet_eye_bayesian_asymmetric_loss_and_vi_elbo():
    # Lochhead et al. (2024 JSEP), Erickson (2021), Kirschen & Laby (2011), Phillips (2021)
    elite_oc = compute_ocular_quiet_eye_latency_multiplier(
        quiet_eye_duration_ms=420.0,
        saccade_latency_ms=190.0,
        vts_score=1.85,
        elite_vts_ref=1.50,
        pocket_window_sec=2.60,
    )
    rushed_oc = compute_ocular_quiet_eye_latency_multiplier(
        quiet_eye_duration_ms=220.0,
        saccade_latency_ms=215.0,
        vts_score=1.10,
        elite_vts_ref=1.50,
        pocket_window_sec=1.75,
    )
    assert elite_oc["ocular_decision_multiplier"] > rushed_oc["ocular_decision_multiplier"]
    assert elite_oc["far_transfer_training_weight"] == 0.0

    # Davidson-Pilon (Bayesian Methods for Hackers Ch. 4 & Ch. 5):
    # Small-sample high observation shrinks toward prior and asymmetric loss shifts action below mean
    small_sample = optimize_bayesian_asymmetric_loss_action(
        prior_mean=32.0,
        prior_std=8.0,
        observed_mean=58.0,
        sample_size=2,
        obs_std=16.0,
        overprediction_penalty=2.5,
        underprediction_penalty=1.0,
    )
    large_sample = optimize_bayesian_asymmetric_loss_action(
        prior_mean=32.0,
        prior_std=8.0,
        observed_mean=58.0,
        sample_size=50,
        obs_std=16.0,
        overprediction_penalty=2.5,
        underprediction_penalty=1.0,
    )
    assert small_sample["empirical_bayes_shrinkage_weight_on_prior"] > large_sample["empirical_bayes_shrinkage_weight_on_prior"]
    assert small_sample["bayes_optimal_asymmetric_action"] < small_sample["posterior_mean"]
    assert small_sample["conservative_buffer_below_mean"] > 0.0

    # Murphy (2023 PML Book 2) + Mandt, Hoffman & Blei (2017 SGD as OU Bayesian Inference)
    vi = compute_elbo_and_ornstein_uhlenbeck_sgd_posterior_variance(
        expected_log_likelihood=-1.25,
        mu_q=0.15,
        sigma_q=0.80,
        mu_0=0.0,
        sigma_0=1.0,
        learning_rate_eta=0.01,
        minibatch_size_b=32,
        hessian_curvature_h=2.0,
        gradient_noise_cov_c=1.5,
    )
    assert vi["kl_divergence_q_p"] > 0.0
    assert vi["variational_elbo"] < -1.25
    assert vi["ou_sgd_stationary_variance"] > 0.0


def test_wave5_dfs_stochastic_milp_portfolio_and_newell_tiered_payout():
    pool = build_sample_week9_dfs_slate_pool()
    portfolio = optimize_dfs_portfolio(
        pool,
        num_lineups=3,
        max_overlap=6,
        salary_cap=50000.0,
        min_teams=3,
        require_qb_stack=True,
    )
    assert len(portfolio) == 3

    player_sets = []
    for lu in portfolio:
        assert len(lu) == 9
        assert float(lu["salary"].sum()) <= 50000.0
        pos_counts = lu["position"].value_counts().to_dict()
        assert pos_counts.get("QB", 0) == 1
        assert pos_counts.get("DST", 0) == 1
        assert 2 <= pos_counts.get("RB", 0) <= 3
        assert 3 <= pos_counts.get("WR", 0) <= 4
        assert 1 <= pos_counts.get("TE", 0) <= 2
        assert lu["team"].nunique() >= 3

        # Verify QB is stacked with at least 1 same-team WR/TE and never paired with opposing DST
        qb_row = lu[lu["position"] == "QB"].iloc[0]
        dst_row = lu[lu["position"] == "DST"].iloc[0]
        same_team_pass_catchers = lu[(lu["position"].isin(["WR", "TE"])) & (lu["team"] == qb_row["team"])]
        assert len(same_team_pass_catchers) >= 1
        assert str(dst_row["team"]) != str(qb_row["opponent"])
        assert float(lu["risk_adjusted_objective"].iloc[0]) > float(lu["projection"].sum())
        player_sets.append(set(lu["player"].tolist()))

    # Verify pairwise multi-entry overlap <= max_overlap (6)
    for i in range(len(player_sets)):
        for j in range(i + 1, len(player_sets)):
            assert len(player_sets[i].intersection(player_sets[j])) <= 6

    # Verify Sarah Newell (2017) tiered GPP expected payout rises with higher lineup variance on top-heavy tiers
    low_var = evaluate_newell_tiered_gpp_expected_payout(142.0, 14.0, [(185.0, 100000.0), (160.0, 500.0), (145.0, 25.0)])
    high_var = evaluate_newell_tiered_gpp_expected_payout(142.0, 26.0, [(185.0, 100000.0), (160.0, 500.0), (145.0, 25.0)])
    assert high_var["top_tier_win_prob"] > low_var["top_tier_win_prob"]
    assert high_var["expected_payout_usd"] > low_var["expected_payout_usd"]



