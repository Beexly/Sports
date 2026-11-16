"""Comprehensive deterministic unit tests covering Master Plan v4.0 K01-K25 & Deliverables 3-5."""

from __future__ import annotations

import math
from fractions import Fraction

import numpy as np
import pytest

from gse_engine.compute.biomech_and_ballistics import (
    compute_aipw_clipp_eps,
    compute_humid_air_density,
    evaluate_biomech_rtp_and_exit_hazard,
    evaluate_disguised_coverage_kl,
    evaluate_referee_crew_and_dpi,
    evaluate_shared_frailty_pocket_survival,
    evaluate_stadium_aerodynamics_and_fatigue,
)
from gse_engine.compute.corpus_situational_integrator import (
    evaluate_deception_decoy_and_chalk_firewall,
    execute_fwl_mp_gpid_black_litterman_fusion,
)
from gse_engine.compute.dfs_optimizer import (
    compute_late_swap_real_option_value,
    solve_k22_dro_cash_or_dpp_gpp_milp,
)
from gse_engine.compute.market_surface_and_filtration import (
    build_ladder_surface_from_books,
    compute_lien_shrestha_vecm_is,
    devig_shin_or_power,
    evaluate_non_commutative_filtration_bridge,
    fit_scop_monotone_survival_and_bl_density,
)
from gse_engine.compute.qb_physics import compute_qb2_backup_topology_shift
from gse_engine.compute.rqmc_tilting_and_regimes import (
    evaluate_2026_dynamic_kickoff_start,
    evaluate_catalytic_ep_wp,
    evaluate_market_control_variates_and_is,
    evaluate_rule4_endgame_and_ot_automaton,
    generate_owen_scrambled_sobol_pca16,
    sample_hurdle_zinb_and_tpg_play,
    solve_standardized_entropic_tilting,
)
from gse_engine.compute.rvine_sgp_copula import (
    evaluate_5regime_rvine_sgp,
    higham_nearest_correlation,
)
from gse_engine.compute.volume_conservation import reallocate_12cell_kantorovich_vmls_roles
from gse_engine.fabric import (
    MultiplicityAgrapaOnsGate,
    compute_shapley_sobol_4block_attribution,
    execute_deterministic_microtask_kernel,
)
from gse_engine.gates.conjunction import (
    compute_baker_mchale_conformal_kelly,
    evaluate_sgp_superadditivity_and_log_growth,
)
from gse_engine.ingestion.beat_langextract import verify_span_grounded_triple_with_pbp
from gse_engine.ingestion.multimodal_vlm_and_provenance import (
    HawkesSocialPost,
    MetaAnalysisStudy,
    apply_retraction_and_mde_meta_regression,
    assert_zero_drift_vlm_chart_batch,
    beta_binomial_conjugate_rate,
    compute_morlet_wavelet_scattering_intermittency,
    deflate_cherry_pick_z_and_exposure,
    dirichlet_multinomial_shell_posterior,
    evaluate_cross_chapter_dag_gate,
    evaluate_hawkes_dawid_skene_provenance,
    morris_james_stein_plus_shrinkage,
    verify_buckingham_pi_units,
)
from gse_engine.ingestion.vision_and_geofence import project_broadcast_dlt_homography
from gse_engine.observability.kernel_registry_and_antipatterns import (
    assert_ap01_mondrian_monotonicity,
    load_k01_to_k25_registry,
    run_all_antipattern_guards,
)
from gse_engine.observability.walk_forward_ablation import (
    BitemporalRecord,
    SourceCannotSpeakAsOfError,
    build_purged_embargoed_cpcv_folds,
    energy_score,
    enforce_bitemporal_asof_freeze,
    holm_bonferroni_stepdown,
    variogram_score_p05,
)
from gse_engine.state_space.etkf_dma_bus import STATE_VECTOR_DIM, EtkfDmaLatentBus
from gse_engine.storage.receipts_s3 import build_chained_rfc3161_receipt


def test_k01_hasbrouck_vecm_shin_power_and_scop_bl_density() -> None:
    """Verify K01 VECM Hasbrouck IS permutation invariance, Shin/Power, and SCOP density."""
    omega = [[0.04, 0.015, 0.01], [0.015, 0.05, 0.012], [0.01, 0.012, 0.06]]
    res_a = compute_lien_shrestha_vecm_is(
        ["Pinnacle", "Circa", "Kalshi"],
        alpha_perp=[0.5, 0.3, 0.2],
        omega_cov=omega,
    )
    perm_om = [
        [omega[2][2], omega[2][0], omega[2][1]],
        [omega[0][2], omega[0][0], omega[0][1]],
        [omega[1][2], omega[1][0], omega[1][1]],
    ]
    res_b = compute_lien_shrestha_vecm_is(
        ["Kalshi", "Pinnacle", "Circa"],
        alpha_perp=[0.2, 0.5, 0.3],
        omega_cov=perm_om,
    )
    assert abs(sum(res_a.weights.values()) - 1.0) < 1e-9
    for b in ("Pinnacle", "Circa", "Kalshi"):
        assert abs(res_a.weights[b] - res_b.weights[b]) < 1e-6

    p_shin = devig_shin_or_power((1.91, 1.91))
    assert abs(sum(p_shin) - 1.0) < 1e-12
    p_pow = devig_shin_or_power((1.25, 4.10))
    assert abs(sum(p_pow) - 1.0) < 1e-12

    scop = fit_scop_monotone_survival_and_bl_density(
        strikes=(-6.5, -3.5, -0.5, 2.5, 6.5),
        survival_probs=(0.82, 0.65, 0.50, 0.34, 0.16),
    )
    assert scop.is_strictly_decreasing
    assert abs(scop.integral_mass - 1.0) < 1e-6
    assert min(scop.density_grid) >= 0.0

    ladder = build_ladder_surface_from_books(
        {
            39.5: {"Pinnacle": (2.25, 1.72), "Circa": (2.20, 1.75)},
            49.5: {"Pinnacle": (1.92, 1.92), "Circa": (1.90, 1.94)},
            59.5: {"Pinnacle": (1.68, 2.30), "Circa": (1.70, 2.28)},
        }
    )
    assert ladder.is_strictly_decreasing
    assert abs(ladder.integral_mass - 1.0) < 1e-6


def test_k02_k03_k05_k06_k09_k10_k11_simulation_physics() -> None:
    """Verify K02/K03/K05/K06/K09/K10/K11 simulation, tilting, ETKF-DMA, and rulebook kernels."""
    u_rqmc, z_macro = generate_owen_scrambled_sobol_pca16(
        num_worlds=256,
        campaign_seed=20261116,
        task_id="test_k03",
        macro_cov_matrix=np.eye(16).tolist(),
        dim=16,
    )
    assert u_rqmc.shape == (256, 16)
    assert z_macro.shape == (256, 16)

    m_sim = np.column_stack((z_macro[:, 0] * 3.0 + 21.0, z_macro[:, 1] * 12.0 + 225.0))
    payoffs = 2.0 * m_sim[:, 0] + 0.5 * m_sim[:, 1] + 0.05 * z_macro[:, 2]
    cv_res = evaluate_market_control_variates_and_is(
        payoffs_j=payoffs.tolist(),
        macro_sim_m=m_sim.tolist(),
        market_benchmarks_mu=(21.0, 225.0),
    )
    assert cv_res["variance_reduction_ratio"] < 0.05

    rng = np.random.default_rng(7)
    s_n = 512
    hm_sc = np.maximum(0.0, 24.0 + rng.normal(0.0, 9.0, size=s_n))
    aw_sc = np.maximum(0.0, 21.0 + rng.normal(0.0, 9.0, size=s_n))
    g_cols = [
        hm_sc,
        aw_sc,
        240.0 + rng.normal(0.0, 35.0, size=s_n),
        220.0 + rng.normal(0.0, 35.0, size=s_n),
        115.0 + rng.normal(0.0, 25.0, size=s_n),
        105.0 + rng.normal(0.0, 25.0, size=s_n),
    ]
    im = np.rint(hm_sc - aw_sc)
    for km in (3, 7, 6, 10, 14, 4, 17):
        g_cols.append((np.abs(im) == float(km)).astype(np.float64))
    g_mat = np.column_stack(g_cols)
    g_tgt = np.mean(g_mat, axis=0)
    g_tgt[0] += 0.35
    g_tgt[6] = 0.85 * float(g_tgt[6]) + 0.15 * 0.151
    tilt = solve_standardized_entropic_tilting(
        sim_moment_matrix_g=g_mat.tolist(),
        target_macro_vector_g_bar=g_tgt.tolist(),
    )
    assert abs(sum(tilt.weights) - 1.0) < 1e-12
    assert min(tilt.weights) > 0.0
    assert tilt.ess_ratio >= 0.65

    bus = EtkfDmaLatentBus(initial_spread=0.30)
    etkf = bus.assimilate(
        obs_indices=[0, 1, 16, 17, 18],
        obs_values=[0.8, -0.4, 82.0, 61.0, 44.0],
        obs_variances=[0.5, 0.5, 25.0, 25.0, 20.0],
    )
    assert len(etkf.posterior_mean) == STATE_VECTOR_DIM
    assert abs(sum(etkf.regime_weights) - 1.0) < 1e-9
    assert min(etkf.min_subspace_eigenvalues) >= 1.0
    assert etkf.split_brain_gap == 0.0

    ep_1 = evaluate_catalytic_ep_wp(down=1, ydstogo=10, yardline_100=30, score_diff_off=3)
    ep_4 = evaluate_catalytic_ep_wp(down=4, ydstogo=10, yardline_100=30, score_diff_off=3)
    ep_deep = evaluate_catalytic_ep_wp(down=1, ydstogo=10, yardline_100=70, score_diff_off=3)
    assert ep_1["ep_0"] >= ep_4["ep_0"]
    assert ep_1["ep_0"] >= ep_deep["ep_0"]
    ep_opp = evaluate_catalytic_ep_wp(down=1, ydstogo=10, yardline_100=30, score_diff_off=-3)
    assert abs(ep_1["wp_off"] + ep_1["wp_def"] - 1.0) < 1e-12
    assert ep_1["wp_off"] > ep_opp["wp_off"]

    tpg = sample_hurdle_zinb_and_tpg_play(
        zero_hurdle_pi0=0.05,
        mean_opportunities_mu=7.5,
        nb_dispersion_r=4.2,
        i_scat=0.34,
        line_of_scrimmage_b=72,
    )
    assert tpg["all_bounded_le_remaining"] is True
    assert float(tpg["usage_vmr"]) >= 1.2  # overdispersed ZINB > Poisson VMR 1.0

    ko_oob = evaluate_2026_dynamic_kickoff_start(kick_line_yard=50, zone_override="OOB")
    ko_ez50 = evaluate_2026_dynamic_kickoff_start(kick_line_yard=50, zone_override="FLY_EZ")
    ko_ez35 = evaluate_2026_dynamic_kickoff_start(kick_line_yard=35, zone_override="FLY_EZ")
    assert ko_oob.starting_yardline_own == 40
    assert ko_ez50.starting_yardline_own == 20
    assert ko_ez35.starting_yardline_own == 35

    r4_2m = evaluate_rule4_endgame_and_ot_automaton(
        quarter=4,
        t_pre_sec=124.0,
        t_post_sec=119.0,
        raw_post_play_bleed_sec=28.0,
        score_diff_off=-4,
        def_timeouts=2,
        down=1,
        p_scramble_base=0.14,
    )
    assert r4_2m.two_minute_warning_triggered is True
    assert r4_2m.post_play_bleed_sec == 0.0
    assert r4_2m.p_scramble_effective <= 0.02

    r4_kneel = evaluate_rule4_endgame_and_ot_automaton(
        quarter=4,
        t_pre_sec=80.0,
        t_post_sec=75.0,
        raw_post_play_bleed_sec=40.0,
        score_diff_off=6,
        def_timeouts=0,
        down=2,
        p_scramble_base=0.10,
        qb_rush_prop_line=19.5,
        qb_pre_kneel_rush_yds=21.0,
        is_regular_season_ot=False,
    )
    assert r4_kneel.victory_kneel_count == 2
    assert r4_kneel.expected_kneel_yds_delta == pytest.approx(-2.4, abs=1e-6)
    assert r4_kneel.flag_kneeldown_hook_risk is True


def test_k04_k07_k08_k12_k14_k15_k16_k17_k18_k19_k20_k23_k24() -> None:
    """Verify K04/K07/K08/K12/K14/K15/K16/K17/K18/K19/K20/K23/K24 priors and biomech kernels."""
    vac = [0.0, 0.0, 0.0, 0.14, 0.08, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    profs = [
        (0.7, 0.2, 0.0, 0.1, 14.0, 0.0, 0.1),
        (0.2, 0.7, 0.0, 0.1, 9.0, 0.0, 0.2),
        (0.0, 0.1, 0.8, 0.1, 7.0, 0.3, 0.0),
    ]
    k04 = reallocate_12cell_kantorovich_vmls_roles(
        vacated_band_shares_v=vac,
        active_player_profiles=profs,
        base_shares_r0=(0.30, 0.26, 0.22),
        max_share_add_u=(0.12, 0.12, 0.10),
        has_liquid_two_sided_prop=(True, False, False),
    )
    assert k04["all_finite"] is True
    assert k04["orphan_bucket_share"] == 0.0
    assert k04["simplex_error"] < 1e-12

    rng = np.random.default_rng(11)
    x_raw = rng.normal(size=(40, 4))
    m_bas = np.column_stack((np.ones(40), rng.normal(size=(40, 2))))
    x_raw = x_raw + 0.6 * m_bas[:, 1:2]
    y_res = 0.5 * x_raw[:, 0] * x_raw[:, 1] + rng.normal(scale=0.2, size=40)
    k07 = execute_fwl_mp_gpid_black_litterman_fusion(
        x_raw.tolist(),
        m_bas.tolist(),
        y_res.tolist(),
        [0.45, -0.55],
        spine_attrition_delta_u=(1.0, 1.0),
    )
    assert k07["market_orthogonality_max_err"] < 1e-4
    assert k07["lowdin_whitening_max_err"] < 1e-4
    assert abs(k07["bl_spread_shift_pts"]) <= 2.75

    k08 = evaluate_shared_frailty_pocket_survival(
        rusher_strain=[0.2, 0.2, 0.2, 0.3, 0.9],
        blocker_clipp_eps=[0.2, 0.2, 0.2, 0.2, -0.4],
        chip_indicators=[0.0, 0.0, 0.0, 0.0, 0.0],
    )
    assert k08.am_gm_inequality_holds
    k08_chip = evaluate_shared_frailty_pocket_survival(
        rusher_strain=[0.2, 0.2, 0.2, 0.3, 0.9],
        blocker_clipp_eps=[0.2, 0.2, 0.2, 0.2, -0.4],
        chip_indicators=[0.0, 0.0, 0.0, 0.0, 1.0],
    )
    assert k08_chip.s_pocket_2_5s >= k08.s_pocket_2_5s
    clipp_est = compute_aipw_clipp_eps(
        [1.0, 0.5], [1, 0], [0.4, 0.4], [0.8, 0.8], [0.0, 1.0]
    )
    assert abs(clipp_est) < 50.0

    k12_zero = compute_qb2_backup_topology_shift(
        qb1_vector=(0.15, 8.2, 2.7, 0.06, 0.59),
        qb2_empirical_vector=(0.45, 9.8, 2.4, 0.04, 0.62),
        qb2_career_dropbacks_n=0,
    )
    assert k12_zero["theta_qb2"][:2] == pytest.approx(k12_zero["prior_vec"][:2], abs=1e-4)
    assert abs(sum(k12_zero["b_depth_new"]) - 1.0) < 1e-12

    rtp_w1 = evaluate_biomech_rtp_and_exit_hazard(
        injury_cohort="HighAnkle", weeks_since_return=1, weeks_missed=3.0, is_synthetic_turf=True
    )
    rtp_w3 = evaluate_biomech_rtp_and_exit_hazard(
        injury_cohort="HighAnkle", weeks_since_return=3, weeks_missed=3.0, is_synthetic_turf=True
    )
    assert rtp_w3.phi_eff >= rtp_w1.phi_eff
    assert rtp_w3.h_exit <= rtp_w1.h_exit
    assert abs(sum(rtp_w1.p_exit_dist) + rtp_w1.p_complete_game - 1.0) < 1e-12
    assert rtp_w1.tau_surf == 1.28
    rtp_rib = evaluate_biomech_rtp_and_exit_hazard(
        injury_cohort="RibAC", weeks_since_return=1, weeks_missed=2.0, is_synthetic_turf=True
    )
    assert rtp_rib.tau_surf == 1.0

    k15_zero = evaluate_disguised_coverage_kl(
        pre_snap_shell_prob=(0.1, 0.2, 0.2, 0.3, 0.1, 0.1),
        post_snap_shell_prob=(0.1, 0.2, 0.2, 0.3, 0.1, 0.1),
    )
    assert k15_zero.d_kl_nats == 0.0
    k15_rot = evaluate_disguised_coverage_kl(
        pre_snap_shell_prob=(0.05, 0.05, 0.40, 0.10, 0.35, 0.05),
        post_snap_shell_prob=(0.15, 0.50, 0.10, 0.15, 0.05, 0.05),
    )
    assert k15_rot.d_kl_nats > 0.0 and k15_rot.delta_ttt_sec > 0.0

    rho_dry = compute_humid_air_density(temp_celsius=25.0, rel_humidity=0.10, elevation_m=100.0)
    rho_hum = compute_humid_air_density(temp_celsius=25.0, rel_humidity=0.90, elevation_m=100.0)
    assert rho_hum < rho_dry
    dome = evaluate_stadium_aerodynamics_and_fatigue(
        temp_celsius=-10.0,
        rel_humidity=0.9,
        elevation_m=2240.0,
        wind_vec_3d=(12.0, 10.0, 0.0),
        roof_closed=True,
        wbgt_celsius=32.0,
    )
    assert dome.air_density_rho == pytest.approx(1.1923, abs=1e-6)
    assert dome.carry_delta_vs_dome_yds == pytest.approx(0.0, abs=1e-4)

    posts = [
        HawkesSocialPost(
            post_id=f"p{i}",
            author_id=f"u{i}",
            t_hours=-2.0 + i * 0.002,
            mu_immigrant_rate=0.9 if i == 0 else 0.001,
            state_label_idx=1,
            embedding=(1.0, 0.0),
            sharp_line_delta=0.0,
            expected_claim_impact=0.0,
        )
        for i in range(50)
    ]
    k17 = evaluate_hawkes_dawid_skene_provenance(posts, t_eval_hours=-1.5)
    assert k17.n_eff_hawkes <= 1.15
    absorbed = evaluate_hawkes_dawid_skene_provenance(
        [
            HawkesSocialPost(
                post_id="old",
                author_id="u0",
                t_hours=-70.0,
                mu_immigrant_rate=1.0,
                state_label_idx=3,
                embedding=(1.0, 0.0),
                sharp_line_delta=-0.5,
                expected_claim_impact=-0.5,
            )
        ],
        t_eval_hours=0.0,
        prior_state_probs=(0.70, 0.14, 0.08, 0.08),
    )
    assert absorbed.state_posteriors["FullGo"] == pytest.approx(0.70, abs=1e-4)

    anchor = np.linspace(0.04, 0.14, 32).tolist()
    pct_table = [[v * 100.0] for v in anchor]
    vlm_ok = assert_zero_drift_vlm_chart_batch(
        metric_name="light_box_6_or_fewer_pct_ftn",
        pass1_deplot=pct_table,
        pass2_vlm_json=pct_table,
        canonical_db_anchor=anchor,
    )
    assert vlm_ok.accepted is True and vlm_ok.scale_chosen == 100
    assert abs(float(np.mean([r[0] for r in vlm_ok.normalized_values])) - 0.09) < 0.01

    p_ftn, _ = beta_binomial_conjugate_rate(0.0, 0.0, metric_key="light_box_6_or_fewer_pct_ftn")
    p_ngs, _ = beta_binomial_conjugate_rate(0.0, 0.0, metric_key="non_stacked_box_under7_pct_ngs")
    assert p_ftn == pytest.approx(0.0853, abs=1e-4)
    assert p_ngs == pytest.approx(0.5150, abs=1e-4)
    z_same, n_same, m_one = deflate_cherry_pick_z_and_exposure(2.2, 100.0, ())
    assert m_one == 1.0 and z_same == 2.2 and n_same == 100.0
    z_cp, n_cp, _ = deflate_cherry_pick_z_and_exposure(2.8, 100.0, (4, 6, 4))
    assert z_cp < 2.8 and n_cp < 100.0
    sh_post = dirichlet_multinomial_shell_posterior([5, 20, 10, 30, 15, 10])
    assert abs(sum(sh_post) - 1.0) < 1e-12
    mjs, b_shr = morris_james_stein_plus_shrinkage([1.2, 2.5, 1.8, 2.9], [15.0, 260.0, 90.0, 240.0])
    assert b_shr[1] > b_shr[0] and all(0.35 <= v <= 3.60 for v in mjs)

    filt_before = evaluate_non_commutative_filtration_bridge(
        eta_noon=-3.0,
        delta_line_sharp=-1.5,
        delta_inj_causal=-1.5,
        t_steam_utc=100,
        t_inact_utc=200,
    )
    filt_after = evaluate_non_commutative_filtration_bridge(
        eta_noon=-3.0,
        delta_line_sharp=-1.5,
        delta_inj_causal=-1.5,
        t_steam_utc=200,
        t_inact_utc=100,
    )
    assert filt_before.alpha_priced == pytest.approx(1.0, abs=1e-4)
    assert filt_after.alpha_priced == 0.0
    assert filt_before.eta_t90m != filt_after.eta_t90m

    dec1 = evaluate_deception_decoy_and_chalk_firewall(
        ling_features_z=[1.0] * 6,
        practice_seq=(0, 1, 1),
        official_tag="Q",
        viral_hype_vector=(0.0, 0.0, 0.0, 0.0),
    )
    dec2 = evaluate_deception_decoy_and_chalk_firewall(
        ling_features_z=[1.0] * 6,
        practice_seq=(0, 1, 1),
        official_tag="Q",
        viral_hype_vector=(1e6, 5.0, 9.0, 42.0),
    )
    assert dec1["expected_snap_share"] == dec2["expected_snap_share"]
    assert dec1["decoy_tprr_mult"] == dec2["decoy_tprr_mult"]

    crew = evaluate_referee_crew_and_dpi(
        crew_random_effect_off_hold=0.1,
        crew_random_effect_dpi=0.15,
        crew_random_effect_rtp=0.2,
        target_air_yards=24.0,
        los_yardline_100=30.0,
        prior_safety_strikes=2,
        new_safety_foul=True,
    )
    assert crew.stat_pass_yds_dpi == 0.0 and crew.stat_rec_yds_dpi == 0.0
    assert crew.delta_ep_dpi > 0.0 and crew.suspended_flag is True


def test_k13_k21_k22_k25_ws1_ws2_and_deliverables_3_to_5() -> None:
    """Verify K13/K21/K22/K25, Workstreams 1-3, and Deliverables 3-5."""
    non_psd = [[1.0, 0.9, 0.9], [0.9, 1.0, -0.8], [0.9, -0.8, 1.0]]
    psd = higham_nearest_correlation(non_psd, eig_floor=1e-5)
    assert psd.min_eigenvalue >= 1e-5 - 1e-9
    assert psd.max_diag_error < 1e-8

    rv = evaluate_5regime_rvine_sgp(
        leg_exceedance_probs=(0.55, 0.52, 0.48),
        raw_corr_matrix=non_psd,
    )
    assert rv.frechet_lower <= rv.joint_prob <= rv.frechet_upper
    assert rv.shootout_upper_tail_lambda > 0.05

    kelly_nobet = compute_baker_mchale_conformal_kelly(
        prob_hat=0.58,
        prob_epistemic_var=0.002,
        ta_cqr_lower=0.49,
        ta_cqr_upper=0.67,
        decimal_odds=1.91,
        fair_market_prob=0.52,
    )
    assert kelly_nobet["decision"] == "NO_BET" and kelly_nobet["shadow_kelly_fraction"] == 0.0

    kelly_play = compute_baker_mchale_conformal_kelly(
        prob_hat=0.64,
        prob_epistemic_var=0.001,
        ta_cqr_lower=0.56,
        ta_cqr_upper=0.71,
        decimal_odds=1.95,
        fair_market_prob=0.51,
        real_money_stake_cleared=False,
    )
    assert kelly_play["decision"] == "PLAY"
    assert kelly_play["shadow_kelly_fraction"] > 0.0
    assert kelly_play["live_stake_fraction"] == 0.0

    anti = evaluate_sgp_superadditivity_and_log_growth(
        p_a=0.55, p_b=0.55, p_joint=0.02, p_joint_lower=0.01, odds_a=1.9, odds_b=1.9, odds_ab=3.6
    )
    assert anti["admitted"] is False

    # K22 DRO Cash & GPP MILP with ROV_FLEX
    rov_early = compute_late_swap_real_option_value(
        player_position="WR", is_late_kickoff=False, late_pool_evs_by_pos={"WR": [18.0]}
    )
    rov_late = compute_late_swap_real_option_value(
        player_position="TE",
        is_late_kickoff=True,
        late_pool_evs_by_pos={"RB": [22.0], "WR": [20.0], "TE": [15.0]},
    )
    assert rov_early == 0.0 and rov_late == 7.0

    names = [
        "QB1", "QB2", "RB1", "RB2", "RB3", "WR1", "WR2",
        "WR3", "WR4", "TE1", "TE2", "DST1", "DST2",
    ]
    positions = ["QB", "QB", "RB", "RB", "RB", "WR", "WR", "WR", "WR", "TE", "TE", "DST", "DST"]
    teams = ["BUF", "KC", "BUF", "KC", "DET", "BUF", "KC", "DET", "LAR", "KC", "DET", "BUF", "DET"]
    sals = [7200, 6500, 7400, 6200, 5000, 7600, 6400, 5400, 4400, 5500, 4000, 3100, 2600]
    mus = [23.0, 20.5, 19.5, 16.0, 12.5, 20.0, 16.5, 13.5, 11.0, 14.0, 9.8, 8.5, 7.2]
    noise = np.random.default_rng(19).normal(0, 4.0, size=(32, len(names)))
    scen = np.maximum(0.0, np.asarray(mus)[None, :] + noise)
    gpp = solve_k22_dro_cash_or_dpp_gpp_milp(
        mode="gpp",
        names=names,
        positions=positions,
        teams=teams,
        salaries=sals,
        mean_projections=mus,
        scenario_pts_matrix=scen.tolist(),
        is_late_kickoff=[i % 2 == 1 for i in range(len(names))],
    )
    assert len(gpp["selected_indices"]) == 9
    assert int(gpp["total_salary"]) <= 50000
    assert int(gpp["te_count"]) <= 2

    # K25 16-coalition Shapley & aGRAPA/ONS + worker dispatch
    coal = [float(i * 1.5 + (0.2 if (i & 8) else 0.0)) for i in range(16)]
    shap = compute_shapley_sobol_4block_attribution(coal, y_proj=coal[0], y_actual=coal[15])
    assert shap["efficiency_residual"] < 1e-9
    assert shap["luck_learning_weight"] == 0.0

    ag = MultiplicityAgrapaOnsGate(mode="agrapa", active_candidates_m=5)
    for _ in range(12):
        ag.step(0.95, crps_scale=1.0)
    assert ag.wealth > 1.0
    assert ag.can_promote(mondrian_ece=0.04) is False

    wd = execute_deterministic_microtask_kernel(
        "SHAPLEY_ATTRIBUTION", {"coalition_values": coal}, 20261116
    )
    assert wd["luck_learning_weight"] == 0.0 and wd["efficiency_residual"] < 1e-9

    # WS 1.1-1.3, WS 2.3, WS 3.1 + Deliverables 3-5
    dag = evaluate_cross_chapter_dag_gate(
        tau_scale_required="game",
        tau_query="game",
        n_obs_raw=40.0,
        n_min_required=15.0,
        x_values=[2.0],
        domain_bounds=[(0.0, 10.0)],
        ancestor_predicates=[True],
        games_played=8,
    )
    assert dag.fire is True and dag.n_eff == 20.0

    pi_check = verify_buckingham_pi_units(
        [[0, 1, -2, 0, 0, 0], [0, 1, -1, 0, 0, 0]],
        lhs_dim=[0, 1, 0, 0, 0, 0],
        rhs_dim=[0, 1, 0, 0, 0, 0],
        transcendental_arg_dims=[[Fraction(0)] * 6],
    )
    assert pi_check.passed is True
    pool_m = apply_retraction_and_mde_meta_regression(
        [
            MetaAnalysisStudy("arxiv:2312.11067_retracted", 0.9, 0.1, 1.0, 100),
            MetaAnalysisStudy("w5-w8_bad", 0.5, 0.1, 1.0, 100),
            MetaAnalysisStudy("valid_study_1", 0.25, 0.08, 1.0, 200),
            MetaAnalysisStudy("valid_study_2", 0.18, 0.07, 1.0, 220),
        ]
    )
    assert len(pool_m.quarantined_ids) == 2 and -1.20 <= pool_m.g_pool <= 1.20

    scat = compute_morlet_wavelet_scattering_intermittency(
        [2, 15, 0, 42, 4, 18, 1, 9], position="WR"
    )
    assert 0.05 <= scat.i_scat <= 0.85 and "spread_mu" in scat.forbidden_targets

    transcript = "Coordinator noted slot seam routes convert third-and-long vs single-high."
    span = "slot seam routes convert third-and-long"
    s_idx = transcript.index(span)
    v_trip = verify_span_grounded_triple_with_pbp(
        transcript,
        {
            "player_name": "Puka Nacua",
            "team": "LAR",
            "verbatim_quote": span,
            "start_char": s_idx,
            "end_char": s_idx + len(span),
        },
        [0.45] * 14,
        [0.05] * 14,
        expected_direction=1,
    )
    assert v_trip["accepted"] is True

    dlt = project_broadcast_dlt_homography(
        [(0.0, 0.0), (100.0, 0.0), (100.0, 50.0), (0.0, 50.0)],
        [(0.0, 0.0), (50.0, 0.0), (50.0, 25.0), (0.0, 25.0)],
        [(50.0, 25.0)],
    )
    assert dlt["status"] == "CALIBRATED"
    assert dlt["field_coords_yds"][0] == pytest.approx((25.0, 12.5), abs=1e-2)

    reg = load_k01_to_k25_registry()
    assert reg.kernel_count == 25 and len(reg.manifest_sha256) == 64

    ap_ok, ap_v = assert_ap01_mondrian_monotonicity(
        {"fav": [0.55, 0.60, 0.68, 0.75]},
        {"fav": [0.54, 0.59, 0.67, 0.74]},
        {"fav": 0.015},
    )
    assert ap_ok and not ap_v
    guards = run_all_antipattern_guards(
        evaluated_dag_nodes=12,
        expected_dag_nodes=12,
        ol_pocket_survival=0.537,
        ol_starter_probs=(0.95, 0.94, 0.95, 0.93, 0.68),
        hawkes_n_eff=1.05,
        unique_primary_authors=2,
        chalk_gradient_norm=0.0,
        player_names=("J.Chase", "T.Higgins"),
        active_target_shares=(0.55, 0.45),
        spine_outs_count=2,
        spine_hessian_evaluated=True,
        regime_2026_active=True,
        model_constants=(1.75, 13.4),
        td_vmr=1.88,
        sgp_shootout_lambda_u=0.39,
        max_play_yds_simulated=28.0,
        remaining_field_yds=28.0,
        kneeldown_applied=True,
    )
    assert guards.passed is True

    with pytest.raises(SourceCannotSpeakAsOfError):
        enforce_bitemporal_asof_freeze(
            [BitemporalRecord("r1", 2026, 10, 2000, 1900, 1.0)],
            decision_timestamp_utc=1950,
        )
    folds = build_purged_embargoed_cpcv_folds([(2026, w) for w in range(1, 11)])
    assert len(folds) >= 1
    es = energy_score([[20.0, 25.0], [24.0, 23.0]], [22.0, 24.0])
    vs = variogram_score_p05([[20.0, 25.0], [24.0, 23.0]], [22.0, 24.0])
    assert es >= 0.0 and vs >= 0.0
    assert holm_bonferroni_stepdown([0.005, 0.04, 0.25]) == [True, False, False]

    rcpt = build_chained_rfc3161_receipt(
        pick_id="p1",
        timestamp_utc="2026-11-16T18:00:00Z",
        game_id="2026_10_LAC_BAL",
        odds_snapshot_sha256="a" * 64,
        model_dist_sha256="b" * 64,
        kernel_manifest_sha256=reg.manifest_sha256,
        prev_receipt_sha256="0" * 64,
    )
    assert len(rcpt["receipt_sha256"]) == 64 and math.isfinite(es)


def test_k04_k08_inline_te_kantorovich_and_ap_cpcv_seams() -> None:
    """Verify K04/K08 inline-TE pass-pro conservation, AP-03/12, and combinatorial CPCV."""
    from scripts.ops.gse_connected_game_workflow import redistribute_vacated_team_volume

    profs = [
        (0.62, 0.32, 0.04, 0.02, 12.0, 0.05, 0.08),
        (0.62, 0.32, 0.04, 0.02, 11.5, 0.05, 0.08),
        (0.08, 0.22, 0.66, 0.04, 7.5, 0.55, 0.24),
    ]
    r0 = (0.384, 0.336, 0.20)
    vac_tot = 1.0 - sum(r0)
    vac_12 = [0.0, 0.30 * vac_tot, 0.25 * vac_tot, 0.0, 0.25 * vac_tot, 0.20 * vac_tot]
    vac_12.extend([0.0] * 6)
    k04 = reallocate_12cell_kantorovich_vmls_roles(
        vacated_band_shares_v=vac_12,
        active_player_profiles=profs,
        base_shares_r0=r0,
        max_share_add_u=(0.18, 0.18, 0.04),
        has_liquid_two_sided_prop=(False, False, False),
        ol_distress=1.0,
    )
    new_sh = [float(v) for v in k04["r_new"]]
    assert float(k04["simplex_error"]) < 1e-12
    assert (new_sh[0] - r0[0]) > (new_sh[2] - r0[2])

    athletes = {
        "WR1": {"position": "WR"},
        "TE1": {"position": "TE"},
        "RB1": {"position": "RB"},
        "RB2": {"position": "RB"},
    }
    rec_4, rush_4 = redistribute_vacated_team_volume(
        rec_weights={"WR1": 30.0, "TE1": 18.0},
        rush_weights={"RB1": 70.0, "RB2": 30.0},
        athletes=athletes,
        team="TST",
        opp_f7_outs=4,
    )
    assert rush_4["RB1"] > 70.0
    named_rec = sum(v for k, v in rec_4.items() if k != "OTHER_TEAM_REC")
    assert named_rec / sum(rec_4.values()) == pytest.approx(0.95, abs=1e-9)

    ap_bad = run_all_antipattern_guards(
        evaluated_dag_nodes=12,
        expected_dag_nodes=12,
        ol_pocket_survival=0.537,
        ol_starter_probs=(0.95, 0.94, 0.95, 0.93, 0.68),
        hawkes_n_eff=1.05,
        unique_primary_authors=2,
        chalk_gradient_norm=0.0,
        player_names=("J.Chase", "T.Higgins"),
        active_target_shares=(0.55, 0.45),
        spine_outs_count=2,
        spine_hessian_evaluated=True,
        regime_2026_active=True,
        model_constants=(1.75, 13.4),
        td_vmr=1.88,
        sgp_shootout_lambda_u=0.39,
        max_play_yds_simulated=28.0,
        remaining_field_yds=28.0,
        kneeldown_applied=True,
        sql_query_sample="SELECT * FROM plays",
        used_undeflated_cherry_pick_z=True,
    )
    assert ap_bad.passed is False
    assert "AP03_UNBOUNDED_SQL_MISSING_LIMIT" in ap_bad.violations
    assert "AP12_UNDEFLATED_CHERRY_PICK_Z" in ap_bad.violations

    cpcv = build_purged_embargoed_cpcv_folds([(2026, w) for w in range(1, 13)])
    assert len(cpcv) >= 10


