"""Tests for mse_loss."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_mse_loss import COLUMN_BACKED_FUNCS, IDENTITY, mse_loss


class TestMseLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("mse_loss", COLUMN_BACKED_FUNCS)

    def test_zero(self) -> None:
        self.assertAlmostEqual(mse_loss([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # (1−0)²+(3−1)² / 2 = (1+4)/2 = 2.5
        self.assertAlmostEqual(mse_loss([1.0, 3.0], [0.0, 1.0]), 2.5)

    def test_single(self) -> None:
        self.assertAlmostEqual(mse_loss([5.0], [2.0]), 9.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(mse_loss(None, [1.0]))
        self.assertIsNone(mse_loss([1.0], [1.0, 2.0]))
        self.assertIsNone(mse_loss([], []))
        self.assertIsNone(mse_loss([1.0], [float("nan")]))


if __name__ == "__main__":
    unittest.main()
