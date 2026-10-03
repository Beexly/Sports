"""Offline identity tests for tinkabot_eq_ml_dropout_weight_scale. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_dropout_weight_scale as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("dropout_weight_scale",))
        self.assertTrue(callable(m.dropout_weight_scale))

    def test_no_forbidden_copies(self):
        for name in (
            "residual_add",
            "residual_projection",
            "iou_loss",
            "intersection_over_union",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestDropoutWeightScale(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.dropout_weight_scale(2.0, 0.5), 1.0)
        self.assertAlmostEqual(m.dropout_weight_scale(10.0, 1.0), 10.0)
        self.assertAlmostEqual(m.dropout_weight_scale(4.0, 0.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.dropout_weight_scale(None, 0.5))
        self.assertIsNone(m.dropout_weight_scale(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.dropout_weight_scale(1.0, -0.1))
        self.assertIsNone(m.dropout_weight_scale(1.0, 1.1))
        self.assertIsNone(m.dropout_weight_scale(float("nan"), 0.5))
        self.assertIsNone(m.dropout_weight_scale(True, 0.5))
        self.assertIsNone(m.dropout_weight_scale(1.0, "0.5"))


if __name__ == "__main__":
    unittest.main()
