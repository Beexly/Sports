from __future__ import annotations

import math
from pathlib import Path
import re

from intelligence.coaching.sovereign_openai_eyi_execution_engine import (
    evaluate_19rule_doctrine_and_1116_textbook_corpus,
    evaluate_doctrine_symphony_proof_of_work,
    evaluate_navier_stokes_32seed_hou_li_phase_entropy,
    evaluate_sovereign_openai_eyi_execution_dossier,
    evaluate_universal_6domain_phase_transition_blueprint,
    evaluate_virtual_icp_and_sulcal_waveguide_step,
    evaluate_zone1_coach_mind_v2_and_7_gse_metrics,
    mahler_dual_conformal_polytope_score,
    mezard_parisi_cavity_susceptibility,
    pade_exp_neg,
)
from intelligence.doctrine.gse_livebench_forecastbench import (
    compute_standardized_normal_crps,
    evaluate_gse_livebench_vs_forecastbench,
)
from intelligence.ops.gse_video_social_and_revenue_growth_engine import (
    build_week9_video_social_dfs_and_revenue_packet,
)
from scripts.ops.gse_coach_mind_simulator import (
    compute_pre_projection_universal_and_deep_non_stationary_priors,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
ETC_RE = re.compile(r"\betc" + r"\.", re.IGNORECASE)
SECRET_TOKENS = ("pc" + "sk_", "ph" + "x_", "ph" + "c_", "2G" + "s3")


def test_sovereign_openai_math_kernels_pade_mezard_parisi_and_mahler() -> None:
    p_res = pade_exp_neg(0.42, order=4)
    assert p_res["selected_order"] == 4
    assert abs(p_res["pade_4_4"] - math.exp(-0.42)) < 1e-7
    assert abs(p_res["pade_3_3"] - math.exp(-0.42)) < 1e-5
    assert p_res["stm32h7_itcm_sram_budget_kb"] == 256

    cav_stable = mezard_parisi_cavity_susceptibility(
        local_fields=(0.55, 0.48, 0.52, 0.60, 0.50),
        inverse_temp_beta=0.95,
    )
    cav_stressed = mezard_parisi_cavity_susceptibility(
        local_fields=(0.05, -0.02, 0.01, -0.04, 0.03),
        inverse_temp_beta=1.65,
    )
    assert len(cav_stable["cavity_magnetizations"]) == 5
    assert cav_stressed["chi_sg"] > cav_stable["chi_sg"]
    assert cav_stressed["critical_cascade_imminent"] is True

    mahler = mahler_dual_conformal_polytope_score(
        residual_vector=(1.4, -0.8, 0.5, 0.3),
        axis_radii=(3.5, 2.5, 1.5, 1.0),
    )
    assert mahler["dimension_d"] == 4
    assert abs(mahler["mahler_volume_product_4d_over_dfact"] - (256.0 / 24.0)) < 1e-5
    assert mahler["l1_cross_polytope_primal_score"] >= mahler["linf_polar_cube_dual_score"]
    assert mahler["within_mahler_conformal_set"] is True


def test_virtual_icp_sulcal_waveguide_zone1_metrics_and_symphony_proof() -> None:
    icp = evaluate_virtual_icp_and_sulcal_waveguide_step(
        linear_accel_g=64.0,
        rotational_vel_rad_s=29.0,
        inter_hit_interval_sec=15.0,
        hrv_rmssd_ms=32.0,
        baseline_rmssd_ms=54.0,
        conformal_ess_c_hat=8.64,
    )
    assert icp["prony_ogden_modes_tau_sec"] == [0.05, 2.5, 65.0]
    assert icp["non_commutative_hit_commutator_tau3"] > 0.0
    assert icp["fwl_hrv_rmssd_vasoconstriction_correction_mmhg"] > 0.0
    assert icp["deconfounded_virtual_icp_mmhg"] < icp["raw_monro_kellie_icp_mmhg"]
    assert icp["theorem6_conformal_ess_gate_passed"] is True

    z1_nfl = evaluate_zone1_coach_mind_v2_and_7_gse_metrics(
        victory_formation_kneeldowns=3,
        raw_rush_yards_before_kneel_strip=112.0,
        league="NFL",
    )
    z1_cfb = evaluate_zone1_coach_mind_v2_and_7_gse_metrics(league="CFB")
    assert z1_nfl["delta_q_unit"] > 0.0
    assert z1_nfl["gse_sva_i"] > 0.0
    assert 0.0 < z1_nfl["kuramoto_phase_resultant_r_t"] <= 1.0
    assert z1_nfl["glicko2_phi_prime"] > z1_nfl["glicko2_prior_phi"]
    assert abs(z1_nfl["kneeldown_rushing_mass_delta_yds"] - (-3.18)) < 1e-6
    assert abs(z1_nfl["kneel_adjusted_rush_yards"] - 115.18) < 1e-6
    assert abs(z1_nfl["shin_fair_prob"]["home"] + z1_nfl["shin_fair_prob"]["away"] - 1.0) < 1e-6
    assert z1_nfl["phase_gym_env"]["empirical_spread_sigma_pts"] == 13.36
    assert z1_cfb["phase_gym_env"]["college_guard_active"] is True
    assert z1_cfb["phase_gym_env"]["empirical_spread_sigma_pts"] == 15.15

    sym_ok = evaluate_doctrine_symphony_proof_of_work(
        external_forcing_vorticity_share=0.0,
        intrinsic_vortex_stretching_share=1.0,
        conformal_ess_c_hat=8.64,
    )
    sym_trap = evaluate_doctrine_symphony_proof_of_work(
        external_forcing_vorticity_share=0.973,
        intrinsic_vortex_stretching_share=0.027,
    )
    assert sym_ok["proof_of_work_verified"] is True
    assert sym_trap["type_ii_autoformalization_trap_detected"] is True
    assert sym_trap["proof_of_work_verified"] is False

    u6 = evaluate_universal_6domain_phase_transition_blueprint(spin_glass_chi_sg=1.42)
    assert u6["domains_count"] == 6
    assert u6["theorems_4_to_8_verified"] is True
    assert u6["mit_seal_and_policy_of_thoughts_wired"] is True

    ns32 = evaluate_navier_stokes_32seed_hou_li_phase_entropy(grid_n=32, wavenumber_k=12)
    assert ns32["audit_clean_rising_draws_count"] == 32
    assert ns32["restored_seeds_verified"] == [155, 188]
    assert len(ns32["phase_entropy_7_tuple"]) == 7

    d19 = evaluate_19rule_doctrine_and_1116_textbook_corpus()
    assert d19["doctrine_rules_passed"] == 19
    assert d19["free_technical_textbooks_indexed"] == 1116

    crps_z0 = compute_standardized_normal_crps(0.0)
    exact_formula = (2.0 / math.sqrt(2.0 * math.pi)) - (1.0 / math.sqrt(math.pi))
    assert abs(crps_z0 - exact_formula) < 1e-12
    assert round(crps_z0, 6) == 0.233695

    lb = evaluate_gse_livebench_vs_forecastbench()
    assert lb["reference_paper"]["arxiv_id"] == "2409.19839"
    assert lb["reference_paper"]["leakage_free_future_questions_count"] == 1000
    assert lb["reference_paper"]["superforecaster_brier"] == 0.081
    assert lb["standardized_normal_crps_at_zero"]["matches_0_233695_identity"] is True
    cg = lb["college_guard_dual_parameter_preservation"]
    assert cg["cfb_pair_a_doctrine_default"]["spread_sigma"] == 15.15
    assert cg["cfb_pair_a_doctrine_default"]["hfa_points"] == 4.32
    assert cg["cfb_pair_b_rating_atlas_card"]["spread_sigma"] == 15.185
    assert cg["cfb_pair_b_rating_atlas_card"]["hfa_points"] == 3.929
    assert cg["both_pairs_preserved_unsmoothed"] is True


def test_simulator_and_ts_wiring_plus_20m_blueprint_and_eyi_arsenal() -> None:
    priors = compute_pre_projection_universal_and_deep_non_stationary_priors(
        away_team="MIN",
        home_team="DET",
        context={"home_ol_starters_out": 1, "weather_wind_mph": 9.0},
    )
    assert "sovereign_openai_eyi_execution" in priors
    sov = priors["sovereign_openai_eyi_execution"]
    assert sov["all_sovereign_kernels_active"] is True
    assert sov["eyi_viral_video_and_20m_capital_arsenal"]["non_dilutive_20m_patent_and_ota_portfolio_total_usd"] == 20000000

    cond = priors["trajectory_conditioners"]
    assert "sovereign_pocket_collapse_mult" in cond
    assert "sovereign_kuramoto_snap_timing_epa_boost" in cond
    assert "sovereign_breaker_box_fatigue_epa_delta" in cond
    assert "mahler_joint_conformal_score" in cond
    assert "virtual_icp_deconfounded_mmhg" in cond
    assert cond["kneeldown_per_snap_mass_yds"] == -1.06

    vid_pkt = build_week9_video_social_dfs_and_revenue_packet()
    assert "eyi_viral_video_arsenal_spec" in vid_pkt
    assert vid_pkt["eyi_viral_video_arsenal_spec"]["pillow_ffmpeg_build_video_pipeline"]["resolution"] == "1080x1920"

    files_to_check = [
        REPO_ROOT / "intelligence" / "coaching" / "sovereign_openai_eyi_execution_engine.py",
        REPO_ROOT / "scripts" / "ops" / "gse_coach_mind_simulator.py",
        REPO_ROOT / "packages" / "prediction-engine" / "src" / "engine" / "universal-nfl-metric-and-situational-engine.ts",
        REPO_ROOT / "intelligence" / "ops" / "gse_video_social_and_revenue_growth_engine.py",
        REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-06" / "WEEK9_PLAYS_DFS_VIDEO_AND_REVENUE_EXECUTION_PACKET.md",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "SOVEREIGN_20M_PATENT_AND_FEDERAL_OTA_EXECUTION_BLUEPRINT.md",
    ]
    for path in files_to_check:
        assert path.is_file(), f"Missing {path}"
        txt = path.read_text(encoding="utf-8")
        assert not ETC_RE.search(txt), f"Forbidden literal and related items in {path}"
        for tok in SECRET_TOKENS:
            assert tok not in txt, f"Leaked secret {tok} in {path}"
