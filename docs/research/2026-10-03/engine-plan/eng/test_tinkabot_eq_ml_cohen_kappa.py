"""Offline identity tests for tinkabot_eq_ml_cohen_kappa. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_cohen_kappa as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cohen_kappa",))
        self.assertTrue(callable(m.cohen_kappa))

    def test_no_forbidden_copies(self):
        for name in (
            "expected_calibration_error",
            "maximum_calibration_error",
            "bleu_score",
            "rouge_n",
            "matthews_corrcoef",
            "chrf",
            "meteor_fmean",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCohenKappa(unittest.TestCase):
    def test_stated_form(self):
        # K = (P(A) - P(E)) / (1 - P(E))
        self.assertAlmostEqual(m.cohen_kappa(0.8, 0.5), 0.6)
        self.assertAlmostEqual(m.cohen_kappa(1.0, 0.0), 1.0)
        self.assertAlmostEqual(m.cohen_kappa(0.5, 0.5), 0.0)
        self.assertAlmostEqual(m.cohen_kappa(0.0, 0.5), -1.0)

    def test_null_missing(self):
        self.assertIsNone(m.cohen_kappa(None, 0.5))
        self.assertIsNone(m.cohen_kappa(0.5, None))

    def test_null_bad(self):
        self.assertIsNone(m.cohen_kappa(float("nan"), 0.5))
        self.assertIsNone(m.cohen_kappa(0.5, float("inf")))
        self.assertIsNone(m.cohen_kappa("0.5", 0.5))
        self.assertIsNone(m.cohen_kappa(0.5, 1.0))  # denom 0
        self.assertIsNone(m.cohen_kappa(True, 0.5))


if __name__ == "__main__":
    unittest.main()
