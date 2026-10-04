"""Kill test for lingxi_eq_ochiai.

Fails if Jaccard h/(a+b−h), if Dice 2h/(a+b), or if cosine.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_ochiai as m


class TestOchiai(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("ochiai",))

    def test_printed(self) -> None:
        # h=2, a=4, b=4 → 2/4 = 0.5; Jaccard=2/(4+4-2)=1/3; Dice=2*2/(4+4)=0.5
        got = m.ochiai(2.0, 4.0, 4.0)
        self.assertAlmostEqual(got, 0.5)
        self.assertNotAlmostEqual(got, 2.0 / (4.0 + 4.0 - 2.0))  # not Jaccard
        # asymmetric: h=3, a=6, b=12 → 3/sqrt(72)=3/(6√2)=1/(2√2)
        got2 = m.ochiai(3.0, 6.0, 12.0)
        self.assertAlmostEqual(got2, 3.0 / math.sqrt(72.0))
        dice = 2.0 * 3.0 / (6.0 + 12.0)
        self.assertNotAlmostEqual(got2, dice)  # not Dice

    def test_perfect(self) -> None:
        self.assertAlmostEqual(m.ochiai(5.0, 5.0, 5.0), 1.0)

    def test_disjoint(self) -> None:
        self.assertAlmostEqual(m.ochiai(0.0, 3.0, 4.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.ochiai(None, 1.0, 1.0))
        self.assertIsNone(m.ochiai(2.0, 1.0, 1.0))  # h > a
        self.assertIsNone(m.ochiai(0.0, 0.0, 1.0))
        self.assertIsNone(m.ochiai(-1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()