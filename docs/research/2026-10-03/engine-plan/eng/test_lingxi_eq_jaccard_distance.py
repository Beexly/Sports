"""Kill test for lingxi_eq_jaccard_distance.

Fails if Jaccard index h/(a+b−h), if Ochiai h/√(a·b), or if Dice 2h/(a+b).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_jaccard_distance as m


class TestJaccardDistance(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("jaccard_distance",))

    def test_printed(self) -> None:
        # h=2, a=4, b=4 → J=2/6=1/3; d=1−1/3=2/3
        got = m.jaccard_distance(2.0, 4.0, 4.0)
        self.assertAlmostEqual(got, 2.0 / 3.0)
        j_index = 2.0 / (4.0 + 4.0 - 2.0)
        self.assertNotAlmostEqual(got, j_index)  # not Jaccard index
        ochiai = 2.0 / math.sqrt(4.0 * 4.0)
        self.assertNotAlmostEqual(got, ochiai)  # not Ochiai
        dice = 2.0 * 2.0 / (4.0 + 4.0)
        self.assertNotAlmostEqual(got, dice)  # not Dice

    def test_identical(self) -> None:
        self.assertAlmostEqual(m.jaccard_distance(5.0, 5.0, 5.0), 0.0)

    def test_disjoint(self) -> None:
        self.assertAlmostEqual(m.jaccard_distance(0.0, 3.0, 4.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.jaccard_distance(None, 1.0, 1.0))
        self.assertIsNone(m.jaccard_distance(2.0, 1.0, 1.0))  # h > a
        self.assertIsNone(m.jaccard_distance(0.0, 0.0, 0.0))
        self.assertIsNone(m.jaccard_distance(-1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()