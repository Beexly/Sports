"""Offline identity tests for tinkabot_eq_ml_jaccard. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_jaccard as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("jaccard_index",))
        self.assertTrue(callable(m.jaccard_index))

    def test_no_forbidden_copies(self):
        for name in (
            "dice_coefficient",
            "huber_loss",
            "binary_log_loss",
            "shannon_entropy",
            "nosofsky_similarity",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestJaccard(unittest.TestCase):
    def test_stated_form(self):
        # h=2,a=3,b=5 → 2/(3+5-2)=2/6
        self.assertAlmostEqual(m.jaccard_index(2.0, 3.0, 5.0), 2.0 / 6.0)
        # identical: h=a=b → 1
        self.assertEqual(m.jaccard_index(4.0, 4.0, 4.0), 1.0)
        # no overlap
        self.assertEqual(m.jaccard_index(0.0, 2.0, 3.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.jaccard_index(None, 1.0, 1.0))
        self.assertIsNone(m.jaccard_index(1.0, None, 1.0))
        self.assertIsNone(m.jaccard_index(1.0, 1.0, None))

    def test_null_bad_counts(self):
        self.assertIsNone(m.jaccard_index(-1.0, 2.0, 2.0))
        self.assertIsNone(m.jaccard_index(1.0, -1.0, 2.0))
        self.assertIsNone(m.jaccard_index(3.0, 2.0, 2.0))
        self.assertIsNone(m.jaccard_index(0.0, 0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
