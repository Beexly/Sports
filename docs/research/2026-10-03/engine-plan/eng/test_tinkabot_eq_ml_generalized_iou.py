"""Tests for generalized_iou (Rezatofighi et al. 2019 Alg. 1)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_generalized_iou import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    generalized_iou,
)


class TestGeneralizedIou(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("generalized_iou", COLUMN_BACKED_FUNCS)

    def test_perfect_overlap(self) -> None:
        self.assertAlmostEqual(generalized_iou(1.0, 0.0), 1.0)

    def test_penalty(self) -> None:
        # IoU=0.5, empty ratio=0.25 → GIoU=0.25
        self.assertAlmostEqual(generalized_iou(0.5, 0.25), 0.25)

    def test_null_guards(self) -> None:
        self.assertIsNone(generalized_iou(None, 0.0))
        self.assertIsNone(generalized_iou(0.5, None))
        self.assertIsNone(generalized_iou(1.5, 0.0))
        self.assertIsNone(generalized_iou(0.5, -0.1))
        self.assertIsNone(generalized_iou(float("nan"), 0.0))


if __name__ == "__main__":
    unittest.main()
