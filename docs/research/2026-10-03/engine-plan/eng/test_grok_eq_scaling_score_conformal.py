import unittest
from grok_eq_scaling_score_conformal import scaling_score_conformal

class TestScalingScoreConformal(unittest.TestCase):
    def test_simple_max(self):
        self.assertAlmostEqual(scaling_score_conformal([1.0, 2.0], [1.0, 1.0]), 2.0)

    def test_equal_ratios(self):
        self.assertAlmostEqual(scaling_score_conformal([2.0, 4.0], [1.0, 2.0]), 2.0)

    def test_zero_residual(self):
        self.assertEqual(scaling_score_conformal([0.0, 0.0], [1.0, 1.0]), 0.0)

    def test_fail_closed_negative_b(self):
        self.assertIsNone(scaling_score_conformal([1.0], [-1.0]))

    def test_fail_closed_mismatch_len(self):
        self.assertIsNone(scaling_score_conformal([1.0, 2.0], [1.0]))

    def test_fail_closed_non_numeric(self):
        self.assertIsNone(scaling_score_conformal(["bad"], [1.0]))

    def test_fail_closed_inf(self):
        self.assertIsNone(scaling_score_conformal([float("inf")], [1.0]))

if __name__ == "__main__":
    unittest.main()
