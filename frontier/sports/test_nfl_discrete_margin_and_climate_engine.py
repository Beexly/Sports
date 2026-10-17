"""
Tests for NFL Discrete Margin Key-Number Mixture & Stadium Microclimate Engines
================================================================================
Verifies:
- Stern-normal mixture probability axioms (sum to 1, valid bounds)
- Push mass isolation on exact integer spreads (e.g., -3.0 vs -3.5)
- Non-Gaussian pricing alpha at NFL key numbers (3, 7, 6, 10, 14, 4)
- Environmental wind decay at -0.18 pts/mph above 14 mph
- Aerodynamic dome isolation vs open-air stadium boundary layers
"""

import math
import unittest
from typing import List

from frontier.sports.nfl_discrete_margin_engine import (
    NFLDiscreteMarginEngine,
    NFL_KEY_NUMBERS,
    NFL_SIGNED_KEY_NUMBERS,
    HISTORICAL_KEY_MASS_PRIORS,
    CoverProbability,
    NflMarginMixtureFit
)
from frontier.sports.stadium_microclimate_engine import (
    StadiumMicroclimateEngine,
    StadiumProfile,
    MicroclimateImpact,
    WIND_THRESHOLD_MPH,
    WIND_TOTAL_DECAY_RATE
)


class TestNFLDiscreteMarginEngine(unittest.TestCase):
    """Unit tests verifying mathematical rigor and zero-heuristic margin mixture."""

    def test_prior_calibrated_mixture_probabilities_sum_to_one(self):
        fit = NFLDiscreteMarginEngine.prior_calibrated_fit(expected_margin=2.5, sigma=13.4)
        total_mass = fit.continuous_weight + sum(km.mass for km in fit.key_masses)
        self.assertAlmostEqual(total_mass, 1.0, places=6)
        self.assertGreater(fit.continuous_weight, 0.50)
        self.assertEqual(len(fit.key_masses), len(NFL_SIGNED_KEY_NUMBERS))

    def test_push_probability_exact_on_integer_spread_zero_on_half_point(self):
        fit = NFLDiscreteMarginEngine.prior_calibrated_fit(expected_margin=3.5, sigma=13.4)

        # On Colts -3.0: push is possible if Colts win by exactly 3 (margin == 3)
        # In our convention: spread_home = -3.0 -> threshold = -(-3.0) = 3.0
        cov_3 = NFLDiscreteMarginEngine.cover_probability(fit, spread_home=-3.0)
        self.assertAlmostEqual(cov_3.home + cov_3.away + cov_3.push, 1.0, places=6)
        self.assertGreater(cov_3.push, 0.05) # Key number 3 has ~7.6% push mass
        self.assertAlmostEqual(cov_3.push, HISTORICAL_KEY_MASS_PRIORS[3], places=4)

        # On Packers -3.5: half-point spread, push is mathematically IMPOSSIBLE
        cov_35 = NFLDiscreteMarginEngine.cover_probability(fit, spread_home=-3.5)
        self.assertAlmostEqual(cov_35.home + cov_35.away + cov_35.push, 1.0, places=6)
        self.assertEqual(cov_35.push, 0.0)

    def test_cover_probability_monotonicity_across_spreads(self):
        fit = NFLDiscreteMarginEngine.prior_calibrated_fit(expected_margin=1.0, sigma=13.4)
        spreads = [-7.5, -3.5, -1.5, 0.0, 1.5, 3.5, 7.5]
        probs = [NFLDiscreteMarginEngine.cover_probability(fit, s).home for s in spreads]

        # As home gets more points (+7.5 vs -7.5), P(home cover) must strictly increase
        for i in range(len(probs) - 1):
            self.assertLess(probs[i], probs[i + 1])

    def test_key_number_alpha_quantifies_distortion_over_naive_gaussian(self):
        # When model projected margin is close to 3.0:
        alpha_report = NFLDiscreteMarginEngine.evaluate_spread_alpha(
            expected_margin=3.1,
            market_spread=-3.0,
            sigma=13.4
        )
        self.assertTrue(alpha_report["is_on_key_number"])
        self.assertEqual(alpha_report["key_margin"], 3)
        self.assertGreater(alpha_report["mixture_push"], 0.05)
        self.assertEqual(alpha_report["gaussian_away_cover"] + alpha_report["gaussian_home_cover"], 1.0)
        # Gaussian ignores push; mixture identifies push mass
        self.assertNotEqual(alpha_report["mixture_home_cover"], alpha_report["gaussian_home_cover"])

    def test_fit_from_empirical_margins(self):
        # Generate 100 margins clustered on 3 and 7
        sample_margins = [3.0] * 15 + [-3.0] * 14 + [7.0] * 10 + [-7.0] * 9 + [1.0, 4.0, 10.0, 14.0, 2.0, 5.0] * 8
        fit = NFLDiscreteMarginEngine.fit_from_margins(sample_margins)
        self.assertEqual(fit.verdict, "fitted")
        self.assertAlmostEqual(fit.continuous_weight + sum(km.mass for km in fit.key_masses), 1.0, places=5)
        self.assertGreater(NFLDiscreteMarginEngine.key_mass_at(fit, 3), 0.10)

    def test_density_weighted_cover_probability(self):
        # Favorite by 9.0 points (Packers -3.5):
        # Away (GB) covers -3.5 if Margin < -3.5 (i.e. away wins by 4+)
        cov = NFLDiscreteMarginEngine.density_weighted_cover_probability(
            expected_margin=-9.0,
            spread_home=3.5,
            sigma=13.4
        )
        self.assertAlmostEqual(cov.home + cov.away + cov.push, 1.0, places=6)
        self.assertEqual(cov.push, 0.0) # Half point line cannot push
        self.assertGreater(cov.away, 0.58) # GB -3.5 cover probability > 58%

        # Integer spread (-3.0) has push mass
        cov_push = NFLDiscreteMarginEngine.density_weighted_cover_probability(
            expected_margin=0.5,
            spread_home=-3.0,
            sigma=13.4
        )
        self.assertAlmostEqual(cov_push.home + cov_push.away + cov_push.push, 1.0, places=6)
        self.assertGreater(cov_push.push, 0.05)



class TestStadiumMicroclimateEngine(unittest.TestCase):
    """Unit tests verifying atmospheric aerodynamic adjustments."""

    def test_dome_isolation_eliminates_all_wind_and_weather_decay(self):
        # Detroit Ford Field: fixed dome
        impact = StadiumMicroclimateEngine.evaluate_microclimate(
            venue="Detroit",
            wind_mph=35.0, # Gale force wind outside
            temp_f=10.0,    # Blizzard outside
            precip_type="snow"
        )
        self.assertEqual(impact.climate_regime, "DOME_NEUTRAL")
        self.assertEqual(impact.effective_wind_mph, 0.0)
        self.assertEqual(impact.effective_temp_f, 72.0)
        self.assertEqual(impact.total_adjustment_pts, 0.0)
        self.assertEqual(impact.passing_shrinkage_factor, 1.0)
        self.assertEqual(impact.fg_distance_penalty_yds, 0.0)

    def test_high_wind_point_decay_rate_above_14_mph(self):
        # Highmark Stadium (Buffalo): open air, swirl factor 1.25
        # 16.0 mph wind outside * 1.25 swirl = 20.0 mph effective wind
        impact = StadiumMicroclimateEngine.evaluate_microclimate(
            venue="Buffalo",
            wind_mph=16.0,
            temp_f=60.0
        )
        self.assertEqual(impact.climate_regime, "HIGH_WIND_DECAY")
        effective_wind = 16.0 * 1.25 # 20.0 mph
        self.assertAlmostEqual(impact.effective_wind_mph, effective_wind, places=1)

        excess_wind = effective_wind - WIND_THRESHOLD_MPH # 20.0 - 14.0 = 6.0 mph
        expected_decay = -WIND_TOTAL_DECAY_RATE * excess_wind # -0.18 * 6.0 = -1.08 pts
        self.assertAlmostEqual(impact.total_adjustment_pts, expected_decay, places=2)
        self.assertLess(impact.passing_shrinkage_factor, 1.0)

    def test_thermal_fatigue_in_tampa_bay(self):
        # Raymond James Stadium: 88F, 75% humidity
        impact = StadiumMicroclimateEngine.evaluate_microclimate(
            venue="Tampa Bay",
            wind_mph=5.0,
            temp_f=88.0,
            humidity_pct=75.0
        )
        self.assertEqual(impact.climate_regime, "THERMAL_FATIGUE")
        self.assertGreater(impact.thermal_fatigue_index, 0.8)

    def test_freezing_temperature_adds_fg_penalty(self):
        impact = StadiumMicroclimateEngine.evaluate_microclimate(
            venue="Chicago",
            wind_mph=5.0,
            temp_f=22.0 # Freezing cold
        )
        self.assertEqual(impact.climate_regime, "FREEZING_COLD")
        self.assertGreater(impact.fg_distance_penalty_yds, 2.0)
        self.assertLess(impact.total_adjustment_pts, 0.0)

    def test_condition_game_total_and_passing_yards(self):
        impact = StadiumMicroclimateEngine.evaluate_microclimate(
            venue="Buffalo",
            wind_mph=18.0,
            temp_f=55.0
        )
        base_total = 48.5
        adjusted_total = StadiumMicroclimateEngine.condition_game_total(base_total, impact)
        self.assertLess(adjusted_total, base_total)

        base_pass = 230.0
        adjusted_pass = StadiumMicroclimateEngine.condition_player_passing_yards(base_pass, impact)
        self.assertLess(adjusted_pass, base_pass)


if __name__ == "__main__":
    unittest.main()
