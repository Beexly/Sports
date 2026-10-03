"""Offline identity tests for tinkabot_eq_ml_cider. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_cider as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cider_score",))
        self.assertTrue(callable(m.cider_score))

    def test_no_forbidden_copies(self):
        for name in (
            "cider_n",
            "expected_calibration_error",
            "maximum_calibration_error",
            "bleu_score",
            "bleu_brevity_penalty",
            "rouge_n",
            "rouge_l_recall",
            "rouge_s_skip2_recall",
            "matthews_corrcoef",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCider(unittest.TestCase):
    def test_stated_form(self):
        # N=1: identity
        self.assertAlmostEqual(m.cider_score([0.8]), 0.8)
        # N=4 uniform: mean of four CIDEr_n
        self.assertAlmostEqual(m.cider_score([1.0, 0.0, 0.5, 0.5]), 0.5)
        self.assertAlmostEqual(m.cider_score([0.2, 0.4, 0.6, 0.8]), 0.5)
        # two orders
        self.assertAlmostEqual(m.cider_score([1.0, 0.0]), 0.5)
        # perfect
        self.assertAlmostEqual(m.cider_score([1.0, 1.0, 1.0, 1.0]), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.cider_score(None))
        self.assertIsNone(m.cider_score([]))

    def test_null_bad(self):
        self.assertIsNone(m.cider_score([float("nan")]))
        self.assertIsNone(m.cider_score([1.0, float("inf")]))
        self.assertIsNone(m.cider_score("1"))
        self.assertIsNone(m.cider_score([None]))  # type: ignore[list-item]


if __name__ == "__main__":
    unittest.main()
