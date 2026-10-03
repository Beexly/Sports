"""Offline identity tests for tinkabot_eq_ml_spice_f1. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_spice_f1 as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("spice_f1",))
        self.assertTrue(callable(m.spice_f1))

    def test_no_forbidden_copies(self):
        for name in (
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cider_n",
            "cohen_kappa",
            "bleu_score",
            "rouge_n",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSpiceF1(unittest.TestCase):
    def test_stated_form(self):
        # F1 = 2PR/(P+R)
        self.assertAlmostEqual(m.spice_f1(1.0, 1.0), 1.0)
        self.assertAlmostEqual(m.spice_f1(0.5, 0.5), 0.5)
        self.assertAlmostEqual(m.spice_f1(1.0, 0.0), 0.0)
        self.assertAlmostEqual(m.spice_f1(0.8, 0.4), 2 * 0.8 * 0.4 / (0.8 + 0.4))

    def test_null_missing(self):
        self.assertIsNone(m.spice_f1(None, 0.5))
        self.assertIsNone(m.spice_f1(0.5, None))

    def test_null_bad(self):
        self.assertIsNone(m.spice_f1(float("nan"), 0.5))
        self.assertIsNone(m.spice_f1(0.5, float("inf")))
        self.assertIsNone(m.spice_f1("0.5", 0.5))
        self.assertIsNone(m.spice_f1(0.0, 0.0))
        self.assertIsNone(m.spice_f1(True, 0.5))


if __name__ == "__main__":
    unittest.main()
