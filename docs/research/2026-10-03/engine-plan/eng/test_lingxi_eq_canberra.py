"""Kill test for lingxi_eq_canberra.

Fails if Σ|x−y| (Manhattan), if Pearson r, or if Bray–Curtis on same inputs.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_canberra as m


class TestCanberra(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("canberra",))

    def test_printed_two_d(self) -> None:
        # x=[1,0], y=[0,1]: |1−0|/1 + |0−1|/1 = 2
        got = m.canberra([1.0, 0.0], [0.0, 1.0])
        self.assertAlmostEqual(got, 2.0)
        # magnitudes: x=[3,0], y=[0,1] → |3|/3 + |−1|/1 = 1+1 = 2
        # Manhattan = 4; Bray–Curtis (nonneg form) = 4/(3+1)=1
        got2 = m.canberra([3.0, 0.0], [0.0, 1.0])
        self.assertAlmostEqual(got2, 2.0)
        self.assertNotAlmostEqual(got2, 4.0)  # not Manhattan
        self.assertNotAlmostEqual(got2, 1.0)  # not Bray–Curtis

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.canberra([1.5, -2.0, 0.0], [1.5, -2.0, 0.0]), 0.0)

    def test_zero_zero_term(self) -> None:
        # (0,0) term skipped; only |2−0|/(|2|+|0|) = 1
        self.assertAlmostEqual(m.canberra([0.0, 2.0], [0.0, 0.0]), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.canberra(None, [1.0]))
        self.assertIsNone(m.canberra([], []))
        self.assertIsNone(m.canberra([1.0], [1.0, 2.0]))
        self.assertIsNone(m.canberra([float("nan")], [1.0]))


if __name__ == "__main__":
    unittest.main()