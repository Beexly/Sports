"""Kill test for lingxi_eq_bray_curtis.

Fails if Canberra Σ|x−y|/(|x|+|y|), if Manhattan Σ|x−y|, or if Huber.
"""
from __future__ import annotations

import unittest

import lingxi_eq_bray_curtis as m


class TestBrayCurtis(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bray_curtis",))

    def test_printed(self) -> None:
        # x=[3,0], y=[0,1]: num=|3|+|1|=4; den=3+0+0+1=4 → 1
        # Canberra on same = 2; Manhattan = 4
        got = m.bray_curtis([3.0, 0.0], [0.0, 1.0])
        self.assertAlmostEqual(got, 1.0)
        self.assertNotAlmostEqual(got, 2.0)  # not Canberra
        self.assertNotAlmostEqual(got, 4.0)  # not Manhattan

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.bray_curtis([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]), 0.0)

    def test_half(self) -> None:
        # x=[1,0], y=[0,1]: num=2; den=2 → 1
        self.assertAlmostEqual(m.bray_curtis([1.0, 0.0], [0.0, 1.0]), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bray_curtis(None, [1.0]))
        self.assertIsNone(m.bray_curtis([], []))
        self.assertIsNone(m.bray_curtis([1.0], [1.0, 2.0]))
        self.assertIsNone(m.bray_curtis([-1.0, 1.0], [0.0, 1.0]))
        self.assertIsNone(m.bray_curtis([0.0, 0.0], [0.0, 0.0]))


if __name__ == "__main__":
    unittest.main()