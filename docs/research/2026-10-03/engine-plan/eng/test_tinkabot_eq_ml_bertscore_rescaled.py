"""Offline identity tests for tinkabot_eq_ml_bertscore_rescaled. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_bertscore_rescaled as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bertscore_rescaled",))
        self.assertTrue(callable(m.bertscore_rescaled))

    def test_no_forbidden_copies(self):
        for name in (
            "bertscore_f",
            "bertscore_precision",
            "bertscore_recall",
            "spice_f1",
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cohen_kappa",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBertscoreRescaled(unittest.TestCase):
    def test_stated_form(self):
        # (s - b) / (1 - b)
        self.assertAlmostEqual(m.bertscore_rescaled(0.9, 0.5), 0.8)
        self.assertAlmostEqual(m.bertscore_rescaled(1.0, 0.0), 1.0)
        self.assertAlmostEqual(m.bertscore_rescaled(0.5, 0.5), 0.0)
        self.assertAlmostEqual(m.bertscore_rescaled(0.75, 0.25), 2.0 / 3.0)

    def test_null_missing(self):
        self.assertIsNone(m.bertscore_rescaled(None, 0.5))
        self.assertIsNone(m.bertscore_rescaled(0.5, None))

    def test_null_bad(self):
        self.assertIsNone(m.bertscore_rescaled(float("nan"), 0.5))
        self.assertIsNone(m.bertscore_rescaled(0.5, float("inf")))
        self.assertIsNone(m.bertscore_rescaled("0.5", 0.5))
        self.assertIsNone(m.bertscore_rescaled(0.5, 1.0))
        self.assertIsNone(m.bertscore_rescaled(True, 0.5))


if __name__ == "__main__":
    unittest.main()
