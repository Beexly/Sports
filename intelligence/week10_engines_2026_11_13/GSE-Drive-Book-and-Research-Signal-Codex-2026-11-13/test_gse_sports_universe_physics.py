"""
Comprehensive Unit & Property Test Suite for GSE + GSI Sports Universe Physics,
Scheme Geometry, Market Microstructure & 72-Signal Master Registry
================================================================================
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import sys
import unittest

OUTPUT_DIR = Path(__file__).resolve().parent
if str(OUTPUT_DIR) not in sys.path:
    sys.path.insert(0, str(OUTPUT_DIR))

import gse_sports_universe_physics_and_situations as gse  # noqa: E402


EXPECTED_25_PACKAGES = {
    "packages/ai-council",
    "packages/compliance",
    "packages/crypto",
    "packages/data-ingestion",
    "packages/db",
    "packages/dev-tools",
    "packages/epistemic-twin",
    "packages/feature-store",
    "packages/galaxy-conformal-ot",
    "packages/genesis-kernel",
    "packages/governed",
    "packages/ingestion-pipeline",
    "packages/mcp-equations-server",
    "packages/ops",
    "packages/partner-stack",
    "packages/phase-c",
    "packages/polymarket-sdks",
    "packages/prediction-engine",
    "packages/quote-plane",
    "packages/ranking",
    "packages/sql",
    "packages/stats-api",
    "packages/types",
    "packages/util",
    "packages/verifier",
}

EXPECTED_GSI_KERNELS = {
    "gsi_sepsis_intervention_kernel.py",
    "gsi_cte_viscoelastic_waveguide_kernel.hpp",
    "gsi_virtual_icp_mahler_kernel.hpp",
    "gsi_telemetry_frame.hpp",
}


class TestStadiumPsychrometricsAndBallistics(unittest.TestCase):
    def test_01_humid_air_is_strictly_lighter_than_dry_air(self) -> None:
        """Dalton + Ideal Gas Law: H2O molar mass (18.016) < dry air (28.965) => humid air has LOWER density!"""
        rho_dry = gse.humid_air_density_kg_m3(temp_c=30.0, pressure_hpa=1013.25, rel_humidity_pct=0.0)
        rho_mid = gse.humid_air_density_kg_m3(temp_c=30.0, pressure_hpa=1013.25, rel_humidity_pct=50.0)
        rho_humid = gse.humid_air_density_kg_m3(temp_c=30.0, pressure_hpa=1013.25, rel_humidity_pct=95.0)
        self.assertGreater(rho_dry, rho_mid)
        self.assertGreater(rho_mid, rho_humid)
        self.assertAlmostEqual(rho_dry, 1.1644, places=3)

    def test_02_magnus_saturation_vapor_pressure_monotone_in_temperature(self) -> None:
        es_0 = gse.magnus_saturation_vapor_pressure_hpa(0.0)
        es_20 = gse.magnus_saturation_vapor_pressure_hpa(20.0)
        es_35 = gse.magnus_saturation_vapor_pressure_hpa(35.0)
        self.assertAlmostEqual(es_0, 6.1078, places=4)
        self.assertGreater(es_20, es_0 * 3.5)
        self.assertGreater(es_35, es_20 * 2.2)

    def test_03_cold_dry_lambeau_denser_than_hot_humid_miami(self) -> None:
        rho_lambeau = gse.humid_air_density_kg_m3(
            temp_c=-8.0,
            pressure_hpa=gse.barometric_pressure_at_altitude_hpa(195.0),
            rel_humidity_pct=45.0,
        )
        rho_miami = gse.humid_air_density_kg_m3(
            temp_c=31.0,
            pressure_hpa=gse.barometric_pressure_at_altitude_hpa(3.0),
            rel_humidity_pct=82.0,
        )
        self.assertGreater(rho_lambeau, rho_miami * 1.10)

    def test_04_barometric_pressure_altitude_venues_denver_mexico_munich(self) -> None:
        p_sea = gse.barometric_pressure_at_altitude_hpa(0.0)
        p_munich = gse.barometric_pressure_at_altitude_hpa(520.0)
        p_denver = gse.barometric_pressure_at_altitude_hpa(1609.0)
        p_mexico = gse.barometric_pressure_at_altitude_hpa(2200.0)
        self.assertAlmostEqual(p_sea, 1013.25, places=2)
        self.assertTrue(948.0 < p_munich < 956.0)
        self.assertTrue(830.0 < p_denver < 840.0)
        self.assertTrue(770.0 < p_mexico < 782.0)

    def test_05_altitude_drag_reduction_ordering_sea_munich_denver_mexico_city(self) -> None:
        sea = gse.simulate_3d_ballistics(67.0, 44.0, temp_c=20.0, elevation_m=0.0, rel_humidity_pct=40.0)
        munich = gse.simulate_3d_ballistics(67.0, 44.0, temp_c=20.0, elevation_m=520.0, rel_humidity_pct=40.0)
        denver = gse.simulate_3d_ballistics(67.0, 44.0, temp_c=20.0, elevation_m=1609.0, rel_humidity_pct=40.0)
        mexico = gse.simulate_3d_ballistics(67.0, 44.0, temp_c=20.0, elevation_m=2200.0, rel_humidity_pct=40.0)

        self.assertLess(sea.carry_yards, munich.carry_yards)
        self.assertLess(munich.carry_yards, denver.carry_yards)
        self.assertLess(denver.carry_yards, mexico.carry_yards)
        self.assertGreater(denver.carry_yards - sea.carry_yards, 3.0)
        self.assertGreater(denver.drag_reduction_pct_vs_iso, 15.0)
        self.assertGreater(mexico.drag_reduction_pct_vs_iso, 22.0)

    def test_06_crosswind_lateral_drift_symmetry_and_upright_miss(self) -> None:
        calm = gse.simulate_3d_ballistics(
            67.0, 44.0, temp_c=15.0, wind_speed_mph=0.0, target_distance_yards=53.0
        )
        right_gale = gse.simulate_3d_ballistics(
            67.0, 44.0, temp_c=15.0, wind_speed_mph=24.0, wind_Azimuth_rel_deg=90.0, target_distance_yards=53.0
        )
        left_gale = gse.simulate_3d_ballistics(
            67.0, 44.0, temp_c=15.0, wind_speed_mph=24.0, wind_Azimuth_rel_deg=-90.0, target_distance_yards=53.0
        )
        self.assertAlmostEqual(calm.lateral_drift_yards, 0.0, places=5)
        self.assertTrue(calm.within_uprights)
        self.assertAlmostEqual(right_gale.lateral_drift_yards, -left_gale.lateral_drift_yards, places=4)
        self.assertGreater(right_gale.lateral_drift_yards, gse.NFL_GOALPOST_HALF_WIDTH_YD)
        self.assertFalse(right_gale.within_uprights)

    def test_07_deep_pass_headwind_vs_tailwind_carry_differential(self) -> None:
        tailwind = gse.simulate_3d_ballistics(
            58.0, 32.0, temp_c=18.0, wind_speed_mph=18.0, wind_Azimuth_rel_deg=0.0, mode="deep_pass", target_distance_yards=45.0
        )
        headwind = gse.simulate_3d_ballistics(
            58.0, 32.0, temp_c=18.0, wind_speed_mph=18.0, wind_Azimuth_rel_deg=180.0, mode="deep_pass", target_distance_yards=45.0
        )
        self.assertGreater(tailwind.carry_yards, headwind.carry_yards + 7.5)

    def test_08_stull_wet_bulb_equals_dry_bulb_at_100_pct_humidity(self) -> None:
        twb_sat = gse.stull_wet_bulb_temp_c(20.0, 100.0)
        twb_arid = gse.stull_wet_bulb_temp_c(20.0, 20.0)
        self.assertAlmostEqual(twb_sat, 20.0, delta=0.35)
        self.assertLess(twb_arid, 11.5)

    def test_09_wet_bulb_cold_grip_fumble_and_dome_fg_boost(self) -> None:
        dome_sig = gse.wet_bulb_cold_grip_fumble_and_fg_adjustment(
            kick_distance_yards=52.0,
            temp_f=22.0,
            rel_humidity_pct=85.0,
            wind_speed_mph=22.0,
            precip_in_hr=0.30,
            is_indoor=True,
            home_kicker_dome_specialist=True,
        )
        blizzard_sig = gse.wet_bulb_cold_grip_fumble_and_fg_adjustment(
            kick_distance_yards=52.0,
            temp_f=22.0,
            rel_humidity_pct=85.0,
            wind_speed_mph=22.0,
            precip_in_hr=0.30,
            is_indoor=False,
        )
        self.assertGreater(dome_sig.value, blizzard_sig.value + 0.25)
        self.assertEqual(dome_sig.metadata["fumble_rate_multiplier"], 1.0)
        self.assertGreater(blizzard_sig.metadata["fumble_rate_multiplier"], 1.25)
        self.assertIn(blizzard_sig.home_sign, (-1, 1))
        self.assertLessEqual(abs(blizzard_sig.delta_log_odds), gse.MAX_STAGE_D_ABS_LOG_ODDS)


class TestTrenchAndPocketPhysics(unittest.TestCase):
    def test_10_weak_link_dominance_over_arithmetic_mean(self) -> None:
        """One turnstile backup LT (grade 38) hurts pocket survival far more than balanced 74-grade OL."""
        rusher_rates = [0.22, 0.14, 0.12, 0.14, 0.22]
        balanced_ol = gse.ol_pass_block_survival_hazard([74, 74, 74, 74, 74], rusher_rates, eval_time_s=2.8)
        weak_link_ol = gse.ol_pass_block_survival_hazard([38, 83, 83, 83, 83], rusher_rates, eval_time_s=2.8)

        self.assertLess(weak_link_ol.joint_weak_link_survival, balanced_ol.joint_weak_link_survival - 0.08)
        self.assertGreater(weak_link_ol.weak_link_nonlinear_penalty, 0.08)
        self.assertEqual(weak_link_ol.weakest_lineman_index, 0)
        self.assertGreater(weak_link_ol.strong_link_parallel_survival, weak_link_ol.joint_weak_link_survival)

    def test_11_interior_pressure_collapses_faster_than_edge_at_matched_grade(self) -> None:
        res = gse.ol_pass_block_survival_hazard(
            [75, 75, 75, 75, 75], [0.20, 0.20, 0.20, 0.20, 0.20], protection_scheme="5_0_bob", eval_time_s=2.7
        )
        self.assertLess(res.per_blocker_survival[1], res.per_blocker_survival[0])
        self.assertLess(res.per_blocker_survival[3], res.per_blocker_survival[4])

    def test_12_bob_5_0_stunt_vulnerability_vs_half_slide(self) -> None:
        grades = [75, 72, 76, 71, 74]
        prwrs = [0.18, 0.16, 0.14, 0.16, 0.18]
        bob_stunt = gse.ol_pass_block_survival_hazard(
            grades, prwrs, protection_scheme="5_0_bob", eval_time_s=2.7, stunt_twist_active=True
        )
        slide_stunt = gse.ol_pass_block_survival_hazard(
            grades, prwrs, protection_scheme="half_slide_left", eval_time_s=2.7, stunt_twist_active=True
        )
        self.assertLess(bob_stunt.joint_weak_link_survival, slide_stunt.joint_weak_link_survival)

    def test_13_pocket_survival_monotone_decreasing_with_hold_time(self) -> None:
        grades = [78, 74, 80, 73, 77]
        prwrs = [0.16, 0.13, 0.11, 0.14, 0.18]
        s_20 = gse.ol_pass_block_survival_hazard(grades, prwrs, eval_time_s=2.0).joint_weak_link_survival
        s_30 = gse.ol_pass_block_survival_hazard(grades, prwrs, eval_time_s=3.0).joint_weak_link_survival
        s_40 = gse.ol_pass_block_survival_hazard(grades, prwrs, eval_time_s=4.0).joint_weak_link_survival
        self.assertGreater(s_20, s_30)
        self.assertGreater(s_30, s_40)

    def test_14_clipp_doubly_robust_cate_negative_and_overlap_guard(self) -> None:
        res = gse.clipp_doubly_robust_cate(
            treatments_pressure_allowed=[1, 0, 1, 0, 1, 0, 1, 0],
            outcomes_completed_pass=[0, 1, 0, 1, 1, 1, 0, 0],
            propensity_scores=[0.35, 0.30, 0.42, 0.28, 0.38, 0.31, 0.45, 0.25],
            mu1_hat_completion_under_pressure=[0.36, 0.38, 0.34, 0.40, 0.37, 0.39, 0.33, 0.41],
            mu0_hat_completion_clean=[0.69, 0.71, 0.67, 0.72, 0.70, 0.71, 0.66, 0.73],
        )
        self.assertLess(res["cate_completion_prob_delta"], -0.20)
        with self.assertRaises(gse.DataGapError):
            gse.clipp_doubly_robust_cate([1], [0], [0.999], [0.4], [0.7])

    def test_15_seth_expected_sack_proximity_and_position_ordering(self) -> None:
        close_olb = gse.seth_expected_sack_probability(4.2, 4.5, "EDGE_34_OLB", yards_to_go=10.0)
        far_olb = gse.seth_expected_sack_probability(9.5, 4.5, "EDGE_34_OLB", yards_to_go=10.0)
        close_cb = gse.seth_expected_sack_probability(4.2, 4.5, "CORNER_BLITZ", yards_to_go=10.0)
        overload_olb = gse.seth_expected_sack_probability(4.2, 4.5, "EDGE_34_OLB", yards_to_go=10.0, extra_rushers_over_blockers=1)
        self.assertGreater(close_olb, far_olb)
        self.assertGreater(close_olb, close_cb)
        self.assertGreater(overload_olb, close_olb)

    def test_16_la_pausa_optimal_delay_beats_premature_checkdown_and_panic_sack_cliff(self) -> None:
        grades = [82, 78, 84, 79, 81]
        prwrs = [0.13, 0.11, 0.10, 0.12, 0.14]

        premature = gse.la_pausa_optimal_release_timing(
            grades, prwrs, actual_release_time_s=1.85, route_profile="shanahan_levels_pa", qb_pocket_climb_iq=0.80
        )
        la_pausa_sweet = gse.la_pausa_optimal_release_timing(
            grades, prwrs, actual_release_time_s=2.75, route_profile="shanahan_levels_pa", qb_pocket_climb_iq=0.80
        )
        panic_cliff = gse.la_pausa_optimal_release_timing(
            [62, 60, 64, 58, 61],
            [0.26, 0.22, 0.18, 0.24, 0.28],
            actual_release_time_s=4.15,
            route_profile="shanahan_levels_pa",
            qb_pocket_climb_iq=0.25,
        )

        self.assertGreater(la_pausa_sweet.value, premature.value)
        self.assertEqual(la_pausa_sweet.metadata["archetype"], "STRATEGIC_LA_PAUSA")
        self.assertEqual(premature.metadata["archetype"], "PREMATURE_CHECKDOWN")
        self.assertEqual(panic_cliff.metadata["archetype"], "PANIC_SACK_CLIFF")
        self.assertLess(panic_cliff.value, -0.25)

    def test_17_la_pausa_spatial_selection_penalty_when_missing_open_target(self) -> None:
        grades = [80, 78, 82, 77, 80]
        prwrs = [0.14, 0.12, 0.10, 0.12, 0.15]
        optimal_target = gse.la_pausa_optimal_release_timing(
            grades, prwrs, actual_release_time_s=2.70, spatial_target_efficiency=1.0
        )
        suboptimal_target = gse.la_pausa_optimal_release_timing(
            grades, prwrs, actual_release_time_s=2.70, spatial_target_efficiency=0.55
        )
        self.assertGreater(optimal_target.value, suboptimal_target.value)
        self.assertLess(suboptimal_target.metadata["spatial_selection_epa"], 0.0)


class TestSchemeCoverageAndBiomechanicalKernels(unittest.TestCase):
    def test_18_fangio_quarters_caps_four_verts_but_yields_counter_and_pa_levels(self) -> None:
        verts_vs_qtrs = gse.fangio_mofo_vs_shanahan_mcvay_conflict(
            "COVER_4_QUARTERS", "four_verticals", personnel_code="11", pre_snap_motion="none"
        )
        verts_vs_c3 = gse.fangio_mofo_vs_shanahan_mcvay_conflict(
            "COVER_3_MOFC", "four_verticals", personnel_code="11", pre_snap_motion="none"
        )
        counter_vs_c6 = gse.fangio_mofo_vs_shanahan_mcvay_conflict(
            "COVER_6_QQH", "counter_gap_run", personnel_code="21", pre_snap_motion="jet_orbit"
        )
        pa_levels_uc = gse.fangio_mofo_vs_shanahan_mcvay_conflict(
            "COVER_4_QUARTERS", "pa_levels_y_cross", personnel_code="21", pre_snap_motion="jet_orbit", under_center=True
        )
        self.assertLess(verts_vs_qtrs.value, 0.0)
        self.assertGreater(verts_vs_c3.value, 0.15)
        self.assertGreater(counter_vs_c6.value, 0.15)
        self.assertGreater(pa_levels_uc.value, 0.25)

    def test_19_cover9_weak_rotation_cuts_off_crossers_better_than_base_cover6(self) -> None:
        vs_c6 = gse.fangio_mofo_vs_shanahan_mcvay_conflict(
            "COVER_6_QQH", "pa_levels_y_cross", personnel_code="11", pre_snap_motion="none", safety_run_fit_iq=0.85
        )
        vs_c9 = gse.fangio_mofo_vs_shanahan_mcvay_conflict(
            "COVER_9_HQQ", "pa_levels_y_cross", personnel_code="11", pre_snap_motion="none", safety_run_fit_iq=0.85
        )
        self.assertLess(vs_c9.value, vs_c6.value)

    def test_20_spags_cover0_and_drop8_rat_bluff_vs_qb_hot_iq(self) -> None:
        elite_qb_vs_c0 = gse.spags_simulated_pressure_and_cover0_matrix(
            "COVER_0_ALL_OUT", "half_slide", qb_hot_sight_adjust_iq=0.92, wr_hot_win_rate=0.85
        )
        rookie_qb_vs_c0 = gse.spags_simulated_pressure_and_cover0_matrix(
            "COVER_0_ALL_OUT", "half_slide", qb_hot_sight_adjust_iq=0.25, wr_hot_win_rate=0.45, overload_four_weak=True
        )
        rookie_qb_vs_drop8 = gse.spags_simulated_pressure_and_cover0_matrix(
            "DROP_8_TAMPA2_RAT", "half_slide", qb_hot_sight_adjust_iq=0.20, wr_hot_win_rate=0.50
        )
        self.assertGreater(elite_qb_vs_c0.value, 0.10)
        self.assertLess(rookie_qb_vs_c0.value, -0.25)
        self.assertLess(rookie_qb_vs_drop8.value, -0.15)

    def test_21_red_zone_field_compression_favors_horizontal_china_and_goal_line_jumbo(self) -> None:
        vert_at_4 = gse.red_zone_compressed_field_efficiency(4.0, "vertical_go_post")
        china_at_4 = gse.red_zone_compressed_field_efficiency(4.0, "horizontal_mesh_china_stick", te_redzone_dominance=0.85)
        jumbo_at_1 = gse.red_zone_compressed_field_efficiency(1.0, "heavy_gap_jumbo_run")
        q52_boosted = gse.red_zone_compressed_field_efficiency(
            8.0, "horizontal_mesh_china_stick", def_zone_delta_epa=0.31, te_redzone_dominance=0.90
        )
        self.assertLess(vert_at_4.value, -0.15)
        self.assertGreater(china_at_4.value, 0.12)
        self.assertGreater(jumbo_at_1.value, 0.20)
        self.assertGreater(q52_boosted.value, china_at_4.value)

    def test_22_zaidi_vivit_whim_sulcal_strain_accumulation_inside_65s_relaxation_window(self) -> None:
        single_hit = gse.zaidi_vivit_whim_tackling_biomechanics(0.70, linear_accel_g=45.0, rotational_vel_rad_s=22.0)
        rapid_second_hit = gse.zaidi_vivit_whim_tackling_biomechanics(
            0.75,
            linear_accel_g=45.0,
            rotational_vel_rad_s=22.0,
            seconds_since_prior_hit=18.0,
            prior_residual_strain=single_hit.value,
        )
        rested_second_hit = gse.zaidi_vivit_whim_tackling_biomechanics(
            0.75,
            linear_accel_g=45.0,
            rotational_vel_rad_s=22.0,
            seconds_since_prior_hit=1200.0,
            prior_residual_strain=single_hit.value,
        )
        self.assertGreater(rapid_second_hit.value, rested_second_hit.value)
        self.assertTrue(rapid_second_hit.metadata["cavitation_alert"])


class TestMarketMicrostructureAndPolymarketExecution(unittest.TestCase):
    def test_23_shin_devig_exact_on_symmetric_minus_110(self) -> None:
        p1, p2, z = gse.shin_devig_probabilities(-110, -110)
        self.assertAlmostEqual(p1, 0.50, places=6)
        self.assertAlmostEqual(p2, 0.50, places=6)
        self.assertAlmostEqual(z, 0.047619, places=5)

    def test_24_shin_devig_favorite_longshot_asymmetry_and_crossed_book_guard(self) -> None:
        pf, pd, z_skew = gse.shin_devig_probabilities(-300, +240)
        self.assertAlmostEqual(pf + pd, 1.0, places=9)
        q_f = 1.0 / gse.american_to_decimal_odds(-300)
        q_d = 1.0 / gse.american_to_decimal_odds(+240)
        mult_pd = q_d / (q_f + q_d)
        self.assertLess(pd, mult_pd)
        self.assertGreater(z_skew, 0.0)

        with self.assertRaises(gse.DataGapError):
            gse.shin_devig_probabilities(+115, +115)

    def test_25_dmochowski_profit_bias_three_channels(self) -> None:
        no_shade = gse.dmochowski_profit_bias_identity(
            true_home_win_prob=0.60,
            book_implied_home_prob_raw=0.60,
            book_hold=0.045,
            expected_public_home_handle_share=0.78,
            cov_home_share_home_win=0.0,
        )
        self.assertAlmostEqual(no_shade["shading_times_lean_channel"], 0.0, places=8)
        self.assertAlmostEqual(no_shade["expected_book_margin"], 0.045, places=8)

        shaded_lean = gse.dmochowski_profit_bias_identity(
            true_home_win_prob=0.58,
            book_implied_home_prob_raw=0.61,
            book_hold=0.045,
            expected_public_home_handle_share=0.80,
            cov_home_share_home_win=0.0,
        )
        self.assertGreater(shaded_lean["shading_times_lean_channel"], 0.01)
        self.assertGreater(shaded_lean["expected_book_margin"], no_shade["expected_book_margin"])

    def test_26_steam_vs_stale_recreational_book_lag_detection(self) -> None:
        sig = gse.steam_vs_stale_book_lag_detector(
            sharp_prev_american_home=-115,
            sharp_curr_american_home=-155,
            sharp_curr_american_away=+136,
            rec_stale_american_home=-110,
            rec_stale_american_away=-110,
            move_elapsed_seconds=45.0,
            synchronized_sharp_books_count=3,
        )
        self.assertTrue(sig.metadata["is_confirmed_steam"])
        self.assertEqual(sig.home_sign, 1)
        self.assertGreater(sig.value, 0.05)

    def test_27_key_number_conditional_mass_competing_3_vs_7_by_total(self) -> None:
        low_total = gse.key_number_derivative_pricer(fair_fav_spread_margin=3.0, game_total=36.5)
        high_total = gse.key_number_derivative_pricer(fair_fav_spread_margin=3.0, game_total=54.5)

        self.assertGreater(low_total["p_abs_margin_3"], high_total["p_abs_margin_3"])
        self.assertGreater(high_total["p_abs_margin_7"], low_total["p_abs_margin_7"])
        self.assertGreater(high_total["sigma_conditional"], low_total["sigma_conditional"])
        self.assertGreater(low_total["half_pt_prob_gain_3_0_to_2_5"], 0.04)
        self.assertGreater(low_total["wong_teaser_dog_2_5_to_8_5_win_prob"], 0.72)

    def test_28_overtime_probability_higher_in_coin_flip_spreads_than_blowouts(self) -> None:
        close_game = gse.key_number_derivative_pricer(fair_fav_spread_margin=1.5, game_total=45.0)
        big_spread = gse.key_number_derivative_pricer(fair_fav_spread_margin=9.5, game_total=45.0)
        self.assertGreater(close_game["p_overtime"], big_spread["p_overtime"])
        self.assertGreater(close_game["ot_expected_total_points_added"], 0.35)

    def test_29_clv_alpha_decay_monotone_from_tuesday_to_sunday_t90m(self) -> None:
        tue = gse.clv_alpha_decay_curve(0.0, initial_edge_points=2.0, market_tier="nfl_side")
        thu = gse.clv_alpha_decay_curve(48.0, initial_edge_points=2.0, market_tier="nfl_side")
        sat = gse.clv_alpha_decay_curve(96.0, initial_edge_points=2.0, market_tier="nfl_side")
        sun_t90 = gse.clv_alpha_decay_curve(127.0, initial_edge_points=2.0, market_tier="nfl_side")

        self.assertAlmostEqual(tue["alpha_retained_fraction"], 1.0, places=5)
        self.assertGreater(tue["remaining_expected_clv_points"], thu["remaining_expected_clv_points"])
        self.assertGreater(thu["remaining_expected_clv_points"], sat["remaining_expected_clv_points"])
        self.assertGreater(sat["remaining_expected_clv_points"], sun_t90["remaining_expected_clv_points"])

        prop_sat = gse.clv_alpha_decay_curve(96.0, initial_edge_points=2.0, market_tier="nfl_player_prop")
        self.assertGreater(prop_sat["alpha_retained_fraction"], sat["alpha_retained_fraction"])

    def test_30_cross_venue_polymarket_divergence_and_cavitation_guard(self) -> None:
        div = gse.cross_venue_polymarket_divergence_detector(
            polymarket_yes_ask=0.51,
            polymarket_no_ask=0.50,
            polymarket_depth_usd=45000.0,
            sharp_book_american_home=-165,
            sharp_book_american_away=+145,
            rec_book_american_home=-160,
            rec_book_american_away=+150,
        )
        self.assertEqual(div.home_sign, 1)
        self.assertTrue(div.metadata["has_structural_arb"])
        self.assertEqual(div.metadata["regime"], "STRUCTURAL_ARB")
        self.assertGreater(div.metadata["half_kelly_stake_fraction"], 0.01)

        with self.assertRaises(gse.DataGapError):
            gse.cross_venue_polymarket_divergence_detector(
                polymarket_yes_ask=0.50,
                polymarket_no_ask=0.51,
                polymarket_depth_usd=400.0,
                sharp_book_american_home=-110,
                sharp_book_american_away=-110,
            )


class TestDoctrineGuardsAndMasterRegistry(unittest.TestCase):
    def test_31_fail_closed_datagap_on_nan_none_bool_and_bounds(self) -> None:
        with self.assertRaises(gse.DataGapError):
            gse.humid_air_density_kg_m3(float("nan"), 1013.25, 50.0)
        with self.assertRaises(gse.DataGapError):
            gse.humid_air_density_kg_m3(float("inf"), 1013.25, 50.0)
        with self.assertRaises(gse.DataGapError):
            gse.humid_air_density_kg_m3(None, 1013.25, 50.0)  # type: ignore[arg-type]
        with self.assertRaises(gse.DataGapError):
            gse.humid_air_density_kg_m3(True, 1013.25, 50.0)  # type: ignore[arg-type]
        with self.assertRaises(gse.DataGapError):
            gse.american_to_decimal_odds(-50.0)

    def test_32_bitemporal_leakage_guard_rejects_future_observation(self) -> None:
        with self.assertRaises(gse.BitemporalLeakageError):
            gse.wet_bulb_cold_grip_fumble_and_fg_adjustment(
                45.0, 55.0, 50.0, 10.0,
                observed_at_epoch_ms=1763050005000,
                decision_timestamp_epoch_ms=1763050000000,
            )

    def test_33_matchup_signal_bundle_end_to_end_and_log_odds_cap(self) -> None:
        bundle = gse.produce_matchup_signal_bundle(
            venue_code="DEN",
            temp_f=48.0,
            rel_humidity_pct=28.0,
            wind_speed_mph=9.0,
            precip_in_hr=0.0,
            ol_pass_block_grades=[80, 75, 82, 74, 78],
            rusher_prwr_rates=[0.16, 0.12, 0.11, 0.14, 0.17],
            actual_release_time_s=2.72,
            coverage_shell="COVER_6_QQH",
            offensive_concept="pa_levels_y_cross",
            polymarket_yes_ask=0.56,
            polymarket_no_ask=0.46,
            polymarket_depth_usd=25000.0,
            sharp_american_home=-145,
            sharp_american_away=+128,
            observed_at_epoch_ms=1763040000000,
            decision_timestamp_epoch_ms=1763045000000,
        )
        self.assertEqual(len(bundle), 4)
        for sig in bundle:
            self.assertIn(sig.home_sign, (-1, 1))
            self.assertLessEqual(abs(sig.delta_log_odds), gse.MAX_STAGE_D_ABS_LOG_ODDS)

    def test_34_intelligence_signals_master_registry_schema_and_full_coverage(self) -> None:
        reg_path = OUTPUT_DIR / "intelligence_signals_master_registry.json"
        self.assertTrue(reg_path.exists(), f"Missing {reg_path}")
        payload = json.loads(reg_path.read_text(encoding="utf-8"))

        signals = payload["signals"]
        self.assertGreaterEqual(len(signals), 60, "Must map 60+ concrete signals")
        self.assertEqual(len(signals), 72)

        required_fields = {
            "signal_id",
            "domain",
            "source_drive_doc_or_book",
            "source_drive_file_id",
            "source_drive_url",
            "equation_summary",
            "target_monorepo_package",
            "producer",
            "wired_state",
            "weight",
            "weight_rationale_path",
            "gate",
            "evidence_path",
            "homeSign",
            "license",
            "source_data_committed",
            "requires_arxiv_fulltext",
            "manifest_path",
        }

        seen_ids: set[str] = set()
        seen_packages: set[str] = set()
        seen_gsi_kernels: set[str] = set()

        for s in signals:
            self.assertTrue(required_fields.issubset(s.keys()), f"Missing keys in {s.get('signal_id')}")
            sid = s["signal_id"]
            self.assertNotIn(sid, seen_ids, f"Duplicate signal_id: {sid}")
            seen_ids.add(sid)

            self.assertIn(s["gate"], ("LIVE", "DARK", "DISABLED"))
            self.assertIn(s["license"], ("commercial", "noncommercial"))
            self.assertIn(s["wired_state"], ("yes", "partial", "no"))
            self.assertTrue(s["source_drive_url"].startswith("https://"))

            if s["gate"] in ("LIVE", "DARK"):
                self.assertIn(s["homeSign"], (-1, 1), f"Active signal {sid} missing homeSign")
            else:
                self.assertIsNone(s["homeSign"])

            seen_packages.add(s["target_monorepo_package"])
            if s.get("gsi_kernel_target"):
                seen_gsi_kernels.add(s["gsi_kernel_target"])

        self.assertEqual(
            seen_packages,
            EXPECTED_25_PACKAGES,
            f"Package mismatch: missing={EXPECTED_25_PACKAGES - seen_packages}, extra={seen_packages - EXPECTED_25_PACKAGES}",
        )
        self.assertEqual(
            seen_gsi_kernels,
            EXPECTED_GSI_KERNELS,
            f"GSI kernel mismatch: missing={EXPECTED_GSI_KERNELS - seen_gsi_kernels}",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
