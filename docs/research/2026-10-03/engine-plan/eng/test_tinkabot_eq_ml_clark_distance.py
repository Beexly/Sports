"""Tests for clark_distance."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_clark_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    clark_distance,
)


class TestClarkDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("clark_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(clark_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # (3/5)^2 + (2/2)^2 = 0.36 + 1 = 1.36 → sqrt
        expected = math.sqrt((3.0 / 5.0) ** 2 + (2.0 / 2.0) ** 2)
        self.assertAlmostEqual(clark_distance([1.0, 2.0], [4.0, 0.0]), expected)

    def test_1d(self) -> None:
        self.assertAlmostEqual(clark_distance([1.0], [3.0]), 0.5)

    def test_null_guards(self) -> None:
        self.assertIsNone(clark_distance(None, [1.0]))
        self.assertIsNone(clark_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(clark_distance([0.0], [0.0]))
        self.assertIsNone(clark_distance([], []))


if __name__ == "__main__":
    unittest.main()
