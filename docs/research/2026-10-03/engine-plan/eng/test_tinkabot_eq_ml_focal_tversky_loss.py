"""Tests for focal_tversky_loss (Abraham et al.)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_focal_tversky_loss import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    focal_tversky_loss,
)


class TestFocalTverskyLoss(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("focal_tversky_loss", COLUMN_BACKED_FUNCS)

    def test_perfect(self) -> None:
        self.assertAlmostEqual(
            focal_tversky_loss([1.0, 0.0, 1.0], [1.0, 0.0, 1.0]), 0.0
        )

    def test_gamma_one_matches_tversky(self) -> None:
        # γ=1 → same as tversky loss; TP=1 FN=0 FP=1 α=β=0.5 → L=1/3
        self.assertAlmostEqual(
            focal_tversky_loss([1.0, 1.0], [1.0, 0.0], 0.5, 0.5, 1.0),
            1.0 / 3.0,
        )

    def test_gamma_two(self) -> None:
        # TI=2/3, γ=2 → (1/3)^2 = 1/9
        self.assertAlmostEqual(
            focal_tversky_loss([1.0, 1.0], [1.0, 0.0], 0.5, 0.5, 2.0),
            1.0 / 9.0,
        )

    def test_null_guards(self) -> None:
        self.assertIsNone(focal_tversky_loss(None, [1.0]))
        self.assertIsNone(focal_tversky_loss([1.0], [1.0, 0.0]))
        self.assertIsNone(focal_tversky_loss([0.0], [0.0]))
        self.assertIsNone(focal_tversky_loss([1.0], [1.0], 0.5, 0.5, -1.0))


if __name__ == "__main__":
    unittest.main()
