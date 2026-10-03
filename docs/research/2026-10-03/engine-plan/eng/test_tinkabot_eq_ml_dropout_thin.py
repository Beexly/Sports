"""Offline identity tests for tinkabot_eq_ml_dropout_thin. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_dropout_thin as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("dropout_thin",))
        self.assertTrue(callable(m.dropout_thin))

    def test_no_forbidden_copies(self):
        for name in (
            "dropout_weight_scale",
            "residual_add",
            "residual_projection",
            "iou_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestDropoutThin(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.dropout_thin(4.0, 1.0), 4.0)
        self.assertAlmostEqual(m.dropout_thin(4.0, 0.0), 0.0)
        self.assertAlmostEqual(m.dropout_thin(4.0, 0.5), 2.0)

    def test_null_missing(self):
        self.assertIsNone(m.dropout_thin(None, 1.0))
        self.assertIsNone(m.dropout_thin(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.dropout_thin(1.0, -0.1))
        self.assertIsNone(m.dropout_thin(1.0, 1.1))
        self.assertIsNone(m.dropout_thin(float("nan"), 1.0))
        self.assertIsNone(m.dropout_thin(True, 1.0))
        self.assertIsNone(m.dropout_thin(1.0, "1"))


if __name__ == "__main__":
    unittest.main()
