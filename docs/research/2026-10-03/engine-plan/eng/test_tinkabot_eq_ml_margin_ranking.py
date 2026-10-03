"""Offline identity tests for tinkabot_eq_ml_margin_ranking. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_margin_ranking as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("margin_ranking_loss",))
        self.assertTrue(callable(m.margin_ranking_loss))

    def test_no_forbidden_copies(self):
        for name in ("ranknet_pair_cost", "hinge_loss", "triplet_loss", "nt_xent_loss"):
            self.assertFalse(hasattr(m, name), name)


class TestMarginRank(unittest.TestCase):
    def test_stated_form(self):
        # y=+1, x1=3, x2=1, m=0 → max(0, −(2))=0
        self.assertAlmostEqual(m.margin_ranking_loss(3.0, 1.0, 1.0, 0.0), 0.0)
        # y=+1, x1=1, x2=3, m=0 → max(0, −(−2))=2
        self.assertAlmostEqual(m.margin_ranking_loss(1.0, 3.0, 1.0, 0.0), 2.0)
        # y=+1, x1=1, x2=3, m=1 → 3
        self.assertAlmostEqual(m.margin_ranking_loss(1.0, 3.0, 1.0, 1.0), 3.0)
        # y=-1, x1=3, x2=1, m=0 → max(0, −(−1)·2)=2
        self.assertAlmostEqual(m.margin_ranking_loss(3.0, 1.0, -1.0, 0.0), 2.0)

    def test_null_missing(self):
        self.assertIsNone(m.margin_ranking_loss(None, 0.0, 1.0, 0.0))
        self.assertIsNone(m.margin_ranking_loss(0.0, None, 1.0, 0.0))
        self.assertIsNone(m.margin_ranking_loss(0.0, 0.0, None, 0.0))
        self.assertIsNone(m.margin_ranking_loss(0.0, 0.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.margin_ranking_loss(0.0, 0.0, 0.0, 0.0))
        self.assertIsNone(m.margin_ranking_loss(0.0, 0.0, 1.0, -0.1))


if __name__ == "__main__":
    unittest.main()
