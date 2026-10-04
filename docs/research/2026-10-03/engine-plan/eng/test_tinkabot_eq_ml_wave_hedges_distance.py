"""Tests for wave_hedges_distance."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_wave_hedges_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    wave_hedges_distance,
)


class TestWaveHedgesDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("wave_hedges_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(wave_hedges_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # |1-4|/4 + |2-0|/2 = 3/4 + 1 = 1.75
        self.assertAlmostEqual(wave_hedges_distance([1.0, 2.0], [4.0, 0.0]), 1.75)

    def test_1d(self) -> None:
        self.assertAlmostEqual(wave_hedges_distance([1.0], [3.0]), 2.0 / 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(wave_hedges_distance(None, [1.0]))
        self.assertIsNone(wave_hedges_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(wave_hedges_distance([0.0], [0.0]))
        self.assertIsNone(wave_hedges_distance([], []))


if __name__ == "__main__":
    unittest.main()
