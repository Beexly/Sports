"""Tests for giou_loss (Rezatofighi et al. 2019 §3)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_giou_loss import COLUMN_BACKED_FUNCS, IDENTITY, giou_loss


class TestGiouLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("giou_loss", COLUMN_BACKED_FUNCS)

    def test_perfect(self) -> None:
        self.assertAlmostEqual(giou_loss(1.0), 0.0)

    def test_worst(self) -> None:
        self.assertAlmostEqual(giou_loss(-1.0), 2.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(giou_loss(None))
        self.assertIsNone(giou_loss(1.5))
        self.assertIsNone(giou_loss(-1.1))
        self.assertIsNone(giou_loss(float("nan")))


if __name__ == "__main__":
    unittest.main()
