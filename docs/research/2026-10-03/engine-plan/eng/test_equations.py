"""Identity checks for equations.py. Not an engine score. No data files."""
import math
import unittest

from equations import (
    fair_side,
    league_expected_pressure,
    log_loss,
    logit,
    promoted,
    protection_stress,
    team_points,
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


if __name__ == "__main__":
    unittest.main()
