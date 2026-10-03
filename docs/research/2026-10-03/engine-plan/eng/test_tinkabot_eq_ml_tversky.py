"""Offline identity tests for tinkabot_eq_ml_tversky. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_tversky as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("tversky_index",))
        self.assertTrue(callable(m.tversky_index))

    def test_no_forbidden_copies(self):
        for name in (
            "jaccard",
            "dice",
            "jensen_shannon_divergence",
            "contrastive_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestTversky(unittest.TestCase):
    def test_stated_form(self):
        # α=β=1 → Jaccard-like: 2/(2+1+1)=0.5
        self.assertAlmostEqual(m.tversky_index(2.0, 1.0, 1.0, 1.0, 1.0), 0.5)
        # α=β=0.5 → 2/(2+0.5+0.5)=2/3
        self.assertAlmostEqual(m.tversky_index(2.0, 1.0, 1.0, 0.5, 0.5), 2.0 / 3.0)
        # identical sets: a=b=0 → 1
        self.assertAlmostEqual(m.tversky_index(5.0, 0.0, 0.0, 1.0, 1.0), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.tversky_index(None, 0.0, 0.0, 1.0, 1.0))
        self.assertIsNone(m.tversky_index(1.0, None, 0.0, 1.0, 1.0))
        self.assertIsNone(m.tversky_index(1.0, 0.0, None, 1.0, 1.0))
        self.assertIsNone(m.tversky_index(1.0, 0.0, 0.0, None, 1.0))
        self.assertIsNone(m.tversky_index(1.0, 0.0, 0.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.tversky_index(-1.0, 0.0, 0.0, 1.0, 1.0))
        self.assertIsNone(m.tversky_index(0.0, 0.0, 0.0, 1.0, 1.0))  # den=0
        self.assertIsNone(m.tversky_index(1.0, 0.0, 0.0, -0.1, 1.0))


if __name__ == "__main__":
    unittest.main()
