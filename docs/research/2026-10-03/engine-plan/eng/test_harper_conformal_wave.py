"""Fail-closed tests for the conformal wave."""
import math
import unittest

from harper_conformal_wave import (
    cqr_interval,
    in_conformal_set,
    split_conformal_interval,
    split_conformal_quantile,
)


class ConformalWaveTests(unittest.TestCase):
    def test_quantile_rank(self):
        self.assertEqual(split_conformal_quantile([1, 2, 3, 4], 0.5), 3)

    def test_empty(self):
        self.assertIsNone(split_conformal_quantile([], 0.1))

    def test_alpha_bounds(self):
        self.assertIsNone(split_conformal_quantile([1.0], 0.0))
        self.assertIsNone(split_conformal_quantile([1.0], 1.0))

    def test_nonfinite(self):
        self.assertIsNone(split_conformal_quantile([math.nan], 0.1))

    def test_level_above_one(self):
        self.assertIsNone(split_conformal_quantile([1.0, 2.0], 0.01))

    def test_residual_interval(self):
        self.assertEqual(split_conformal_interval(10.0, 1.5), (8.5, 11.5))
        self.assertIsNone(split_conformal_interval(10.0, -1.0))

    def test_cqr(self):
        self.assertEqual(cqr_interval(3.0, 7.0, 0.5), (2.5, 7.5))
        self.assertIsNone(cqr_interval(7.0, 3.0, 0.5))

    def test_membership(self):
        self.assertTrue(in_conformal_set(3.0, 3.0))
        self.assertFalse(in_conformal_set(3.1, 3.0))
        self.assertIsNone(in_conformal_set(math.inf, 1.0))


if __name__ == "__main__":
    unittest.main()
