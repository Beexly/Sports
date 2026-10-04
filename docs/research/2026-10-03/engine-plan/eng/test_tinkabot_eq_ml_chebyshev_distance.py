"""Tests for chebyshev_distance."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_chebyshev_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    chebyshev_distance,
)


class TestChebyshevDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("chebyshev_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(chebyshev_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # |1-4|=3, |2-0|=2, |3-3|=0 → max 3
        self.assertAlmostEqual(chebyshev_distance([1.0, 2.0, 3.0], [4.0, 0.0, 3.0]), 3.0)

    def test_1d(self) -> None:
        self.assertAlmostEqual(chebyshev_distance([-1.0], [2.0]), 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(chebyshev_distance(None, [1.0]))
        self.assertIsNone(chebyshev_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(chebyshev_distance([], []))
        self.assertIsNone(chebyshev_distance([float("nan")], [1.0]))


if __name__ == "__main__":
    unittest.main()
