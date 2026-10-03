"""Offline identity tests for tinkabot_eq_stated_gates. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_gates as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_hold_restores(self):
        for name in (
            "under_center_diff",
            "market_elo_residual",
            "qb_pit_plus_elo_res",
            "home_minus_away",
            "under_center_rate",
            "proe_or_null",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestGates(unittest.TestCase):
    def test_trust_or_null_floor(self):
        self.assertIsNone(m.trust_or_null(0.4, 24.0))
        self.assertEqual(m.trust_or_null(0.4, 25.0), 0.4)
        self.assertIsNone(m.trust_or_null(0.4, None))
        self.assertIsNone(m.trust_or_null(None, 30.0))
        self.assertEqual(m.TRUST_TARGETS_FLOOR, 25)

    def test_protection_stress_or_null_floor(self):
        self.assertIsNone(m.protection_stress_or_null(0.1, 2.0))
        self.assertEqual(m.protection_stress_or_null(0.1, 3.0), 0.1)
        self.assertIsNone(m.protection_stress_or_null(0.1, 10.0, null_reason="fallback"))
        self.assertIsNone(m.protection_stress_or_null(None, 10.0))
        self.assertEqual(m.PROTECTION_GAMES_FLOOR, 3)

    def test_epa_success_identity(self):
        self.assertEqual(m.epa_success(0.01), 1.0)
        self.assertEqual(m.epa_success(0.0), 0.0)
        self.assertEqual(m.epa_success(-0.5), 0.0)
        self.assertIsNone(m.epa_success(None))

    def test_red_zone_identity(self):
        self.assertEqual(m.red_zone(20.0), 1.0)
        self.assertEqual(m.red_zone(19.0), 1.0)
        self.assertEqual(m.red_zone(21.0), 0.0)
        self.assertIsNone(m.red_zone(None))
        self.assertEqual(m.RED_ZONE_YARDLINE, 20)

    def test_two_minute_identity(self):
        self.assertEqual(m.two_minute(120.0), 1.0)
        self.assertEqual(m.two_minute(0.0), 1.0)
        self.assertEqual(m.two_minute(121.0), 0.0)
        self.assertIsNone(m.two_minute(None))
        self.assertEqual(m.TWO_MINUTE_SECONDS, 120)


if __name__ == "__main__":
    unittest.main()
