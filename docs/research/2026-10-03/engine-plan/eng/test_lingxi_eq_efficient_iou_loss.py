"""Kill test for lingxi_eq_efficient_iou_loss.

Fails if reduced to 1−IoU only, if DIoU (center term only) is returned,
or if CIoU-style αv aspect (no width/height ρ² terms) is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_efficient_iou_loss as m


class TestEfficientIouLoss(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("efficient_iou_loss",))

    def test_printed_eq7(self) -> None:
        # IoU=0.5, ρ²(b)=1, wc²=4, hc²=5 → c²=9; ρ²(w)=1, ρ²(h)=4
        # L = 1-0.5 + 1/9 + 1/4 + 4/5 = 0.5 + 0.111... + 0.25 + 0.8
        got = m.efficient_iou_loss(0.5, 1.0, 4.0, 5.0, 1.0, 4.0)
        expect = 0.5 + (1.0 / 9.0) + (1.0 / 4.0) + (4.0 / 5.0)
        self.assertAlmostEqual(got, expect)
        # Not LIoU alone
        self.assertNotAlmostEqual(got, 1.0 - 0.5)
        # Not DIoU-style 1−IoU + ρ²/c² only
        self.assertNotAlmostEqual(got, 0.5 + 1.0 / 9.0)
        # Not GIoU-style without aspect side terms
        self.assertGreater(got, 0.5 + 1.0 / 9.0)

    def test_perfect_overlap_zero_penalties(self) -> None:
        got = m.efficient_iou_loss(1.0, 0.0, 1.0, 1.0, 0.0, 0.0)
        self.assertAlmostEqual(got, 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.efficient_iou_loss(None, 1.0, 1.0, 1.0, 0.0, 0.0))
        self.assertIsNone(m.efficient_iou_loss(0.5, None, 1.0, 1.0, 0.0, 0.0))
        self.assertIsNone(m.efficient_iou_loss(1.5, 0.0, 1.0, 1.0, 0.0, 0.0))
        self.assertIsNone(m.efficient_iou_loss(0.5, -1.0, 1.0, 1.0, 0.0, 0.0))
        self.assertIsNone(m.efficient_iou_loss(0.5, 0.0, 0.0, 1.0, 0.0, 0.0))
        self.assertIsNone(m.efficient_iou_loss(0.5, 0.0, 1.0, 0.0, 0.0, 0.0))
        self.assertIsNone(m.efficient_iou_loss(0.5, 0.0, 1.0, 1.0, -0.1, 0.0))
        self.assertIsNone(m.efficient_iou_loss(0.5, float("nan"), 1.0, 1.0, 0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
