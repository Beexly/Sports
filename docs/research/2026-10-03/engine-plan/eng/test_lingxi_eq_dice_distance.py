"""Kill test for lingxi_eq_dice_distance.

Fails if Dice coefficient 2h/(a+b), Jaccard distance, or Kulczyński.
"""
from __future__ import annotations

import unittest

import lingxi_eq_dice_distance as m


class TestDiceDistance(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("dice_distance",))

    def test_printed(self) -> None:
        # asymmetric: h=3, a=6, b=12 → (18−6)/18 = 2/3
        got = m.dice_distance(3.0, 6.0, 12.0)
        self.assertAlmostEqual(got, 2.0 / 3.0)
        self.assertNotAlmostEqual(got, 2.0 * 3.0 / (6.0 + 12.0))  # Dice coeff = 1/3
        self.assertNotAlmostEqual(got, (6.0 + 12.0 - 6.0) / (6.0 + 12.0 - 3.0))  # Jaccard d = 12/15
        self.assertNotAlmostEqual(got, 0.5 * (3.0 / 6.0 + 3.0 / 12.0))  # Kulczyński = 0.375
        # symmetric sanity: h=2,a=4,b=4 → 0.5
        self.assertAlmostEqual(m.dice_distance(2.0, 4.0, 4.0), 0.5)

    def test_identical(self) -> None:
        self.assertAlmostEqual(m.dice_distance(5.0, 5.0, 5.0), 0.0)

    def test_disjoint(self) -> None:
        self.assertAlmostEqual(m.dice_distance(0.0, 3.0, 4.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.dice_distance(None, 1.0, 1.0))
        self.assertIsNone(m.dice_distance(2.0, 1.0, 1.0))
        self.assertIsNone(m.dice_distance(0.0, 0.0, 0.0))
        self.assertIsNone(m.dice_distance(-1.0, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()