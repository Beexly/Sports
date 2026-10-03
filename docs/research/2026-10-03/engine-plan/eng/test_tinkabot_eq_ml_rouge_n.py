"""Offline identity tests for tinkabot_eq_ml_rouge_n. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_rouge_n as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("rouge_n",))
        self.assertTrue(callable(m.rouge_n))

    def test_no_forbidden_copies(self):
        for name in (
            "bleu_score",
            "matthews_corrcoef",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
            "dice_coefficient",
            "f_beta_score",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestRougeN(unittest.TestCase):
    def test_stated_form(self):
        # Eq. (1): ratio of the two printed sums.
        self.assertAlmostEqual(m.rouge_n(2.0, 4.0), 0.5)
        self.assertAlmostEqual(m.rouge_n(4.0, 4.0), 1.0)
        self.assertAlmostEqual(m.rouge_n(0.0, 5.0), 0.0)
        # integer counts as printed
        self.assertAlmostEqual(m.rouge_n(3, 7), 3.0 / 7.0)

    def test_null_missing(self):
        self.assertIsNone(m.rouge_n(None, 4.0))
        self.assertIsNone(m.rouge_n(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.rouge_n(-1.0, 4.0))
        self.assertIsNone(m.rouge_n(1.0, 0.0))
        self.assertIsNone(m.rouge_n(1.0, -2.0))
        self.assertIsNone(m.rouge_n(5.0, 4.0))
        self.assertIsNone(m.rouge_n(float("nan"), 1.0))
        self.assertIsNone(m.rouge_n(1.0, float("inf")))
        self.assertIsNone(m.rouge_n("2", 4.0))


if __name__ == "__main__":
    unittest.main()
