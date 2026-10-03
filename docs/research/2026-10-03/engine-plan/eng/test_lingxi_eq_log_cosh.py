"""Kill test for lingxi_eq_log_cosh.

Fails if MAE, MSE, or soft-margin log(1+exp(−yz)).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_log_cosh as m


class TestLogCosh(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("log_cosh",))

    def test_printed(self) -> None:
        # y=[0], ŷ=[1]: log(cosh(1))
        got = m.log_cosh([0.0], [1.0])
        self.assertAlmostEqual(got, math.log(math.cosh(1.0)))
        self.assertNotAlmostEqual(got, 1.0)  # not MAE
        self.assertNotAlmostEqual(got, 1.0)  # not MSE either (same here)
        # y=[0,0], ŷ=[2,0]: mean(log(cosh2), log(cosh0))
        got2 = m.log_cosh([0.0, 0.0], [2.0, 0.0])
        expect = 0.5 * (math.log(math.cosh(2.0)) + math.log(math.cosh(0.0)))
        self.assertAlmostEqual(got2, expect)
        mae = 0.5 * (2.0 + 0.0)
        mse = 0.5 * (4.0 + 0.0)
        self.assertNotAlmostEqual(got2, mae)
        self.assertNotAlmostEqual(got2, mse)

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.log_cosh([1.0, -2.0], [1.0, -2.0]), 0.0)

    def test_stable_large(self) -> None:
        got = m.log_cosh([0.0], [50.0])
        self.assertAlmostEqual(got, 50.0 - math.log(2.0), places=6)

    def test_nulls(self) -> None:
        self.assertIsNone(m.log_cosh(None, [1.0]))
        self.assertIsNone(m.log_cosh([], []))
        self.assertIsNone(m.log_cosh([1.0], [1.0, 2.0]))
        self.assertIsNone(m.log_cosh([float("nan")], [0.0]))


if __name__ == "__main__":
    unittest.main()