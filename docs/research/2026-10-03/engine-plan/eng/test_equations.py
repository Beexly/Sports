"""Identity checks for equations.py. Not an engine score. No data files."""
import math
import unittest

from equations import (
    air_bin,
    air_yards_to_sticks,
    american_implied,
    brier,
    complete_minus_probability,
    completion_base_offset,
    completion_residual,
    decay_weight,
    deep_rate,
    devig,
    drive_state_line,
    ece,
    elo_margin,
    elo_points,
    elo_residual,
    elo_win_prob,
    encoder_age_weeks,
    explosive_play,
    fair_side,
    finite_weighted_mean,
    four_week_cv,
    home_epa_edge,
    home_flag_from_neutral,
    home_minus_away,
    injury_out_weight,
    int_on_pressure,
    int_rate,
    is_deep,
    is_dome,
    lagged_latest,
    leaf_served_rate,
    league_expected_pressure,
    log_loss,
    logistic_probability,
    logit,
    margin_residual,
    mean_or_null,
    mov_multiplier,
    n_plays_weighted_mean,
    parse_season_key,
    point_shift_applies,
    present_filled,
    pressure_matchup,
    pressure_on_dropback,
    prior_four_shares,
    prior_season_key,
    promoted,
    protection_stress,
    push_adjusted,
    push_fraction,
    qb_epa_rating,
    questionable_weight,
    quick_game_expanding_mean,
    raw_rate_or_null,
    recency_weights,
    reconstructed_dropbacks,
    rest_diff,
    result_share,
    season_key_sort_key,
    season_regress,
    shift_to_fair,
    shift_to_target,
    shifted_total,
    shrunk_cell,
    sigmoid,
    snap_share,
    snap_within_window,
    spread_neighborhood_k,
    standardize,
    strict_side,
    target_share,
    team_points,
    temp_or_default,
    total_residual,
    unknown_qb_rating,
    week_order,
    weighted_mean,
    wind_or_zero,
)


class EquationTests(unittest.TestCase):
    def test_logit_matches_features_clip(self):
        self.assertAlmostEqual(logit(0.5), 0.0)
        self.assertAlmostEqual(logit(1e-12), math.log(1e-6 / (1 - 1e-6)))

    def test_log_loss_at_half(self):
        self.assertAlmostEqual(log_loss(0.5, 1.0), -math.log(0.5))

    def test_fair_side_push_is_half(self):
        self.assertAlmostEqual(fair_side([3.0, 7.0], 3.0), 0.75)

    def test_team_points(self):
        self.assertEqual(team_points(44.0, 6.0), (25.0, 19.0))

    def test_stress_and_null_guards(self):
        expected = league_expected_pressure(0.1, 0.5, 0.2)
        self.assertAlmostEqual(expected, 0.2)
        self.assertAlmostEqual(protection_stress(0.3, 0.2, 0.1, 0.5, 3, 32), 0.1)
        self.assertIsNone(protection_stress(0.3, 0.2, 0.1, 0.5, 2, 32))
        self.assertIsNone(protection_stress(0.3, 0.2, 0.1, 0.5, 3, 31))

    def test_promote_rule(self):
        self.assertTrue(promoted(-0.001, 0.10, 0.10))
        self.assertFalse(promoted(0.0, 0.10, 0.10))
        self.assertFalse(promoted(-0.001, 0.11, 0.10))
        self.assertFalse(promoted(-0.001, 0.10, 0.11))

    def test_drive_line_and_floor(self):
        self.assertAlmostEqual(drive_state_line(10, 50), 0.2007 * 10 - 0.0446 * 50)
        self.assertIsNone(mean_or_null(100, 29))
        self.assertAlmostEqual(mean_or_null(100, 30), 100 / 30)

    def test_cell_does_not_invent_a_parent(self):
        self.assertIsNone(raw_rate_or_null(1, 0))
        self.assertIsNone(shrunk_cell(2, 10, None))
        self.assertAlmostEqual(shrunk_cell(2, 10, 0.04), (2 + 25 * 0.04) / 35)

    def test_sticks_and_completion_residual(self):
        self.assertEqual(air_yards_to_sticks(12, 7), 5)
        self.assertIsNone(completion_residual(20, 18, 29))
        self.assertAlmostEqual(completion_residual(20, 18, 30), 2 / 30)
        self.assertAlmostEqual(complete_minus_probability(1, 0.6), 0.4)
        self.assertAlmostEqual(logistic_probability(0, 0, 0), 0.5)

    def test_residuals_and_push(self):
        self.assertEqual(margin_residual(7, 3), 4)
        self.assertEqual(total_residual(44, 47), -3)
        self.assertAlmostEqual(push_adjusted(0.5, 0.0), 0.5)
        self.assertIsNone(home_minus_away(1.0, None))
        self.assertEqual(home_minus_away(3.0, 1.0), 2.0)

    def test_market_and_elo(self):
        self.assertAlmostEqual(american_implied(100), 0.5)
        self.assertAlmostEqual(american_implied(-110), 110 / 210)
        self.assertAlmostEqual(devig(0.6, 0.4), 0.6)
        self.assertEqual(elo_margin(1500, 1500, True), 0)
        self.assertEqual(elo_margin(1500, 1500, False), 48)
        self.assertAlmostEqual(elo_win_prob(0), 0.5)
        self.assertAlmostEqual(season_regress(1800), 1700)
        self.assertAlmostEqual(mov_multiplier(0, 0), 0)
        self.assertAlmostEqual(elo_points(20, 1, 1, 0.5), 10)

    def test_brier_ece_decay(self):
        self.assertEqual(brier(1, 1), 0)
        self.assertEqual(ece([1.0] * 4, [1.0] * 4), 0)
        self.assertAlmostEqual(decay_weight(8), 0.5)
        self.assertEqual(encoder_age_weeks(2026, 4, 2026, 1), 3)
        self.assertAlmostEqual(elo_residual(0.2, 0.05), 0.15)

    def test_rates_need_their_floors(self):
        self.assertIsNone(int_rate(1, 29))
        self.assertAlmostEqual(int_rate(3, 30), 0.1)
        self.assertIsNone(int_on_pressure(1, 19))
        self.assertAlmostEqual(int_on_pressure(2, 20), 0.1)
        self.assertIsNone(target_share(3, 0))
        self.assertEqual(is_deep(15), 1)
        self.assertEqual(is_deep(14), 0)
        self.assertAlmostEqual(weighted_mean([1, 3], [1, 1]), 2)
        self.assertIsNone(weighted_mean([1], [0]))
        self.assertIsNone(four_week_cv([1, 1, 1]))
        self.assertEqual(four_week_cv([1, 1, 1, 1]), 0)

    def test_bins_sigmoid_and_shift(self):
        self.assertEqual(air_bin(-1), 0)
        self.assertEqual(air_bin(5), 1)
        self.assertEqual(air_bin(10), 2)
        self.assertEqual(air_bin(15), 3)
        self.assertEqual(air_bin(20), 4)
        self.assertEqual(air_bin(21), 5)
        self.assertEqual(air_bin(float("nan")), -1)
        self.assertAlmostEqual(sigmoid(0), 0.5)
        self.assertAlmostEqual(standardize(3, 1, 2), 2 / (2 + 1e-9))
        self.assertEqual(result_share(0), 0.5)
        self.assertEqual(strict_side([1, 0, -1], 0), 1 / 3)
        self.assertEqual(shifted_total(44, 47, 41), 38)
        # Equality takes the high branch, so a balanced sample lands one step under zero.
        self.assertAlmostEqual(shift_to_target([1.0, -1.0], 0.5), -1.0, places=5)
        self.assertLess(shift_to_target([3.0, 5.0, 7.0], 0.5), 0)



    def test_next_closed_forms(self):
        self.assertIsNone(quick_game_expanding_mean([(1, 0.2)], 1))
        self.assertAlmostEqual(quick_game_expanding_mean([(1, 0.2), (2, None), (3, 0.4)], 3), 0.2)
        self.assertAlmostEqual(quick_game_expanding_mean([(1, 0.2), (3, 0.4)], 4), 0.3)
        self.assertIsNone(n_plays_weighted_mean([(None, 10), (0.2, 0)]))
        self.assertAlmostEqual(n_plays_weighted_mean([(0.5, 4), (1.0, 4)]), 0.75)
        self.assertIsNone(leaf_served_rate(3, 29, 0.04))
        self.assertIsNone(leaf_served_rate(3, 30, None))
        self.assertAlmostEqual(leaf_served_rate(3, 30, 0.04), (3 + 25 * 0.04) / 55)
        self.assertIsNotNone(shrunk_cell(3, 10, 0.04))
        self.assertEqual(parse_season_key("2026_w3"), (2026, 3))
        self.assertEqual(parse_season_key("2024"), (2024, None))
        self.assertEqual(season_key_sort_key("2026"), (2026, 0))
        keys = ["2024", "2025", "2026_w1", "2026_w2"]
        self.assertIsNone(prior_season_key(keys, "2024"))
        self.assertEqual(prior_season_key(keys, "2026_w1"), "2025")
        self.assertEqual(spread_neighborhood_k([0.5] * 200), 1.0)
        self.assertEqual(spread_neighborhood_k([1.2] * 150), 1.5)
        self.assertEqual(spread_neighborhood_k([10.0] * 10), 6.0)
        self.assertEqual(push_fraction([1, 1, 2], 1), 2 / 3)
        self.assertEqual(shift_to_fair([0.0, 1.0, 2.0], 1.0), 0.0)
        self.assertEqual(shift_to_fair([10.0], 0.0), -10.0)
        self.assertTrue(point_shift_applies(0.52, 0.50))
        self.assertFalse(point_shift_applies(0.505, 0.50))
        self.assertEqual(week_order(2026, 1), 202601)
        self.assertEqual(lagged_latest([(202400, 1.0), (202410, 2.0), (202501, 3.0)], 2026, 1), 3.0)
        self.assertIsNone(lagged_latest([(202399, 1.0)], 2026, 1))
        self.assertAlmostEqual(completion_base_offset(0.6), math.log(0.6 / (1 - 0.6 + 1e-9)))
        self.assertAlmostEqual(reconstructed_dropbacks(10, 0.25), 40)
        self.assertAlmostEqual(reconstructed_dropbacks(10, 0, 5, 0.5), 10)
        self.assertIsNone(reconstructed_dropbacks(10, 0, 5, 0))
        self.assertIsNone(deep_rate(6, 29))
        self.assertAlmostEqual(deep_rate(6, 30), 0.2)
        self.assertEqual(home_epa_edge(1, 2, 3, 4), -4)
        self.assertEqual(pressure_matchup(1, 2, 3, 4), 4)
        self.assertEqual(explosive_play(1, 0, 20), 1)
        self.assertEqual(explosive_play(0, 1, 9), 0)
        self.assertEqual(pressure_on_dropback(1, 0, 1), 1)
        self.assertEqual(pressure_on_dropback(0, 1, 0), 0)
        self.assertAlmostEqual(qb_epa_rating(0, 0), -0.05)
        self.assertAlmostEqual(unknown_qb_rating(), -0.10)
        self.assertEqual(home_flag_from_neutral(1), 0)
        shares = [(2024, 17, 0.1), (2025, 1, 0.2), (2025, 2, None), (2025, 3, 0.3), (2025, 4, 0.4), (2025, 5, 0.5)]
        self.assertEqual(prior_four_shares(shares, 2025, 5), [0.4, 0.3, 0.2, 0.1])
        self.assertIsNone(prior_four_shares(shares[:3], 2025, 3))
        self.assertEqual(present_filled(None), (0.0, 0.0))
        self.assertEqual(present_filled(1.5), (1.0, 1.5))
        self.assertEqual(injury_out_weight("Questionable"), 0.0)
        self.assertEqual(injury_out_weight("Out"), 1.0)
        self.assertEqual(questionable_weight("Questionable"), 1.0)
        self.assertEqual(snap_share(None, 0.4), 0.4)
        self.assertTrue(snap_within_window(300, 150))
        self.assertFalse(snap_within_window(400, 150))
        self.assertIsNone(recency_weights(2))
        self.assertEqual(recency_weights(3), [0.5, 0.75, 1.0])
        self.assertEqual(finite_weighted_mean([None, None], [1, 1]), 0.0)
        self.assertAlmostEqual(finite_weighted_mean([1.0, None, 3.0], [1, 1, 1]), 2.0)
        self.assertEqual(temp_or_default(None), 65)
        self.assertEqual(wind_or_zero(None), 0)
        self.assertEqual(rest_diff(None, 3), 0)
        self.assertIsNone(rest_diff(7, None))
        self.assertEqual(rest_diff(7, 3), 4)
        self.assertEqual(is_dome("closed"), 1)
        self.assertEqual(is_dome("outdoors"), 0)


if __name__ == "__main__":
    unittest.main()
