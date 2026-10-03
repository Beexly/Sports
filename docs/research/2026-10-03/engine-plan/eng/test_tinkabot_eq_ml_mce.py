"""Offline identity tests for tinkabot_eq_ml_mce. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_mce as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("maximum_calibration_error",))
        self.assertTrue(callable(m.maximum_calibration_error))

    def test_no_forbidden_copies(self):
        for name in (
            "expected_calibration_error",
            "bleu_score",
            "rouge_n",
            "matthews_corrcoef",
            "chrf",
            "meteor_fmean",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestMce(unittest.TestCase):
    def test_stated_form(self):
        # Eq. (5): largest absolute gap
        self.assertAlmostEqual(m.maximum_calibration_error([0.8, 0.5], [0.5, 0.5]), 0.3)
        self.assertAlmostEqual(m.maximum_calibration_error([0.2], [0.7]), 0.5)
        self.assertAlmostEqual(m.maximum_calibration_error([0.9, 0.1], [0.9, 0.1]), 0.0)
        self.assertAlmostEqual(m.maximum_calibration_error([0.0, 1.0], [0.4, 0.6]), 0.4)

    def test_null_missing(self):
        self.assertIsNone(m.maximum_calibration_error(None, [0.5]))
        self.assertIsNone(m.maximum_calibration_error([0.5], None))

    def test_null_bad(self):
        self.assertIsNone(m.maximum_calibration_error([], []))
        self.assertIsNone(m.maximum_calibration_error([0.5], [0.5, 0.5]))
        self.assertIsNone(m.maximum_calibration_error([float("nan")], [0.5]))
        self.assertIsNone(m.maximum_calibration_error([0.5], [float("inf")]))
        self.assertIsNone(m.maximum_calibration_error("0.5", [0.5]))


if __name__ == "__main__":
    unittest.main()
