"""Tests for binary_cross_entropy (Goodfellow et al. 2016)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_binary_cross_entropy import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    binary_cross_entropy,
)


class TestBinaryCrossEntropy(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("binary_cross_entropy", COLUMN_BACKED_FUNCS)

    def test_perfect(self) -> None:
        # y=1, ŷ→1⁻ is small; use ŷ=0.999
        self.assertAlmostEqual(
            binary_cross_entropy(1.0, 0.999), -math.log(0.999), places=10
        )

    def test_half(self) -> None:
        # y=0.5, ŷ=0.5 → −[0.5 ln 0.5 + 0.5 ln 0.5] = −ln 0.5
        self.assertAlmostEqual(
            binary_cross_entropy(0.5, 0.5), -math.log(0.5), places=12
        )

    def test_basic(self) -> None:
        expected = -(1.0 * math.log(0.8) + 0.0 * math.log(0.2))
        self.assertAlmostEqual(binary_cross_entropy(1.0, 0.8), expected, places=12)

    def test_null_guards(self) -> None:
        self.assertIsNone(binary_cross_entropy(None, 0.5))
        self.assertIsNone(binary_cross_entropy(1.0, 0.0))
        self.assertIsNone(binary_cross_entropy(1.0, 1.0))
        self.assertIsNone(binary_cross_entropy(-0.1, 0.5))
        self.assertIsNone(binary_cross_entropy(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
