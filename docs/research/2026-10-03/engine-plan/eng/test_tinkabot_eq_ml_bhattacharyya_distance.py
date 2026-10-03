"""Tests for bhattacharyya_distance (Bhattacharyya 1943)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_bhattacharyya_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    bhattacharyya_distance,
)


class TestBhattacharyyaDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("bhattacharyya_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        # BC=1 for identical unit masses → D_B=0
        self.assertAlmostEqual(bhattacharyya_distance([0.5, 0.5], [0.5, 0.5]), 0.0, places=12)

    def test_basic(self) -> None:
        # p=[1,0] q=[0,1] → BC=0 → null (no support overlap)
        self.assertIsNone(bhattacharyya_distance([1.0, 0.0], [0.0, 1.0]))

    def test_known(self) -> None:
        # p=q=[1] → 0; p=[0.9,0.1] q=[0.1,0.9]
        bc = math.sqrt(0.9 * 0.1) + math.sqrt(0.1 * 0.9)
        expected = -math.log(bc)
        self.assertAlmostEqual(
            bhattacharyya_distance([0.9, 0.1], [0.1, 0.9]), expected, places=10
        )

    def test_null_guards(self) -> None:
        self.assertIsNone(bhattacharyya_distance(None, [0.5, 0.5]))
        self.assertIsNone(bhattacharyya_distance([0.5], [0.5, 0.5]))
        self.assertIsNone(bhattacharyya_distance([-0.1, 1.1], [0.5, 0.5]))
        self.assertIsNone(bhattacharyya_distance([], []))


if __name__ == "__main__":
    unittest.main()
