"""Tests for adadelta_step (Ruder arXiv:1609.04747 Eq. 17)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_adadelta_step import COLUMN_BACKED_FUNCS, IDENTITY, adadelta_step


class TestAdadeltaStep(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("adadelta_step", COLUMN_BACKED_FUNCS)

    def test_equal_rms(self) -> None:
        # EΔ=1, Eg=1, ε tiny, g=2 → Δθ ≈ -1*2 = -2
        self.assertAlmostEqual(adadelta_step(2.0, 1.0, 1.0, 1e-12), -2.0, places=5)

    def test_zero_grad(self) -> None:
        self.assertAlmostEqual(adadelta_step(0.0, 1.0, 1.0, 1e-6), 0.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(adadelta_step(None, 1.0, 1.0))
        self.assertIsNone(adadelta_step(1.0, None, 1.0))
        self.assertIsNone(adadelta_step(1.0, -0.1, 1.0))
        self.assertIsNone(adadelta_step(1.0, 1.0, 1.0, 0.0))
        self.assertIsNone(adadelta_step(float("nan"), 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
