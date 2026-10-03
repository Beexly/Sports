"""Kill test for lingxi_eq_cider.

Fails if the uniform average is replaced by a sum, max, or
non-uniform weighting that drops the 1/N factor.
"""
from __future__ import annotations

import unittest

import lingxi_eq_cider as m


class TestCider(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cider",))

    def test_uniform_mean_n4(self) -> None:
        # paper: N=4, w_n=1/N
        scores = (1.0, 0.5, 0.0, 0.5)
        got = m.cider(scores)
        self.assertAlmostEqual(got, 0.5)
        self.assertNotAlmostEqual(got, 2.0)  # not a sum
        self.assertNotAlmostEqual(got, 1.0)  # not max

    def test_single_passthrough(self) -> None:
        self.assertAlmostEqual(m.cider((0.8,)), 0.8)

    def test_all_ones(self) -> None:
        self.assertAlmostEqual(m.cider((1.0, 1.0, 1.0, 1.0)), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.cider(None))
        self.assertIsNone(m.cider(()))
        self.assertIsNone(m.cider((0.5, float("nan"))))
        self.assertIsNone(m.cider((1.5,)))  # out of cosine range


if __name__ == "__main__":
    unittest.main()