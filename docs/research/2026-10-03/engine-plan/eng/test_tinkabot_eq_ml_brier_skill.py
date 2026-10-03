"""Offline identity tests for tinkabot_eq_ml_brier_skill. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_brier_skill as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("brier_skill",))
        self.assertTrue(callable(m.brier_skill))

    def test_no_forbidden_copies(self):
        for name in (
            "temperature_scale",
            "brier",
            "epa_success",
            "red_zone",
            "two_minute",
            "under_center_diff",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBrierSkill(unittest.TestCase):
    def test_perfect_vs_baseline(self):
        # brier=0 → skill 1 for any positive baseline
        self.assertEqual(m.brier_skill(0.0, 0.25), 1.0)

    def test_matches_baseline(self):
        # brier == baseline → skill 0
        self.assertEqual(m.brier_skill(0.25, 0.25), 0.0)

    def test_worse_than_baseline(self):
        self.assertEqual(m.brier_skill(0.5, 0.25), -1.0)

    def test_nulls(self):
        self.assertIsNone(m.brier_skill(None, 0.25))
        self.assertIsNone(m.brier_skill(0.1, None))
        self.assertIsNone(m.brier_skill(0.1, 0.0))
        self.assertIsNone(m.brier_skill(0.1, -1.0))


if __name__ == "__main__":
    unittest.main()
