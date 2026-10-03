"""Offline identity tests for tinkabot_eq_ml_bm25. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_bm25 as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bm25_term_weight",))
        self.assertTrue(callable(m.bm25_term_weight))

    def test_no_forbidden_copies(self):
        for name in (
            "complete_iou_loss",
            "bleu_score",
            "matthews_corrcoef",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBm25(unittest.TestCase):
    def test_stated_form(self):
        # b=0, k1=1, tf=2, rsj=1 → 2/(1+2)=2/3
        self.assertAlmostEqual(m.bm25_term_weight(2.0, 1.0, 0.0, 10.0, 10.0, 1.0), 2.0 / 3.0)
        # b=1, dl/avdl=2, k1=2, tf=3, rsj=4 → 3/(4+3)*4 = 12/7
        self.assertAlmostEqual(m.bm25_term_weight(3.0, 2.0, 1.0, 20.0, 10.0, 4.0), 12.0 / 7.0)
        # tf=0 → 0
        self.assertAlmostEqual(m.bm25_term_weight(0.0, 1.2, 0.75, 5.0, 5.0, 2.0), 0.0)
        # b=0.5, dl/avdl=2, k1=1, tf=1, rsj=1 → 1/(1.5+1)=0.4
        self.assertAlmostEqual(m.bm25_term_weight(1.0, 1.0, 0.5, 10.0, 5.0, 1.0), 0.4)
        # negative RSJ is allowed by the printed product
        self.assertAlmostEqual(m.bm25_term_weight(1.0, 1.0, 0.0, 1.0, 1.0, -2.0), -1.0)

    def test_null_missing(self):
        good = (1.0, 1.2, 0.75, 10.0, 10.0, 1.0)
        for i in range(6):
            args = list(good)
            args[i] = None
            self.assertIsNone(m.bm25_term_weight(*args))

    def test_null_bad(self):
        self.assertIsNone(m.bm25_term_weight(-1.0, 1.0, 0.5, 10.0, 10.0, 1.0))
        self.assertIsNone(m.bm25_term_weight(1.0, 0.0, 0.5, 10.0, 10.0, 1.0))
        self.assertIsNone(m.bm25_term_weight(1.0, -1.0, 0.5, 10.0, 10.0, 1.0))
        self.assertIsNone(m.bm25_term_weight(1.0, 1.0, 0.5, -1.0, 10.0, 1.0))
        self.assertIsNone(m.bm25_term_weight(1.0, 1.0, 0.5, 10.0, 0.0, 1.0))
        # k1>0 but printed denominator is 0 when tf=0, b=1, dl=0
        self.assertIsNone(m.bm25_term_weight(0.0, 1.5, 1.0, 0.0, 10.0, 1.0))
        self.assertIsNone(m.bm25_term_weight(float("nan"), 1.0, 0.5, 10.0, 10.0, 1.0))


if __name__ == "__main__":
    unittest.main()
