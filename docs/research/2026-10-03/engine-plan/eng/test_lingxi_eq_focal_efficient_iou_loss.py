"""Kill test for lingxi_eq_focal_efficient_iou_loss.

Fails if reduced to L_EIoU alone, if IoU alone is returned, or if
binary focal_loss −(1−p)^γ log(p) shape is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_focal_efficient_iou_loss as m


class TestFocalEfficientIouLoss(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("focal_efficient_iou_loss",))

    def test_printed_eq10(self) -> None:
        # IoU=0.5, L_EIoU=1.2, γ=2 → 0.25 * 1.2 = 0.3
        got = m.focal_efficient_iou_loss(0.5, 1.2, 2.0)
        self.assertAlmostEqual(got, 0.3)
        self.assertNotAlmostEqual(got, 1.2)  # not bare L_EIoU
        self.assertNotAlmostEqual(got, 0.5)  # not bare IoU
        # not binary focal shape −(1−0.5)^2 log(0.5)
        fl = -((1.0 - 0.5) ** 2) * math.log(0.5)
        self.assertNotAlmostEqual(got, fl)

    def test_gamma_zero_is_leiou(self) -> None:
        got = m.focal_efficient_iou_loss(0.25, 0.8, 0.0)
        self.assertAlmostEqual(got, 0.8)

    def test_nulls(self) -> None:
        self.assertIsNone(m.focal_efficient_iou_loss(None, 1.0, 1.0))
        self.assertIsNone(m.focal_efficient_iou_loss(0.5, None, 1.0))
        self.assertIsNone(m.focal_efficient_iou_loss(0.5, 1.0, None))
        self.assertIsNone(m.focal_efficient_iou_loss(1.5, 1.0, 1.0))
        self.assertIsNone(m.focal_efficient_iou_loss(0.5, 1.0, -0.1))
        self.assertIsNone(m.focal_efficient_iou_loss(0.5, float("nan"), 1.0))


if __name__ == "__main__":
    unittest.main()
