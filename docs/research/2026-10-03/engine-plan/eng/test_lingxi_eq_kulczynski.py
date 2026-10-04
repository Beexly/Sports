"""Kill test for lingxi_eq_kulczynski.

Fails if Jaccard h/(a+b−h), if Ochiai h/√(a·b), or if Dice 2h/(a+b).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_kulczynski as m


class TestKulczynski(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("kulczynski",))

    def test_printed(self) -> None:
        # h=2, a=4, b=4 → ½(0.5+0.5)=0.5; Dice=0.5 too on this point —
        # use asymmetric: h=3, a=6, b=12 → ½(0.5+0.25)=0.375
        got = m.kulczynski(3.0, 6.0, 12.0)
        self.assertAlmostEqual(got, 0.375)
        jaccard = 3.0 / (6.0 + 12.0 - 3.0)
        self.assertNotAlmostEqual(got, jaccard)
        ochiai = 3.0 / math.sqrt(6.0 * 12.0)
        self.assertNotAlmostEqual(got, ochiai)
        dice = 2.0 * 3.0 / (6.0 + 12.0)
        self.assertNotAlmostEqual(got, dice)

    def test_perfect(self) -> None:
        self.assertAlmostEqual(m.kulczynski(5.0, 5.0, 5.0), 1.0)

    def test_disjoint(self) -> None:
        self.assertAlmostEqual(m.kulczynski(0.0, 3.0, 4.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.kulczynski(None, 1.0, 1.0))
        self.assertIsNone(m.kulczynski(2.0, 1.0, 1.0))
        self.assertIsNone(m.kulczynski(0.0, 0.0, 1.0))
        self.assertIsNone(m.kulczynski(-1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()