"""Offline identity tests for tinkabot_eq_ml_giou. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_giou as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("generalized_iou",))
        self.assertTrue(callable(m.generalized_iou))

    def test_no_forbidden_copies(self):
        for name in ("jaccard", "dice_coefficient", "margin_ranking_loss", "bass"):
            self.assertFalse(hasattr(m, name), name)


class TestGIoU(unittest.TestCase):
    def test_stated_form(self):
        # Identical: I=U=C=4 → IoU=1, GIoU=1
        self.assertAlmostEqual(m.generalized_iou(4.0, 4.0, 4.0), 1.0)
        # I=2, U=4, C=8 → IoU=0.5, GIoU=0.5−4/8=0.0
        self.assertAlmostEqual(m.generalized_iou(2.0, 4.0, 8.0), 0.0)
        # I=1, U=3, C=6 → 1/3 − 3/6 = 1/3 − 0.5
        self.assertAlmostEqual(m.generalized_iou(1.0, 3.0, 6.0), 1.0 / 3.0 - 0.5)

    def test_null_missing(self):
        self.assertIsNone(m.generalized_iou(None, 1.0, 1.0))
        self.assertIsNone(m.generalized_iou(1.0, None, 1.0))
        self.assertIsNone(m.generalized_iou(1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.generalized_iou(-1.0, 1.0, 1.0))
        self.assertIsNone(m.generalized_iou(2.0, 1.0, 3.0))  # I>U
        self.assertIsNone(m.generalized_iou(1.0, 3.0, 2.0))  # U>C
        self.assertIsNone(m.generalized_iou(0.0, 0.0, 1.0))  # U=0


if __name__ == "__main__":
    unittest.main()
