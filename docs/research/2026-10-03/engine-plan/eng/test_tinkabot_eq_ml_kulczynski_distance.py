"""Tests for kulczynski_distance."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_kulczynski_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    kulczynski_distance,
)


class TestKulczynskiDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("kulczynski_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(kulczynski_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # |1-4|+|2-0|=5; min(1,4)+min(2,0)=1+0=1 → 5
        self.assertAlmostEqual(kulczynski_distance([1.0, 2.0], [4.0, 0.0]), 5.0)

    def test_1d(self) -> None:
        self.assertAlmostEqual(kulczynski_distance([1.0], [3.0]), 2.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(kulczynski_distance(None, [1.0]))
        self.assertIsNone(kulczynski_distance([1.0], [1.0, 0.0]))
        # all pairwise mins zero → den=0
        self.assertIsNone(kulczynski_distance([0.0, 1.0], [1.0, 0.0]))
        self.assertIsNone(kulczynski_distance([], []))


if __name__ == "__main__":
    unittest.main()
