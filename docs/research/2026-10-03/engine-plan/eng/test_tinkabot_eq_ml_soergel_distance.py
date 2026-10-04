"""Tests for soergel_distance."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_soergel_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    soergel_distance,
)


class TestSoergelDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("soergel_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(soergel_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # |1-4|+|2-0| = 5; max(1,4)+max(2,0)=4+2=6 → 5/6
        self.assertAlmostEqual(soergel_distance([1.0, 2.0], [4.0, 0.0]), 5.0 / 6.0)

    def test_1d(self) -> None:
        self.assertAlmostEqual(soergel_distance([1.0], [3.0]), 2.0 / 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(soergel_distance(None, [1.0]))
        self.assertIsNone(soergel_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(soergel_distance([0.0], [0.0]))
        self.assertIsNone(soergel_distance([], []))


if __name__ == "__main__":
    unittest.main()
