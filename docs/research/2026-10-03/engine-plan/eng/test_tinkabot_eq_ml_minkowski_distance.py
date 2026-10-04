"""Tests for minkowski_distance."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_minkowski_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    minkowski_distance,
)


class TestMinkowskiDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("minkowski_distance", COLUMN_BACKED_FUNCS)

    def test_euclidean_default(self) -> None:
        # (3^2+4^2)^0.5 = 5
        self.assertAlmostEqual(minkowski_distance([0.0, 0.0], [3.0, 4.0]), 5.0)

    def test_manhattan_p1(self) -> None:
        self.assertAlmostEqual(minkowski_distance([1.0, 2.0], [4.0, 0.0], 1.0), 5.0)

    def test_identical(self) -> None:
        self.assertAlmostEqual(minkowski_distance([1.0, 2.0], [1.0, 2.0], 3.0), 0.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(minkowski_distance(None, [1.0]))
        self.assertIsNone(minkowski_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(minkowski_distance([1.0], [0.0], 0.5))
        self.assertIsNone(minkowski_distance([], []))


if __name__ == "__main__":
    unittest.main()
