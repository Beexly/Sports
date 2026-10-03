"""Offline identity tests for tinkabot_eq_ml_bertscore_recall. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_bertscore_recall as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bertscore_recall",))
        self.assertTrue(callable(m.bertscore_recall))

    def test_no_forbidden_copies(self):
        for name in (
            "bertscore_f",
            "bertscore_precision",
            "spice_f1",
            "spice_precision",
            "spice_recall",
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cohen_kappa",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBertscoreRecall(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.bertscore_recall([1.0, 1.0]), 1.0)
        self.assertAlmostEqual(m.bertscore_recall([0.5, 1.0, 0.0]), 0.5)
        self.assertAlmostEqual(m.bertscore_recall([0.8]), 0.8)
        self.assertAlmostEqual(m.bertscore_recall([0.2, 0.4, 0.6, 0.8]), 0.5)

    def test_null_missing(self):
        self.assertIsNone(m.bertscore_recall(None))

    def test_null_bad(self):
        self.assertIsNone(m.bertscore_recall([]))
        self.assertIsNone(m.bertscore_recall([float("nan")]))
        self.assertIsNone(m.bertscore_recall([0.5, float("inf")]))
        self.assertIsNone(m.bertscore_recall("0.5"))
        self.assertIsNone(m.bertscore_recall([True]))


if __name__ == "__main__":
    unittest.main()
