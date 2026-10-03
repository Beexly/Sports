"""Tests for mae_loss."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_mae_loss import COLUMN_BACKED_FUNCS, IDENTITY, mae_loss


class TestMaeLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("mae_loss", COLUMN_BACKED_FUNCS)

    def test_zero(self) -> None:
        self.assertAlmostEqual(mae_loss([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # |1−0|+|3−1| / 2 = 3/2 = 1.5
        self.assertAlmostEqual(mae_loss([1.0, 3.0], [0.0, 1.0]), 1.5)

    def test_single(self) -> None:
        self.assertAlmostEqual(mae_loss([5.0], [2.0]), 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(mae_loss(None, [1.0]))
        self.assertIsNone(mae_loss([1.0], [1.0, 2.0]))
        self.assertIsNone(mae_loss([], []))
        self.assertIsNone(mae_loss([1.0], [float("nan")]))


if __name__ == "__main__":
    unittest.main()
