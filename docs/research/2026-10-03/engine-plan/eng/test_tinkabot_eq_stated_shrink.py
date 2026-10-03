"""Offline identity tests for tinkabot_eq_stated_shrink. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_stated_shrink as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_kept_funcs_exported(self):
        for name in m.COLUMN_BACKED_FUNCS:
            self.assertTrue(callable(getattr(m, name)), name)

    def test_no_overlap(self):
        for name in ("mean_or_null", "shrunk_proe", "eb_shrink", "under_center_diff"):
            self.assertFalse(hasattr(m, name), name)


class TestShrink(unittest.TestCase):
    def test_js_blend(self):
        # n=50, n0=50 → 0.5*p_hat + 0.5*p_bar
        self.assertAlmostEqual(m.js_blend(0.8, 0.4, 50.0, 50.0), 0.6)
        self.assertIsNone(m.js_blend(0.8, 0.4, 50.0, None))
        self.assertIsNone(m.js_blend(0.8, 0.4, 0.0, 0.0))

    def test_leaf_n_ok(self):
        self.assertEqual(m.leaf_n_ok(30.0), 1.0)
        self.assertEqual(m.leaf_n_ok(29.0), 0.0)
        self.assertIsNone(m.leaf_n_ok(None))
        self.assertEqual(m.LEAF_N_FLOOR, 30)

    def test_mean_with_floor(self):
        self.assertEqual(m.mean_with_floor(60.0, 30.0), 2.0)
        self.assertIsNone(m.mean_with_floor(60.0, 29.0))
        self.assertIsNone(m.mean_with_floor(None, 30.0))


if __name__ == "__main__":
    unittest.main()
