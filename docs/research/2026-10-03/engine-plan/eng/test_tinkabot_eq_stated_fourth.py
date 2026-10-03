"""Offline identity tests for tinkabot_eq_stated_fourth. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_fourth as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_hold_restores(self):
        for name in ("under_center_diff", "proe_or_null", "home_minus_away"):
            self.assertFalse(hasattr(m, name), name)


class TestFourth(unittest.TestCase):
    def test_is_fourth(self):
        self.assertEqual(m.is_fourth(4.0), 1.0)
        self.assertEqual(m.is_fourth(3.0), 0.0)
        self.assertIsNone(m.is_fourth(None))

    def test_field_half(self):
        self.assertEqual(m.field_half(51.0), "own")
        self.assertEqual(m.field_half(50.0), "opp")
        self.assertEqual(m.field_half(20.0), "opp")
        self.assertIsNone(m.field_half(None))
        self.assertEqual(m.OWN_HALF_YARDLINE, 50.0)

    def test_tau_n_include(self):
        self.assertEqual(m.tau_n_include(25.0), 1.0)
        self.assertEqual(m.tau_n_include(24.0), 0.0)
        self.assertIsNone(m.tau_n_include(None))
        self.assertEqual(m.TAU_N_INCLUSION_FLOOR, 25)

    def test_wp_action_gap(self):
        self.assertAlmostEqual(m.wp_action_gap(0.55, 0.40), 0.15)
        self.assertIsNone(m.wp_action_gap(None, 0.4))
        self.assertIsNone(m.wp_action_gap(0.5, None))


if __name__ == "__main__":
    unittest.main()
