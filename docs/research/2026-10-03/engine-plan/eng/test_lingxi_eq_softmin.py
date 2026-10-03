"""Kill test for lingxi_eq_softmin.

Fails if softmax (not negated) probabilities are returned, or if
arg-min one-hot is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_softmin as m


class TestSoftmin(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("softmin",))

    def test_printed_softmin(self) -> None:
        # z=(0,1): softmin ∝ (e^0, e^{-1}) = (1, 1/e) → normalize
        got = m.softmin([0.0, 1.0])
        assert got is not None
        e = math.exp(1.0)
        expected = (e / (e + 1.0), 1.0 / (e + 1.0))
        self.assertAlmostEqual(got[0], expected[0])
        self.assertAlmostEqual(got[1], expected[1])
        # softmax(0,1) would put more mass on index 1
        softmax1 = math.exp(1.0) / (1.0 + math.exp(1.0))
        self.assertNotAlmostEqual(got[1], softmax1)

    def test_sums_to_one(self) -> None:
        got = m.softmin([2.0, -1.0, 0.5])
        assert got is not None
        self.assertAlmostEqual(sum(got), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.softmin(None))
        self.assertIsNone(m.softmin([]))
        self.assertIsNone(m.softmin([1.0, float("nan")]))


if __name__ == "__main__":
    unittest.main()