"""Offline identity tests for tinkabot_eq_ml_spice_recall. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_spice_recall as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("spice_recall",))
        self.assertTrue(callable(m.spice_recall))

    def test_no_forbidden_copies(self):
        for name in (
            "spice_f1",
            "spice_precision",
            "expected_calibration_error",
            "maximum_calibration_error",
            "cider",
            "cohen_kappa",
            "bleu_score",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSpiceRecall(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.spice_recall(3, 4), 0.75)
        self.assertAlmostEqual(m.spice_recall(0, 5), 0.0)
        self.assertAlmostEqual(m.spice_recall(2, 2), 1.0)
        self.assertAlmostEqual(m.spice_recall(1, 10), 0.1)

    def test_null_missing(self):
        self.assertIsNone(m.spice_recall(None, 4))
        self.assertIsNone(m.spice_recall(3, None))

    def test_null_bad(self):
        self.assertIsNone(m.spice_recall(float("nan"), 4))
        self.assertIsNone(m.spice_recall(3, float("inf")))
        self.assertIsNone(m.spice_recall("3", 4))
        self.assertIsNone(m.spice_recall(3, 0))
        self.assertIsNone(m.spice_recall(-1, 4))
        self.assertIsNone(m.spice_recall(True, 4))


if __name__ == "__main__":
    unittest.main()
