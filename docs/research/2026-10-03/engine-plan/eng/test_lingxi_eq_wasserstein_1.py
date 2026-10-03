"""Kill test for lingxi_eq_wasserstein_1.

Fails if Σ|p−q| (no CDF), if BC Σ√(pq), or if Pearson χ² Σ(q−p)²/p.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_wasserstein_1 as m


class TestWasserstein1(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("wasserstein_1",))

    def test_printed_w1(self) -> None:
        # p=[0.5,0.5], q=[1,0]: F(0) diff |0.5−1|=0.5
        got = m.wasserstein_1([0.5, 0.5], [1.0, 0.0])
        self.assertAlmostEqual(got, 0.5)
        l1 = abs(0.5 - 1.0) + abs(0.5 - 0.0)
        self.assertNotAlmostEqual(got, l1)  # not Σ|p−q|
        bc = math.sqrt(0.5 * 1.0) + math.sqrt(0.5 * 0.0)
        self.assertNotAlmostEqual(got, bc)  # not BC
        chi2 = (1.0 - 0.5) ** 2 / 0.5 + (0.0 - 0.5) ** 2 / 0.5
        self.assertNotAlmostEqual(got, chi2)  # not Pearson χ²

    def test_shift_one(self) -> None:
        self.assertAlmostEqual(m.wasserstein_1([1.0, 0.0], [0.0, 1.0]), 1.0)

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.wasserstein_1([0.2, 0.3, 0.5], [0.2, 0.3, 0.5]), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.wasserstein_1(None, [0.5, 0.5]))
        self.assertIsNone(m.wasserstein_1([1.0], [1.0]))
        self.assertIsNone(m.wasserstein_1([-0.1, 1.1], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()