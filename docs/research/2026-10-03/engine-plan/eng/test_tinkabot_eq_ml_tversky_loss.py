"""Tests for tversky_loss (Salehi et al.)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_tversky_loss import COLUMN_BACKED_FUNCS, IDENTITY, tversky_loss


class TestTverskyLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("tversky_loss", COLUMN_BACKED_FUNCS)

    def test_perfect(self) -> None:
        self.assertAlmostEqual(tversky_loss([1.0, 0.0, 1.0], [1.0, 0.0, 1.0]), 0.0)

    def test_dice_special_case(self) -> None:
        # α=β=0.5 → Dice soft form on binary; TP=1 FN=0 FP=1 → den=1+0.5=1.5 → L=1-2/3=1/3
        # Wait: TP=1, FN=0, FP=1, den=1+0.5*0+0.5*1=1.5, L=1-1/1.5=1/3
        self.assertAlmostEqual(tversky_loss([1.0, 1.0], [1.0, 0.0], 0.5, 0.5), 1.0 / 3.0)

    def test_alpha_beta(self) -> None:
        # TP=1 FN=0 FP=1 α=1 β=0 → den=1 → L=0
        self.assertAlmostEqual(tversky_loss([1.0, 1.0], [1.0, 0.0], 1.0, 0.0), 0.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(tversky_loss(None, [1.0]))
        self.assertIsNone(tversky_loss([1.0], [1.0, 0.0]))
        self.assertIsNone(tversky_loss([0.0], [0.0], 0.5, 0.5))
        self.assertIsNone(tversky_loss([1.0], [1.0], -0.1, 0.5))


if __name__ == "__main__":
    unittest.main()
