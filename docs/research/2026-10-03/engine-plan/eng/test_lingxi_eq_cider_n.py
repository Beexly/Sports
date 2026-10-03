"""Kill test for lingxi_eq_cider_n.

Fails if the average is replaced by a sum, the cosine is inverted
(denom in numerator), or a single identical pair is not 1.0.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_cider_n as m


class TestCiderN(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cider_n",))

    def test_identical_vectors_unit(self) -> None:
        g = (1.0, 0.0, 2.0)
        got = m.cider_n(g, [g, g])
        self.assertAlmostEqual(got, 1.0)
        self.assertNotAlmostEqual(got, 2.0)  # not a sum

    def test_orthogonal_zero(self) -> None:
        got = m.cider_n((1.0, 0.0), [(0.0, 1.0)])
        self.assertAlmostEqual(got, 0.0)

    def test_average_of_two(self) -> None:
        # cos((1,0),(1,0))=1, cos((1,0),(0,1))=0 → mean 0.5
        got = m.cider_n((1.0, 0.0), [(1.0, 0.0), (0.0, 1.0)])
        self.assertAlmostEqual(got, 0.5)
        self.assertNotAlmostEqual(got, 1.0)
        self.assertNotAlmostEqual(got, 0.0)

    def test_known_cosine(self) -> None:
        # a=(3,4), b=(4,3): dot=24, |a|=5, |b|=5 → 24/25
        got = m.cider_n((3.0, 4.0), [(4.0, 3.0)])
        self.assertAlmostEqual(got, 24.0 / 25.0)
        self.assertNotAlmostEqual(got, 25.0 / 24.0)  # not inverted

    def test_nulls(self) -> None:
        self.assertIsNone(m.cider_n(None, [(1.0,)]))
        self.assertIsNone(m.cider_n((1.0,), None))
        self.assertIsNone(m.cider_n((1.0,), []))
        self.assertIsNone(m.cider_n((1.0, 0.0), [(1.0,)]))  # length mismatch
        self.assertIsNone(m.cider_n((0.0, 0.0), [(1.0, 0.0)]))  # zero mag
        self.assertIsNone(m.cider_n((1.0,), [(float("nan"),)]))


if __name__ == "__main__":
    unittest.main()