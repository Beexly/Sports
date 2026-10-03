"""Offline identity tests for tinkabot_eq_ml_f_beta. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_f_beta as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("f_beta_score",))
        self.assertTrue(callable(m.f_beta_score))

    def test_no_forbidden_copies(self):
        for name in (
            "dice_coefficient",
            "jaccard",
            "distance_iou",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestFBeta(unittest.TestCase):
    def test_stated_form(self):
        # β=1, P=R=1 → 1
        self.assertAlmostEqual(m.f_beta_score(1.0, 1.0, 1.0), 1.0)
        # β=1, P=0.5, R=1 → 2*0.5*1/(0.5+1)=1/1.5=2/3
        self.assertAlmostEqual(m.f_beta_score(0.5, 1.0, 1.0), 2.0 / 3.0)
        # β=2, P=1, R=0.5 → (1+4)*1*0.5 / (4*1+0.5) = 2.5/4.5
        self.assertAlmostEqual(m.f_beta_score(1.0, 0.5, 2.0), 2.5 / 4.5)

    def test_null_missing(self):
        self.assertIsNone(m.f_beta_score(None, 1.0, 1.0))
        self.assertIsNone(m.f_beta_score(1.0, None, 1.0))
        self.assertIsNone(m.f_beta_score(1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.f_beta_score(-0.1, 1.0, 1.0))
        self.assertIsNone(m.f_beta_score(1.0, 1.1, 1.0))
        self.assertIsNone(m.f_beta_score(1.0, 1.0, 0.0))
        self.assertIsNone(m.f_beta_score(0.0, 0.0, 1.0))  # den=0


if __name__ == "__main__":
    unittest.main()
