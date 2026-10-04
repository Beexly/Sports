"""Kill test for lingxi_eq_poisson_nll.

Fails if MSE, if MAE, or if full Poisson with +log(y!).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_poisson_nll as m


class TestPoissonNll(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("poisson_nll",))

    def test_printed(self) -> None:
        # y=3, λ=2: 2 - 3 log2
        got = m.poisson_nll([3.0], [2.0])
        expect = 2.0 - 3.0 * math.log(2.0)
        self.assertAlmostEqual(got, expect)
        self.assertNotAlmostEqual(got, (3.0 - 2.0) ** 2)  # not MSE
        self.assertNotAlmostEqual(got, abs(3.0 - 2.0))  # not MAE
        # not full NLL with Stirling log(3!)=log(6)
        self.assertNotAlmostEqual(got, expect + math.log(6.0))

    def test_matched_rate(self) -> None:
        self.assertAlmostEqual(m.poisson_nll([1.0], [1.0]), 1.0)

    def test_mean_two(self) -> None:
        got = m.poisson_nll([0.0, 1.0], [1.0, 1.0])
        expect = 0.5 * ((1.0 - 0.0) + (1.0 - 0.0))
        self.assertAlmostEqual(got, expect)

    def test_nulls(self) -> None:
        self.assertIsNone(m.poisson_nll(None, [1.0]))
        self.assertIsNone(m.poisson_nll([], []))
        self.assertIsNone(m.poisson_nll([1.0], [1.0, 2.0]))
        self.assertIsNone(m.poisson_nll([-1.0], [1.0]))
        self.assertIsNone(m.poisson_nll([1.0], [0.0]))


if __name__ == "__main__":
    unittest.main()