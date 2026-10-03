"""Tests for total_variation (Nowozin et al. Table 1)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_total_variation import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    total_variation,
)


class TestTotalVariation(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("total_variation", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(total_variation([0.5, 0.5], [0.5, 0.5]), 0.0)

    def test_basic(self) -> None:
        # |1-0|+|0-1| = 2 → TV = 1
        self.assertAlmostEqual(total_variation([1.0, 0.0], [0.0, 1.0]), 1.0)

    def test_half(self) -> None:
        # |0.5-0.25|+|0.5-0.75| = 0.5 → TV = 0.25
        self.assertAlmostEqual(total_variation([0.5, 0.5], [0.25, 0.75]), 0.25)

    def test_null_guards(self) -> None:
        self.assertIsNone(total_variation(None, [0.5, 0.5]))
        self.assertIsNone(total_variation([0.5], [0.5, 0.5]))
        self.assertIsNone(total_variation([-0.1, 1.1], [0.5, 0.5]))
        self.assertIsNone(total_variation([0.5, float("nan")], [0.5, 0.5]))
        self.assertIsNone(total_variation([], []))


if __name__ == "__main__":
    unittest.main()
