"""Offline identity tests for tinkabot_eq_ml_ciou. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_ciou as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("complete_iou_loss",))
        self.assertTrue(callable(m.complete_iou_loss))

    def test_no_forbidden_copies(self):
        for name in (
            "distance_iou",
            "generalized_iou",
            "matthews_corrcoef",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
            "bleu_score",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCIoU(unittest.TestCase):
    def test_stated_form(self):
        # Perfect overlap, identical aspect: v=0, L=0.
        self.assertAlmostEqual(
            m.complete_iou_loss(1.0, 0.0, 1.0, 2.0, 2.0, 2.0, 2.0), 0.0
        )
        # Same aspect, v=0: L = 1 − IoU + ρ²/c².
        self.assertAlmostEqual(
            m.complete_iou_loss(0.25, 0.16, 1.0, 3.0, 1.0, 6.0, 2.0),
            1.0 - 0.25 + 0.16,
        )
        # Eq. (9)+(11) only: IoU=1, ρ=0, so L = v.
        v = (4.0 / (math.pi ** 2)) * (math.atan(0.5) - math.atan(1.0)) ** 2
        self.assertAlmostEqual(
            m.complete_iou_loss(1.0, 0.0, 4.0, 1.0, 1.0, 1.0, 2.0), v
        )
        # No overlap, no distance, square boxes: L = 1.
        self.assertAlmostEqual(
            m.complete_iou_loss(0.0, 0.0, 9.0, 3.0, 3.0, 3.0, 3.0), 1.0
        )

    def test_null_missing(self):
        good = (0.5, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0)
        for i in range(7):
            args = list(good)
            args[i] = None
            self.assertIsNone(m.complete_iou_loss(*args))

    def test_null_bad(self):
        self.assertIsNone(m.complete_iou_loss(-0.1, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.complete_iou_loss(1.1, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.complete_iou_loss(0.5, -0.1, 1.0, 1.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.complete_iou_loss(0.5, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.complete_iou_loss(0.5, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0))
        self.assertIsNone(m.complete_iou_loss(0.5, 0.0, 1.0, 1.0, -1.0, 1.0, 1.0))
        self.assertIsNone(m.complete_iou_loss(0.5, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0))
        self.assertIsNone(
            m.complete_iou_loss(float("nan"), 0.0, 1.0, 1.0, 1.0, 1.0, 1.0)
        )


if __name__ == "__main__":
    unittest.main()
