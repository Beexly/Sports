"""Identity checks for equations.py. Not an engine score. No data files."""
import math
import unittest

from equations import (
    air_yards_to_sticks,
    complete_minus_probability,
    completion_residual,
    drive_state_line,
    fair_side,
    home_minus_away,
    league_expected_pressure,
    log_loss,
    logistic_probability,
    logit,
    margin_residual,
    mean_or_null,
    promoted,
    protection_stress,
    push_adjusted,
    raw_rate_or_null,
    shrunk_cell,
    team_points,
    total_residual,
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


if __name__ == "__main__":
    unittest.main()
