"""Offline identity tests for tinkabot_eq_ml_iou_loss. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_iou_loss as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("iou_loss",))
        self.assertTrue(callable(m.iou_loss))

    def test_no_forbidden_copies(self):
        for name in (
            "intersection_over_union",
            "generalized_iou",
            "distance_iou",
            "complete_iou",
            "residual_add",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestIouLoss(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.iou_loss(0.75), 0.25)
        self.assertAlmostEqual(m.iou_loss(1.0), 0.0)
        self.assertAlmostEqual(m.iou_loss(0.0), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.iou_loss(None))

    def test_null_bad(self):
        self.assertIsNone(m.iou_loss(-0.1))
        self.assertIsNone(m.iou_loss(1.1))
        self.assertIsNone(m.iou_loss(float("nan")))
        self.assertIsNone(m.iou_loss(True))
        self.assertIsNone(m.iou_loss("0.5"))


if __name__ == "__main__":
    unittest.main()
