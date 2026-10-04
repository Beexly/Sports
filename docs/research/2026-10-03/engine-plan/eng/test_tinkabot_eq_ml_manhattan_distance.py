"""Tests for manhattan_distance."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_manhattan_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    manhattan_distance,
)


class TestManhattanDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("manhattan_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(manhattan_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        self.assertAlmostEqual(manhattan_distance([1.0, 2.0, 3.0], [4.0, 0.0, 3.0]), 5.0)

    def test_1d(self) -> None:
        self.assertAlmostEqual(manhattan_distance([-1.0], [2.0]), 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(manhattan_distance(None, [1.0]))
        self.assertIsNone(manhattan_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(manhattan_distance([], []))
        self.assertIsNone(manhattan_distance([float("nan")], [1.0]))


if __name__ == "__main__":
    unittest.main()
