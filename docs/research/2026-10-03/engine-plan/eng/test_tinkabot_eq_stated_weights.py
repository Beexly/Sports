"""Offline identity tests for tinkabot_eq_stated_weights. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_weights as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_gse_collision(self):
        for name in ("target_hhi", "effective_targets", "under_center_diff"):
            self.assertFalse(hasattr(m, name), name)


class TestWeights(unittest.TestCase):
    def test_half_life_decay(self):
        self.assertEqual(m.half_life_decay(1.0, 72.0, 72.0), 0.5)
        self.assertEqual(m.half_life_decay(2.0, 0.0, 48.0), 2.0)
        self.assertIsNone(m.half_life_decay(1.0, 10.0, 0.0))
        self.assertIsNone(m.half_life_decay(None, 10.0, 24.0))

    def test_share_hhi(self):
        self.assertEqual(m.share_hhi([0.5, 0.5]), 0.5)
        self.assertEqual(m.share_hhi([1.0]), 1.0)
        self.assertIsNone(m.share_hhi([]))
        self.assertIsNone(m.share_hhi(None))
        self.assertIsNone(m.share_hhi([-0.1, 0.5]))

    def test_normalize_shares(self):
        self.assertEqual(m.normalize_shares([25.0, 75.0]), [0.25, 0.75])
        self.assertIsNone(m.normalize_shares([0.0, 0.0]))
        self.assertIsNone(m.normalize_shares(None))


if __name__ == "__main__":
    unittest.main()
