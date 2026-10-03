"""Offline identity tests for tinkabot_eq_ml_label_smoothing. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_label_smoothing as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("label_smoothing",))
        self.assertTrue(callable(m.label_smoothing))

    def test_no_forbidden_copies(self):
        for name in (
            "dropout_thin",
            "dropout_weight_scale",
            "residual_add",
            "iou_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestLabelSmoothing(unittest.TestCase):
    def test_stated_form(self):
        # true class: δ=1, ε=0.1, K=1000 → 0.9 + 0.0001
        self.assertAlmostEqual(m.label_smoothing(1.0, 0.1, 1000), 0.9 + 0.1 / 1000)
        # other class: δ=0 → ε/K
        self.assertAlmostEqual(m.label_smoothing(0.0, 0.1, 1000), 0.1 / 1000)
        self.assertAlmostEqual(m.label_smoothing(1.0, 0.0, 10), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.label_smoothing(None, 0.1, 10))
        self.assertIsNone(m.label_smoothing(1.0, None, 10))
        self.assertIsNone(m.label_smoothing(1.0, 0.1, None))

    def test_null_bad(self):
        self.assertIsNone(m.label_smoothing(-0.1, 0.1, 10))
        self.assertIsNone(m.label_smoothing(1.0, 1.1, 10))
        self.assertIsNone(m.label_smoothing(1.0, 0.1, 0))
        self.assertIsNone(m.label_smoothing(1.0, 0.1, 2.5))
        self.assertIsNone(m.label_smoothing(float("nan"), 0.1, 10))
        self.assertIsNone(m.label_smoothing(True, 0.1, 10))


if __name__ == "__main__":
    unittest.main()
