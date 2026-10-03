"""Kill test for lingxi_eq_spearman_rho.

Fails if Pearson-style Σ z_x z_y /(n−1), if 1−Σd²/(n(n²−1))
(missing the 6), or if Σd² alone is returned.
"""
from __future__ import annotations

import unittest

import lingxi_eq_spearman_rho as m


class TestSpearmanRho(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("spearman_rho",))

    def test_printed_rho(self) -> None:
        # n=3, d=(0,1,-1): Σd²=0+1+1=2
        # ρ = 1 − 6*2/(3*(9−1)) = 1 − 12/24 = 0.5
        got = m.spearman_rho([0.0, 1.0, -1.0])
        self.assertAlmostEqual(got, 0.5)
        self.assertNotAlmostEqual(got, 1.0 - 2.0 / 24.0)  # missing factor 6
        self.assertNotAlmostEqual(got, 2.0)  # not Σd²

    def test_perfect(self) -> None:
        self.assertAlmostEqual(m.spearman_rho([0.0, 0.0, 0.0, 0.0]), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.spearman_rho(None))
        self.assertIsNone(m.spearman_rho([1.0]))
        self.assertIsNone(m.spearman_rho([0.0, float("nan")]))


if __name__ == "__main__":
    unittest.main()