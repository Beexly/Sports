"""Offline identity tests for tinkabot_eq_stated_rates. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_stated_rates as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_overlap_names(self):
        for name in (
            "shrunk_proe",
            "binomial_cell_se",
            "proe_or_null",
            "home_minus_away",
            "under_center_diff",
            "epa_success",
            "early_down",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestRates(unittest.TestCase):
    def test_rate_residual(self):
        self.assertAlmostEqual(m.rate_residual(0.55, 0.40), 0.15)
        self.assertAlmostEqual(m.rate_residual(0.30, 0.40), -0.10)
        self.assertIsNone(m.rate_residual(None, 0.4))
        self.assertIsNone(m.rate_residual(0.5, None))

    def test_eb_shrink(self):
        self.assertEqual(m.eb_shrink(0.10, 50.0, 50.0), 0.05)
        self.assertIsNone(m.eb_shrink(0.10, 50.0, None))
        self.assertIsNone(m.eb_shrink(0.10, None, 10.0))
        self.assertIsNone(m.eb_shrink(None, 50.0, 10.0))
        self.assertIsNone(m.eb_shrink(0.1, 0.0, 0.0))

    def test_rate_se(self):
        self.assertAlmostEqual(m.rate_se(0.5, 100.0), math.sqrt(0.25 / 100.0))
        self.assertIsNone(m.rate_se(1.1, 10.0))
        self.assertIsNone(m.rate_se(0.5, 0.0))
        self.assertIsNone(m.rate_se(None, 10.0))

    def test_low_sample_n(self):
        self.assertEqual(m.low_sample_n(199.0), 1.0)
        self.assertEqual(m.low_sample_n(200.0), 0.0)
        self.assertIsNone(m.low_sample_n(None))
        self.assertEqual(m.LOW_SAMPLE_N_PLAYS, 200)


if __name__ == "__main__":
    unittest.main()
