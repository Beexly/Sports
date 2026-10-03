"""Offline identity tests for tinkabot_eq_ml_gleu_score. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_gleu_score as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("gleu_score",))
        self.assertTrue(callable(m.gleu_score))

    def test_no_forbidden_copies(self):
        for name in (
            "bertscore_f",
            "bertscore_idf",
            "smatch_score",
            "spice_f1",
            "bleu_score",
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cohen_kappa",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestGleuScore(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.gleu_score(0.8, 0.6), 0.6)
        self.assertAlmostEqual(m.gleu_score(0.5, 0.9), 0.5)
        self.assertAlmostEqual(m.gleu_score(1.0, 1.0), 1.0)
        self.assertAlmostEqual(m.gleu_score(0.0, 0.7), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.gleu_score(None, 0.5))
        self.assertIsNone(m.gleu_score(0.5, None))

    def test_null_bad(self):
        self.assertIsNone(m.gleu_score(float("nan"), 0.5))
        self.assertIsNone(m.gleu_score(0.5, float("inf")))
        self.assertIsNone(m.gleu_score("0.5", 0.5))
        self.assertIsNone(m.gleu_score(True, 0.5))


if __name__ == "__main__":
    unittest.main()
