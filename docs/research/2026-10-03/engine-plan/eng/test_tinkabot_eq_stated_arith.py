"""Offline identity tests for tinkabot_eq_stated_arith. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_arith as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_hold_restores(self):
        for name in (
            "under_center_diff",
            "under_center_rate",
            "air_yard_share",
            "home_minus_away",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestArith(unittest.TestCase):
    def test_safe_div(self):
        self.assertEqual(m.safe_div(10.0, 2.0), 5.0)
        self.assertIsNone(m.safe_div(10.0, 0.0))
        self.assertIsNone(m.safe_div(None, 2.0))
        self.assertIsNone(m.safe_div(10.0, None))

    def test_part_share(self):
        self.assertEqual(m.part_share(25.0, 100.0), 0.25)
        self.assertIsNone(m.part_share(25.0, 0.0))
        self.assertIsNone(m.part_share(25.0, -1.0))
        self.assertIsNone(m.part_share(None, 10.0))

    def test_complement_rate(self):
        self.assertEqual(m.complement_rate(0.35), 0.65)
        self.assertEqual(m.complement_rate(1.0), 0.0)
        self.assertIsNone(m.complement_rate(None))

    def test_clip01(self):
        self.assertEqual(m.clip01(0.5), 0.5)
        self.assertEqual(m.clip01(-0.1), 0.0)
        self.assertEqual(m.clip01(1.2), 1.0)
        self.assertIsNone(m.clip01(None))


if __name__ == "__main__":
    unittest.main()
