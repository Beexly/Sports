"""Offline identity tests for tinkabot_eq_ml_ranknet_pair. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_ranknet_pair as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("ranknet_pair_cost",))
        self.assertTrue(callable(m.ranknet_pair_cost))

    def test_no_forbidden_copies(self):
        for name in ("smooth_l1_loss", "nt_xent_loss", "hinge_loss", "infonce_loss"):
            self.assertFalse(hasattr(m, name), name)


class TestRankNet(unittest.TestCase):
    def test_stated_form(self):
        # s_i=s_j, σ=1 → P=0.5; ȳ=1 → −log(0.5)=log(2)
        self.assertAlmostEqual(m.ranknet_pair_cost(0.0, 0.0, 1.0, 1.0), math.log(2.0))
        self.assertAlmostEqual(m.ranknet_pair_cost(0.0, 0.0, 0.0, 1.0), math.log(2.0))
        # s_i >> s_j, ȳ=1 → P→1 → C→0
        self.assertAlmostEqual(m.ranknet_pair_cost(20.0, 0.0, 1.0, 1.0), 0.0, places=6)

    def test_null_missing(self):
        self.assertIsNone(m.ranknet_pair_cost(None, 0.0, 1.0, 1.0))
        self.assertIsNone(m.ranknet_pair_cost(0.0, None, 1.0, 1.0))
        self.assertIsNone(m.ranknet_pair_cost(0.0, 0.0, None, 1.0))
        self.assertIsNone(m.ranknet_pair_cost(0.0, 0.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.ranknet_pair_cost(0.0, 0.0, 0.5, 1.0))
        self.assertIsNone(m.ranknet_pair_cost(0.0, 0.0, 1.0, 0.0))
        self.assertIsNone(m.ranknet_pair_cost(0.0, 0.0, 1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
