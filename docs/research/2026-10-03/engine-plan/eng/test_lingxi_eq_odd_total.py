"""Kill test for lingxi_eq_odd_total.

Fails if cosh is swapped for sinh (the Even row), the exp factor is
dropped, or the next-goal share is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_odd_total as m


class TestOddTotal(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("odd_total_value",))

    def test_zero_exposure_is_cosh_not_sinh(self) -> None:
        # mu = 0: exp(0)*cosh(0) = 1. The Even row is exp(0)*sinh(0) = 0.
        got = m.odd_total_value(1.0, 1.0, 0.0)
        self.assertEqual(got, 1.0)
        self.assertNotEqual(got, 0.0)

    def test_printed_cosh_not_sinh_or_bare(self) -> None:
        # (lambda_1 + lambda_2) * tau = ln 2.
        tau = math.log(2.0) / 2.0
        got = m.odd_total_value(1.0, 1.0, tau)
        mu = math.log(2.0)
        self.assertAlmostEqual(got, math.exp(-mu) * math.cosh(mu), places=12)
        self.assertAlmostEqual(got, 0.625, places=12)
        self.assertNotAlmostEqual(got, math.exp(-mu) * math.sinh(mu), places=6)
        self.assertNotAlmostEqual(got, math.cosh(mu), places=6)
        self.assertNotAlmostEqual(got, 0.5 * (1.0 - math.exp(-mu)), places=6)

    def test_nulls(self) -> None:
        self.assertIsNone(m.odd_total_value(None, 1.0, 1.0))
        self.assertIsNone(m.odd_total_value(1.0, None, 1.0))
        self.assertIsNone(m.odd_total_value(1.0, 1.0, None))
        self.assertIsNone(m.odd_total_value(-1.0, 1.0, 1.0))
        self.assertIsNone(m.odd_total_value(1.0, -1.0, 1.0))
        self.assertIsNone(m.odd_total_value(1.0, 1.0, -0.1))
        self.assertIsNone(m.odd_total_value(float("nan"), 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()