"""
Unit tests for `intelligence.coaching.downloads_architecture_and_whitening_kernels`.
Verifies all 6 kernel families and exact numerical pins from the Downloads corpus.
"""

from __future__ import annotations

import math
from intelligence.coaching import downloads_architecture_and_whitening_kernels as dak


def test_conformal_whitening_live_pipeline_kernel() -> None:
    res = dak.run_conformal_whitening_live_pipeline_kernel()
    assert res["empirical_conformal_boundary_tau"] == 1.8432
    assert res["calibration_epoch_loss"] == 0.012431
    assert res["coverage_target"] == 0.90
    assert res["total_timesteps"] == 30
    assert res["nominal_steps"] + res["shock_steps"] == 30
    assert res["shock_steps"] > 0
    assert res["first_shock_timestep"] == 16
    assert len(res["cholesky_whitening"]["whitened_state_z_t"]) == 3


def test_bitemporal_dk_gpp_regret_kernel() -> None:
    res = dak.run_bitemporal_dk_gpp_regret_kernel("JAX", "BAL", num_sims=500, num_opponents=200)
    assert res["hermes_scale"] == 45.42
    assert res["wind_pass_penalty_yds_per_mph"] == -3.007
    assert res["td_negbin_vmr"] == 1.87
    assert res["student_t_copula_nu"] == 4.0
    assert res["mean_lineup_score"] > 80.0
    assert res["p85_lineup_score"] > res["mean_lineup_score"]
    assert 0.0 <= res["mean_field_win_equity"] <= 1.0
    assert res["portfolio_grade"]["n_lineups"] >= 1


def test_load_scaling_and_scheme_effects_kernel() -> None:
    assert math.isclose(dak.effective_n(0.20), 5.0, rel_tol=1e-6)
    assert math.isclose(dak.effective_n(0.10), 10.0, rel_tol=1e-6)
    assert dak.scale_dropoff(0.095, 0.159) == 0.1031
    assert dak.scale_dropoff(0.095, 0.087) == 0.0763

    res = dak.run_load_scaling_and_scheme_effects_kernel("JAX", "BAL")
    assert res["ftn_joined_plays_2026"] > 10000
    assert len(res["scheme_effects_2026"]) >= 6
    assert res["sinkhorn_log_stabilized"]["converged"] is True
    assert res["sinkhorn_log_stabilized"]["final_marginal_error"] <= 1e-6


def test_engine_reverse_and_betmgm_entry_kernel() -> None:
    res = dak.run_engine_reverse_and_betmgm_entry_kernel(-6.5, "JAX", "BAL")
    assert res["true_nfl_margin_sigma_pts"] == 13.36
    kernels = res["recovered_book_kernels"]
    assert kernels["BetMGM"]["sigma_recovered_pts"] == 12.07
    assert kernels["Pinnacle"]["sigma_recovered_pts"] == 12.21
    assert kernels["DraftKings"]["sigma_recovered_pts"] == 13.16
    assert kernels["BetMGM"]["monotone_verified"] is True
    assert res["sharp_money_divergences"]["oct27_slate_benchmarks"]["BUF_at_BAL_total_over"] == 40.0


def test_tau_hat_and_wave2_annex_kernel() -> None:
    res = dak.run_tau_hat_and_wave2_annex_kernel("JAX", "BAL")
    tau_info = res["tau_hat_walkforward_and_sim_consumer"]
    assert tau_info["tau_coach_sealed"] == 0.42
    assert tau_info["tau_rating_eb_dispersion"] == 4.6607
    assert tau_info["walkforward_candidate_delta_pp"] == 11.1585
    car_gb = res["dgrifka_process_meter_car_gb_repro"]
    assert car_gb["home_likely_points"] == 22.29
    assert car_gb["away_likely_points"] == 12.68
    assert car_gb["deserved_margin_home"] == 9.61


def test_belichick_and_sealed_architecture_kernel() -> None:
    res = dak.run_belichick_and_sealed_architecture_kernel("JAX", "BAL")
    assert math.isclose(res["gse_proprietary_seven"]["GSE_SII_pinned"], 0.05, abs_tol=1e-9)
    elo = res["fivethirtyeight_winner_signed_mov_step"]
    assert math.isclose(elo["e_prob1"], 0.7751528656, rel_tol=1e-8)
    assert math.isclose(elo["shift"], -46.5303407, rel_tol=1e-5)
    devig = res["five_method_devig_suite"]
    assert math.isclose(sum(devig["shin"]), 1.0, abs_tol=1e-5)
    assert math.isclose(sum(devig["power"]), 1.0, abs_tol=1e-5)
    assert math.isclose(sum(devig["odds_ratio"]), 1.0, abs_tol=1e-5)
    assert res["epistemic_and_pocket_gates"]["bitmask_288_xor_popcount"] == 2


def test_run_all_downloads_architecture_kernels() -> None:
    all_res = dak.run_all_downloads_architecture_kernels("JAX", "BAL")
    assert all_res["status"] == "ALL_6_DOWNLOADS_ARCHITECTURE_KERNELS_VERIFIED"
    for key in (
        "1_conformal_whitening_live_pipeline",
        "2_bitemporal_dk_gpp_regret",
        "3_load_scaling_and_scheme_effects",
        "4_engine_reverse_and_betmgm_entry",
        "5_tau_hat_and_wave2_annex",
        "6_belichick_and_sealed_architecture",
    ):
        assert key in all_res


def test_live_22_books_github_marketing_and_seo_aeo_engines() -> None:
    from intelligence.coaching.live_books_and_pdfs_executable_engine import (
        run_all_live_books_and_pdfs_engines,
    )

    res = run_all_live_books_and_pdfs_engines("JAX", "BAL", 9)
    assert res["engines_executed_count"] == 22
    mkt_seo = res["marketing_science_and_seo_aeo_geo_engine"]
    assert mkt_seo["ok"] is True
    assert mkt_seo["index_marketing_works_wired"] == 24
    assert mkt_seo["fader_hardie_clv_retention"]["bg_nbd_p_alive"] > 0.70
    assert mkt_seo["meridian_robyn_mmm"]["brand_search_suppressed_by_bnt_2015"] is True
    assert mkt_seo["kunzel_wager_athey_uplift"]["qini_efficiency_multiplier"] > 1.0
    assert mkt_seo["bass_goel_watts_virality"]["structural_virality_gain_over_broadcast"] > 1.2
    assert mkt_seo["thaler_sahni_behavioral"]["segregated_hedonic_lift_pct"] > 15.0
    assert mkt_seo["train_mixed_logit_demand"]["gse_total_market_capture"] > 0.70
    seo_audit = mkt_seo["seo_aeo_geo_ai_discovery"]
    assert seo_audit["llms_txt_route_wired"] is True
    assert seo_audit["llms_full_txt_route_wired"] is True
    assert seo_audit["ai_plugin_manifest_wired"] is True
    assert seo_audit["seo_jsonld_library_wired"] is True
    assert seo_audit["kdd_2024_geo_citation_authority_score"] >= 99.0

