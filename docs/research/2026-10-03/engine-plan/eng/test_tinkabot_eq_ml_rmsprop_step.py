"""Tests for rmsprop_step (Ruder arXiv:1609.04747 Eq. 18)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_rmsprop_step import COLUMN_BACKED_FUNCS, IDENTITY, rmsprop_step


class TestRmspropStep(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("rmsprop_step", COLUMN_BACKED_FUNCS)

    def test_basic_step(self) -> None:
        # θ=1, g=1, E=1, η=0.1, ε tiny → ≈ 1 - 0.1 = 0.9
        self.assertAlmostEqual(rmsprop_step(1.0, 1.0, 1.0, 0.1, 1e-12), 0.9, places=5)

    def test_zero_grad(self) -> None:
        self.assertAlmostEqual(rmsprop_step(2.0, 0.0, 1.0, 0.01, 1e-8), 2.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(rmsprop_step(None, 1.0, 1.0, 0.1))
        self.assertIsNone(rmsprop_step(1.0, None, 1.0, 0.1))
        self.assertIsNone(rmsprop_step(1.0, 1.0, -0.1, 0.1))
        self.assertIsNone(rmsprop_step(1.0, 1.0, 1.0, 0.0))
        self.assertIsNone(rmsprop_step(1.0, 1.0, 1.0, 0.1, 0.0))
        self.assertIsNone(rmsprop_step(1.0, float("nan"), 1.0, 0.1))


if __name__ == "__main__":
    unittest.main()
