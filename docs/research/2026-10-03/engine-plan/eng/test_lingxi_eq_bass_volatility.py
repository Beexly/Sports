"""Kill test for lingxi_eq_bass_volatility.

Fails if Phi^{-1} is skipped, or if the Aldous sinc or the linear
sigma_I(x)=x(1-x) is returned instead.
"""
from __future__ import annotations

import math
import statistics
import unittest

import lingxi_eq_bass_volatility as m


class TestBassVolatility(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bass_volatility",))

    def test_median_is_standard_normal_peak(self) -> None:
        got = m.bass_volatility(0.5)
        peak = 1.0 / math.sqrt(2.0 * math.pi)
        self.assertAlmostEqual(got, peak, places=12)
        self.assertNotAlmostEqual(got, 1.0 / math.pi, places=6)
        self.assertNotAlmostEqual(got, 0.5 * 0.5, places=6)
        self.assertNotAlmostEqual(got, statistics.NormalDist().pdf(0.5), places=6)

    def test_quantile_not_raw_density(self) -> None:
        normal = statistics.NormalDist()
        got = m.bass_volatility(0.25)
        self.assertAlmostEqual(got, normal.pdf(normal.inv_cdf(0.25)), places=12)
        self.assertNotAlmostEqual(got, normal.pdf(0.25), places=6)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bass_volatility(None))
        self.assertIsNone(m.bass_volatility(0.0))
        self.assertIsNone(m.bass_volatility(1.0))
        self.assertIsNone(m.bass_volatility(-0.1))
        self.assertIsNone(m.bass_volatility(1.1))
        self.assertIsNone(m.bass_volatility(float("nan")))


if __name__ == "__main__":
    unittest.main()