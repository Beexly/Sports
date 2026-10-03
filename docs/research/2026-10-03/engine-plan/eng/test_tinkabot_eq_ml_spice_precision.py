"""Offline identity tests for tinkabot_eq_ml_spice_precision. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_spice_precision as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("spice_precision",))
        self.assertTrue(callable(m.spice_precision))

    def test_no_forbidden_copies(self):
        for name in (
            "spice_f1",
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cohen_kappa",
            "bleu_score",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSpicePrecision(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.spice_precision(3, 4), 0.75)
        self.assertAlmostEqual(m.spice_precision(0, 5), 0.0)
        self.assertAlmostEqual(m.spice_precision(2, 2), 1.0)
        self.assertAlmostEqual(m.spice_precision(1, 10), 0.1)

    def test_null_missing(self):
        self.assertIsNone(m.spice_precision(None, 4))
        self.assertIsNone(m.spice_precision(3, None))

    def test_null_bad(self):
        self.assertIsNone(m.spice_precision(float("nan"), 4))
        self.assertIsNone(m.spice_precision(3, float("inf")))
        self.assertIsNone(m.spice_precision("3", 4))
        self.assertIsNone(m.spice_precision(3, 0))
        self.assertIsNone(m.spice_precision(-1, 4))
        self.assertIsNone(m.spice_precision(True, 4))


if __name__ == "__main__":
    unittest.main()
