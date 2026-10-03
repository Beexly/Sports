"""Offline identity tests for tinkabot_eq_ml_smatch_score. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_smatch_score as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("smatch_score",))
        self.assertTrue(callable(m.smatch_score))

    def test_no_forbidden_copies(self):
        for name in (
            "bertscore_f",
            "bertscore_precision",
            "bertscore_recall",
            "bertscore_rescaled",
            "spice_f1",
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cohen_kappa",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSmatchScore(unittest.TestCase):
    def test_stated_form(self):
        # paper example: mappings yield 0.73, 0.18, 0, 0, 0, 0.36 → smatch 0.73
        self.assertAlmostEqual(m.smatch_score([0.73, 0.18, 0.0, 0.0, 0.0, 0.36]), 0.73)
        self.assertAlmostEqual(m.smatch_score([0.5]), 0.5)
        self.assertAlmostEqual(m.smatch_score([0.1, 0.9, 0.2]), 0.9)
        self.assertAlmostEqual(m.smatch_score([-0.1, 0.0]), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.smatch_score(None))

    def test_null_bad(self):
        self.assertIsNone(m.smatch_score([]))
        self.assertIsNone(m.smatch_score([float("nan")]))
        self.assertIsNone(m.smatch_score([0.5, float("inf")]))
        self.assertIsNone(m.smatch_score("0.5"))
        self.assertIsNone(m.smatch_score([True]))


if __name__ == "__main__":
    unittest.main()
