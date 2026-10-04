"""Kill test for lingxi_eq_cosine_distance.

Fails if cosine similarity, if Hamming, or if Euclidean.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_cosine_distance as m


class TestCosineDistance(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cosine_distance",))

    def test_printed(self) -> None:
        # x=[1,0], y=[0,1]: cos=0 → d=1
        got = m.cosine_distance([1.0, 0.0], [0.0, 1.0])
        self.assertAlmostEqual(got, 1.0)
        self.assertNotAlmostEqual(got, 0.0)  # not cosine similarity
        self.assertNotAlmostEqual(got, math.sqrt(2.0))  # not Euclidean

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.cosine_distance([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 0.0)

    def test_scaled_same(self) -> None:
        # parallel → distance 0
        self.assertAlmostEqual(m.cosine_distance([1.0, 2.0], [2.0, 4.0]), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.cosine_distance(None, [1.0]))
        self.assertIsNone(m.cosine_distance([], []))
        self.assertIsNone(m.cosine_distance([1.0], [1.0, 2.0]))
        self.assertIsNone(m.cosine_distance([0.0, 0.0], [1.0, 0.0]))
        self.assertIsNone(m.cosine_distance([float("nan")], [1.0]))


if __name__ == "__main__":
    unittest.main()