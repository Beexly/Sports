"""Identity checks for equations.py. Not an engine score. No data files."""
import math
import unittest

from equations import (
    actual_or_pit,
    air_bin,
    air_yards_to_sticks,
    american_implied,
    availability_mass,
    availability_total,
    binary_completion,
    brier,
    canonical_team,
    cell_token,
    clears_half,
    clipped_eta,
    complete_minus_probability,
    completion_base_offset,
    completion_residual,
    counted_attempt,
    decay_weight,
    decision_accuracy,
    deep_rate,
    derived_markets_withheld,
    devig,
    drive_state_line,
    duplicate_rate_mean,
    ece,
    edge_needs_check,
    elo_margin,
    elo_points,
    elo_residual,
    elo_win_prob,
    encoder_age_weeks,
    engine_point_shift,
    espn_home_projection,
    evidence_score,
    expected_bin_completions,
    expected_snap_loss,
    expected_starter,
    explosive_play,
    fair_side,
    fair_with_push,
    fair_worst,
    finite_weighted_mean,
    four_week_cv,
    game_price_key,
    games_before,
    generated_before_kick,
    glazer_play_rate,
    hit_interception,
    home_epa_edge,
    home_flag_from_neutral,
    home_minus_away,
    in_prior_season_window,
    injury_out_weight,
    injury_report_stale,
    int_on_pressure,
    int_rate,
    is_deep,
    is_dome,
    lagged_latest,
    leaf_served_rate,
    league_expected_pressure,
    league_pool_ready,
    log_loss,
    logistic_probability,
    logit,
    logit_contribution,
    margin_residual,
    market_log_odds,
    mean_or_null,
    mov_multiplier,
    n_plays_weighted_mean,
    neutral_site,
    nflverse_home_spread,
    nflverse_join_date,
    normal_ci,
    odds_snapshot_stale,
    offset_log_odds,
    parse_season_key,
    placebo_fraction,
    play_published,
    point_shift_applies,
    position_group,
    present_filled,
    pressure_event,
    pressure_matchup,
    pressure_on_dropback,
    prior4_snap_share,
    prior_four_shares,
    prior_season_key,
    prior_window_mean,
    proe_or_null,
    promoted,
    protection_stress,
    published_side,
    push_adjusted,
    push_fraction,
    qb_epa_rating,
    questionable_weight,
    quick_game_expanding_mean,
    raw_rate_or_null,
    recency_weights,
    reconstructed_dropbacks,
    refit_matches,
    rest_diff,
    result_share,
    retrospective_rationale,
    sample_median,
    scaled_weight,
    season_aggregate_order,
    season_key_sort_key,
    season_regress,
    selected_side_prob,
    selected_side_won,
    settled_side,
    shift_to_fair,
    shift_to_target,
    shifted_total,
    shrunk_cell,
    sigmoid,
    snap_share,
    snap_share_skipna,
    snap_within_window,
    spread_neighborhood_k,
    standardize,
    stress_or_null,
    strict_asof_index,
    strict_side,
    target_share,
    team_points,
    temp_or_default,
    text_column_is_numeric,
    total_residual,
    trust_share_or_null,
    typed_epa,
    under_center_diff,
    under_center_rate,
    unknown_qb_rating,
    unscaled_z,
    varying_column,
    week_order,
    weighted_mean,
    wind_or_zero,
    within_season_lag,
    zero_filled_diff,
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



    def test_mint_gates_and_glazer(self):
        self.assertEqual(glazer_play_rate("OUT"), 0.0)
        self.assertEqual(glazer_play_rate("DOUBTFUL"), 0.002)
        self.assertEqual(glazer_play_rate("QUESTIONABLE"), 0.72)
        self.assertEqual(glazer_play_rate(None), 0.981)
        self.assertEqual(glazer_play_rate("Out"), 0.981)
        self.assertAlmostEqual(expected_snap_loss(0.5, 0.72), 0.14)
        self.assertAlmostEqual(fair_with_push(0.44, 0.10), 0.49)
        self.assertIsNone(sample_median([]))
        self.assertEqual(sample_median([1, 3, 2]), 2)
        self.assertEqual(sample_median([1, 2, 3, 4]), 2.5)
        self.assertAlmostEqual(prior4_snap_share([0.2, 0.4, 0.6, 0.8, 1.0], [0.1, 0.1]), 0.7)
        self.assertIsNone(prior4_snap_share([], [0.1]))
        self.assertEqual(nflverse_home_spread(3), -3)
        self.assertEqual(nflverse_home_spread(-2.5), 2.5)
        self.assertEqual(engine_point_shift([1.0, -1.0], 0.50, 0.504), 0.0)
        self.assertAlmostEqual(
            engine_point_shift([0.0, 0.0], 0.8, 0.2),
            shift_to_target([0.0, 0.0], 0.8) - shift_to_target([0.0, 0.0], 0.2),
        )
        self.assertEqual(logit_contribution(3, 1, 2, 0.5), 0.5)
        self.assertEqual(scaled_weight(1, 3), round(1 / 3, 5))
        self.assertFalse(derived_markets_withheld(0.5, 0.5, 0.5, 0.5))
        self.assertFalse(derived_markets_withheld(0.5, 0.5, 0.51, 0.5))
        self.assertTrue(derived_markets_withheld(0.5, 0.5, 0.53, 0.5))
        self.assertFalse(derived_markets_withheld(0.52, 0.50, 0.9, 0.9))
        self.assertAlmostEqual(fair_worst([0.51, 0.60], [0.49, 0.50]), 0.10)
        self.assertIsNone(fair_worst([], []))
        self.assertFalse(injury_report_stale(24 * 3600))
        self.assertTrue(injury_report_stale(24 * 3600 + 1))
        self.assertFalse(odds_snapshot_stale(12 * 3600))
        self.assertTrue(odds_snapshot_stale(12 * 3600 + 1))
        self.assertFalse(edge_needs_check(0.08))
        self.assertTrue(edge_needs_check(-0.081))
        self.assertIsNone(espn_home_projection(None))
        self.assertAlmostEqual(espn_home_projection(55.5), 0.555)
        self.assertTrue(play_published(0.05, 0.04))
        self.assertFalse(play_published(0.04, 0.04))
        self.assertTrue(clears_half(0.62, 0.10))
        self.assertFalse(clears_half(0.55, 0.10))
        self.assertTrue(clears_half(0.5, 0.0))
        self.assertIsNone(settled_side(3, 3))
        self.assertEqual(settled_side(4, 3), 1)
        self.assertEqual(settled_side(2, 3), 0)
        self.assertTrue(league_pool_ready(100))
        self.assertFalse(league_pool_ready(99))
        self.assertIsNone(prior_window_mean([]))
        self.assertEqual(prior_window_mean([7]), 7)
        self.assertEqual(prior_window_mean([1, 2, 3, 4, 5]), 3.5)


    def test_join_floors_and_offset(self):
        self.assertIsNone(under_center_rate(None))
        self.assertAlmostEqual(under_center_rate(0.25), 0.75)
        self.assertIsNone(under_center_diff(None))
        self.assertEqual(under_center_diff(0.2), -0.2)
        self.assertIsNone(proe_or_null(0.1, 24))
        self.assertIsNone(proe_or_null(0.1, None))
        self.assertIsNone(proe_or_null(None, 30))
        self.assertEqual(proe_or_null(0.1, 25), 0.1)
        self.assertIsNone(trust_share_or_null(0.4, 24))
        self.assertEqual(trust_share_or_null(0.4, 25), 0.4)
        self.assertEqual(season_aggregate_order(2025), 202599)
        self.assertTrue(within_season_lag(2026, 2024))
        self.assertFalse(within_season_lag(2026, 2023))
        self.assertFalse(within_season_lag(2026, 2027))
        self.assertFalse(text_column_is_numeric(2, 10))
        self.assertTrue(text_column_is_numeric(5, 10))
        self.assertTrue(text_column_is_numeric(3, 2))
        self.assertAlmostEqual(offset_log_odds(0.2, 0.1, [0.5, -0.25], [1.0, 2.0]), 0.3)
        self.assertEqual(clipped_eta(25), 20)
        self.assertEqual(clipped_eta(-25), -20)
        self.assertEqual(clipped_eta(3), 3)
        self.assertEqual(unscaled_z(3, 1, 2), 1)
        self.assertTrue(in_prior_season_window(2026, 3, 2026, 4))
        self.assertFalse(in_prior_season_window(2026, 4, 2026, 4))
        self.assertTrue(in_prior_season_window(2024, 18, 2026, 1))
        self.assertFalse(in_prior_season_window(2023, 1, 2026, 1))
        self.assertEqual(games_before([("a", 1), ("c", 3), ("b", 2)], "c", 2), [("a", 1), ("b", 2)])
        self.assertEqual(zero_filled_diff(None, 2), -2)
        self.assertEqual(zero_filled_diff(3, None), 3)
        self.assertEqual(pressure_event(None, 1), 1)
        self.assertEqual(pressure_event(0, 0), 0)
        self.assertEqual(hit_interception(1, 1), 1)
        self.assertEqual(hit_interception(1, 0), 0)
        self.assertEqual(evidence_score(None, "measured"), 0)
        self.assertAlmostEqual(evidence_score(2, "claimed"), 1.2)
        self.assertAlmostEqual(evidence_score(2, "weird"), 0.6)
        self.assertAlmostEqual(evidence_score(2, None), 0.4)
        lo, hi = normal_ci(1, 0.5)
        self.assertAlmostEqual(lo, 0.02)
        self.assertAlmostEqual(hi, 1.98)
        self.assertIsNone(placebo_fraction([], 1))
        self.assertAlmostEqual(placebo_fraction([1, 2, 3], 2), 2 / 3)
        self.assertEqual(selected_side_prob(0.6, "away"), 0.4)
        self.assertIsNone(selected_side_prob(0.6, "draw"))
        self.assertIsNone(selected_side_won(0, "home"))
        self.assertEqual(selected_side_won(3, "home"), 1)
        self.assertEqual(selected_side_won(-1, "away"), 1)
        self.assertFalse(generated_before_kick(None, "2026-10-05"))
        self.assertTrue(generated_before_kick("2026-10-01", "2026-10-05"))
        self.assertFalse(generated_before_kick("2026-10-05", "2026-10-05"))
        self.assertFalse(varying_column(1e-8))
        self.assertTrue(varying_column(1e-8 + 1e-12))


    def test_starter_join_and_attempt_filters(self):
        from datetime import datetime, date

        self.assertEqual(decision_accuracy([0.9, 0.1], [1, 0]), 1.0)
        self.assertEqual(decision_accuracy([0.6], [0]), 0.0)
        self.assertIsNone(duplicate_rate_mean([None, None]))
        self.assertAlmostEqual(duplicate_rate_mean([0.2, None, 0.4]), 0.3)
        self.assertIsNone(expected_bin_completions(10, None))
        self.assertEqual(expected_bin_completions(10, 0.6), 6.0)
        self.assertIsNone(typed_epa(0, 1.5))
        self.assertIsNone(typed_epa(1, None))
        self.assertEqual(typed_epa(1, -0.2), -0.2)
        self.assertTrue(counted_attempt(None, None))
        self.assertFalse(counted_attempt(1, 0))
        self.assertFalse(counted_attempt(0, 1))
        self.assertIsNone(snap_share_skipna(None, None))
        self.assertEqual(snap_share_skipna(None, 0.4), 0.4)
        self.assertEqual(snap_share(None, None), 0.0)
        kick = datetime(2026, 10, 5, 1, 0)
        self.assertEqual(nflverse_join_date(kick, 0), date(2026, 10, 4))
        self.assertEqual(nflverse_join_date(kick, 1), date(2026, 10, 5))
        self.assertEqual(expected_starter(None, False, False, [], set()), (None, "no-prior-game"))
        self.assertEqual(expected_starter("QB1", True, False, [], set()), ("QB1", "prev-starter"))
        history = [("d1", "QB2", 10), ("d2", "QB3", 4), ("d2", "QB2", 3)]
        self.assertEqual(expected_starter("QB1", True, True, history, set()), ("QB2", "backup-most-dropbacks"))
        self.assertEqual(expected_starter("QB1", True, True, history, {"QB2"}), ("QB3", "backup-most-dropbacks"))
        self.assertEqual(expected_starter("QB1", True, True, [], set()), (None, "backup-unknown"))
        self.assertTrue(refit_matches(0.6107, 0.6107))
        self.assertTrue(refit_matches(0.61085, 0.6107))
        self.assertFalse(refit_matches(0.61086, 0.6107))
        self.assertIsNone(market_log_odds(None))
        self.assertIsNone(market_log_odds(0))
        self.assertAlmostEqual(market_log_odds(0.6), __import__("math").log(0.6 / 0.4))
        self.assertIsNone(stress_or_null(0.2, 2, None))
        self.assertIsNone(stress_or_null(0.2, 5, "pool<32"))
        self.assertIsNone(stress_or_null(None, 5, None))
        self.assertIsNone(stress_or_null(0.2, None, "  "))
        self.assertEqual(stress_or_null(0.2, 3, "  "), 0.2)
        self.assertEqual(stress_or_null(0.2, 3, ""), 0.2)



    def test_cell_asof_and_group_maps(self):
        self.assertEqual(cell_token(None), "na")
        self.assertEqual(cell_token(float("nan")), "na")
        self.assertEqual(cell_token(3.0), "3")
        self.assertEqual(cell_token("2.0"), "2")
        self.assertEqual(cell_token("early down"), "earlydown")
        self.assertIsNone(strict_asof_index([1, 3, 5], 1))
        self.assertEqual(strict_asof_index([1, 3, 5], 4), 1)
        self.assertEqual(strict_asof_index([1, 3, 5], 5), 1)
        self.assertEqual(strict_asof_index([1, 3, 5], 6), 2)
        self.assertEqual(canonical_team(" AZ "), "ARI")
        self.assertEqual(canonical_team("KC"), "KC")
        self.assertIsNone(canonical_team(None))
        self.assertEqual(position_group("WR"), "SKILL")
        self.assertEqual(position_group("EDGE"), "FRONT")
        self.assertEqual(position_group("QB"), "OTHER")
        self.assertEqual(position_group(None), "OTHER")
        self.assertEqual(neutral_site("Neutral"), 1.0)
        self.assertEqual(neutral_site("Home"), 0.0)
        self.assertEqual(availability_mass(0.4, 1.0), 0.4)
        self.assertEqual(availability_mass(0.4, 0.0), 0.0)
        self.assertEqual(actual_or_pit(None, 1.2), 1.2)
        self.assertEqual(actual_or_pit(0.4, 9.0), 0.4)
        self.assertIsNone(actual_or_pit(None, None))
        self.assertEqual(availability_total(1.0, None, 2.0, None), 3.0)
        self.assertEqual(availability_total(None, None, None, None), 0.0)
        self.assertTrue(binary_completion(0))
        self.assertTrue(binary_completion(1.0))
        self.assertFalse(binary_completion(2))
        self.assertFalse(binary_completion(None))
        self.assertEqual(published_side("Kansas City Chiefs -3", "Kansas City Chiefs", "Buffalo Bills"), "home")
        self.assertEqual(published_side("Buffalo Bills", "Kansas City Chiefs", "Buffalo Bills"), "away")
        self.assertIsNone(published_side("the over", "Kansas City Chiefs", "Buffalo Bills"))
        self.assertTrue(retrospective_rationale("Retrospective look"))
        self.assertFalse(retrospective_rationale(None))
        self.assertEqual(game_price_key("2026_04_KC_BUF", 0.12344), ("2026_04_KC_BUF", 0.1234))


if __name__ == "__main__":
    unittest.main()
