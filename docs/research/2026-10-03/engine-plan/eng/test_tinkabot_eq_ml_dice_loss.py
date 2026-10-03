"""Tests for dice_loss (Milletari et al. V-Net)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_dice_loss import COLUMN_BACKED_FUNCS, IDENTITY, dice_loss


class TestDiceLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("dice_loss", COLUMN_BACKED_FUNCS)

    def test_perfect(self) -> None:
        self.assertAlmostEqual(dice_loss([1.0, 0.0, 1.0], [1.0, 0.0, 1.0]), 0.0)

    def test_disjoint(self) -> None:
        # num=0 → loss=1
        self.assertAlmostEqual(dice_loss([1.0, 0.0], [0.0, 1.0]), 1.0)

    def test_basic(self) -> None:
        # p=[1,1] g=[1,0]: num=1, den=1+1+1+0=3 → dice=2/3 → loss=1/3
        self.assertAlmostEqual(dice_loss([1.0, 1.0], [1.0, 0.0]), 1.0 / 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(dice_loss(None, [1.0]))
        self.assertIsNone(dice_loss([1.0], [1.0, 0.0]))
        self.assertIsNone(dice_loss([0.0, 0.0], [0.0, 0.0]))
        self.assertIsNone(dice_loss([], []))


if __name__ == "__main__":
    unittest.main()
