"""Offline identity tests for tinkabot_eq_stated_situations. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_situations as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_gse_name_collision(self):
        for name in (
            "score_bucket",
            "garbage_time",
            "down_distance_cell",
            "aggressiveness_proxy_deep",
            "neutral_wp",
            "under_center_diff",
            "proe_or_null",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSituations(unittest.TestCase):
    def test_script_score_bucket(self):
        self.assertEqual(m.script_score_bucket(-8.0), "trail_8+")
        self.assertEqual(m.script_score_bucket(-1.0), "trail_1_7")
        self.assertEqual(m.script_score_bucket(0.0), "tied")
        self.assertEqual(m.script_score_bucket(7.0), "lead_1_7")
        self.assertEqual(m.script_score_bucket(8.0), "lead_8+")
        self.assertIsNone(m.script_score_bucket(None))

    def test_down_distance_label(self):
        self.assertEqual(m.down_distance_label(1.0, 2.0), "early_short")
        self.assertEqual(m.down_distance_label(2.0, 5.0), "early_mid")
        self.assertEqual(m.down_distance_label(3.0, 10.0), "late_long")
        self.assertIsNone(m.down_distance_label(5.0, 3.0))
        self.assertIsNone(m.down_distance_label(1.0, None))

    def test_garbage_q4(self):
        self.assertEqual(m.garbage_q4(4.0, 0.96), 1.0)
        self.assertEqual(m.garbage_q4(4.0, 0.04), 1.0)
        self.assertEqual(m.garbage_q4(4.0, 0.50), 0.0)
        self.assertEqual(m.garbage_q4(3.0, 0.99), 0.0)
        self.assertIsNone(m.garbage_q4(None, 0.99))

    def test_deep_air_flag(self):
        self.assertEqual(m.deep_air_flag(20.0), 1.0)
        self.assertEqual(m.deep_air_flag(19.0), 0.0)
        self.assertIsNone(m.deep_air_flag(None))
        self.assertEqual(m.DEEP_AIR_YARDS, 20.0)

    def test_neutral_script_wp(self):
        self.assertEqual(m.neutral_script_wp(0.35), 1.0)
        self.assertEqual(m.neutral_script_wp(0.65), 1.0)
        self.assertEqual(m.neutral_script_wp(0.34), 0.0)
        self.assertEqual(m.neutral_script_wp(0.66), 0.0)
        self.assertIsNone(m.neutral_script_wp(None))


if __name__ == "__main__":
    unittest.main()
