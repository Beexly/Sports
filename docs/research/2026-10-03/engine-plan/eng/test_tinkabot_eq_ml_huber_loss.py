"""Tests for huber_loss (Huber 1964)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_huber_loss import COLUMN_BACKED_FUNCS, IDENTITY, huber_loss


class TestHuberLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("huber_loss", COLUMN_BACKED_FUNCS)

    def test_quadratic_region(self) -> None:
        # |a|=0.5 ≤ δ=1 → 0.5*(0.25)=0.125
        self.assertAlmostEqual(huber_loss(1.0, 0.5, 1.0), 0.125)

    def test_linear_region(self) -> None:
        # |a|=2, δ=1 → 1*(2−0.5)=1.5
        self.assertAlmostEqual(huber_loss(3.0, 1.0, 1.0), 1.5)

    def test_zero(self) -> None:
        self.assertAlmostEqual(huber_loss(2.0, 2.0, 1.0), 0.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(huber_loss(None, 1.0))
        self.assertIsNone(huber_loss(1.0, 1.0, 0.0))
        self.assertIsNone(huber_loss(1.0, 1.0, -1.0))
        self.assertIsNone(huber_loss(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
