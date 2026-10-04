"""Kill test for lingxi_eq_angular_distance.

Fails if cosine distance 1−cos, if Chebyshev, or if Hamming.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_angular_distance as m


class TestAngularDistance(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("angular_distance",))

    def test_printed(self) -> None:
        # orthogonal: cos=0 → arccos(0)/π = 0.5; cosine distance = 1
        got = m.angular_distance([1.0, 0.0], [0.0, 1.0])
        self.assertAlmostEqual(got, 0.5)
        self.assertNotAlmostEqual(got, 1.0)  # not cosine distance
        self.assertNotAlmostEqual(got, 1.0)  # not Chebyshev either here

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.angular_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_opposite(self) -> None:
        self.assertAlmostEqual(m.angular_distance([1.0, 0.0], [-1.0, 0.0]), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.angular_distance(None, [1.0]))
        self.assertIsNone(m.angular_distance([], []))
        self.assertIsNone(m.angular_distance([1.0], [1.0, 2.0]))
        self.assertIsNone(m.angular_distance([0.0, 0.0], [1.0, 0.0]))


if __name__ == "__main__":
    unittest.main()