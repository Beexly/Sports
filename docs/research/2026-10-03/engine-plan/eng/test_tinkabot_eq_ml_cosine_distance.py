"""Tests for cosine_distance."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_cosine_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    cosine_distance,
)


class TestCosineDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("cosine_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(cosine_distance([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 0.0)

    def test_orthogonal(self) -> None:
        self.assertAlmostEqual(cosine_distance([1.0, 0.0], [0.0, 1.0]), 1.0)

    def test_opposite(self) -> None:
        self.assertAlmostEqual(cosine_distance([1.0, 0.0], [-1.0, 0.0]), 2.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(cosine_distance(None, [1.0]))
        self.assertIsNone(cosine_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(cosine_distance([0.0, 0.0], [1.0, 0.0]))
        self.assertIsNone(cosine_distance([], []))


if __name__ == "__main__":
    unittest.main()
