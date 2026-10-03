"""Offline identity tests for tinkabot_eq_stated_bins. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_bins as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_hold_or_prior_restores(self):
        for name in (
            "under_center_diff",
            "market_elo_residual",
            "home_minus_away",
            "under_center_rate",
            "proe_or_null",
            "epa_success",
            "red_zone",
            "two_minute",
            "trust_or_null",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBins(unittest.TestCase):
    def test_early_down(self):
        self.assertEqual(m.early_down(1.0), 1.0)
        self.assertEqual(m.early_down(2.0), 1.0)
        self.assertEqual(m.early_down(3.0), 0.0)
        self.assertEqual(m.early_down(4.0), 0.0)
        self.assertIsNone(m.early_down(None))

    def test_ydstogo_bin(self):
        self.assertEqual(m.ydstogo_bin(1.0), "le3")
        self.assertEqual(m.ydstogo_bin(3.0), "le3")
        self.assertEqual(m.ydstogo_bin(4.0), "mid4_7")
        self.assertEqual(m.ydstogo_bin(7.0), "mid4_7")
        self.assertEqual(m.ydstogo_bin(8.0), "ge8")
        self.assertIsNone(m.ydstogo_bin(None))

    def test_goal_to_go(self):
        self.assertEqual(m.goal_to_go(10.0), 1.0)
        self.assertEqual(m.goal_to_go(9.0), 1.0)
        self.assertEqual(m.goal_to_go(11.0), 0.0)
        self.assertIsNone(m.goal_to_go(None))
        self.assertEqual(m.GOAL_TO_GO_YARDLINE, 10)

    def test_pressured_floor(self):
        self.assertEqual(m.pressured_floor(1.0, 0.0), 1.0)
        self.assertEqual(m.pressured_floor(0.0, 1.0), 1.0)
        self.assertEqual(m.pressured_floor(0.0, 0.0), 0.0)
        self.assertEqual(m.pressured_floor(None, 1.0), 1.0)
        self.assertEqual(m.pressured_floor(1.0, None), 1.0)
        self.assertIsNone(m.pressured_floor(None, None))


if __name__ == "__main__":
    unittest.main()
