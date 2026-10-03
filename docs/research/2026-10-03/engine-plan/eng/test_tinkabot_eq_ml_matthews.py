"""Offline identity tests for tinkabot_eq_ml_matthews. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_matthews as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("matthews_corrcoef",))
        self.assertTrue(callable(m.matthews_corrcoef))

    def test_no_forbidden_copies(self):
        for name in ("f_beta_score", "pearson", "jaccard", "margin_ranking_loss"):
            self.assertFalse(hasattr(m, name), name)


class TestMCC(unittest.TestCase):
    def test_stated_form(self):
        # Perfect: TP=TN=10, FP=FN=0 → 1
        self.assertAlmostEqual(m.matthews_corrcoef(10.0, 10.0, 0.0, 0.0), 1.0)
        # All wrong opposite: TP=TN=0, FP=FN=10 → -1
        self.assertAlmostEqual(m.matthews_corrcoef(0.0, 0.0, 10.0, 10.0), -1.0)
        # TP=5,TN=5,FP=3,FN=2
        num = 5 * 5 - 3 * 2
        den = math.sqrt((5 + 3) * (5 + 2) * (5 + 3) * (5 + 2))
        self.assertAlmostEqual(m.matthews_corrcoef(5.0, 5.0, 3.0, 2.0), num / den)

    def test_null_missing(self):
        self.assertIsNone(m.matthews_corrcoef(None, 1.0, 0.0, 0.0))
        self.assertIsNone(m.matthews_corrcoef(1.0, None, 0.0, 0.0))
        self.assertIsNone(m.matthews_corrcoef(1.0, 1.0, None, 0.0))
        self.assertIsNone(m.matthews_corrcoef(1.0, 1.0, 0.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.matthews_corrcoef(-1.0, 1.0, 0.0, 0.0))
        self.assertIsNone(m.matthews_corrcoef(0.0, 0.0, 0.0, 0.0))  # den=0


if __name__ == "__main__":
    unittest.main()
