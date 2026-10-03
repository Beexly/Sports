"""Kill test for lingxi_eq_aldous_volatility.

Fails if pi is dropped inside sin, the division by pi is dropped, or sin is
replaced by cos.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_aldous_volatility as m


class TestAldousVolatility(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("aldous_volatility",))

    def test_half_is_one_over_pi(self) -> None:
        got = m.aldous_volatility(0.5)
        self.assertAlmostEqual(got, 1.0 / math.pi, places=12)
        self.assertNotAlmostEqual(got, 1.0, places=6)
        self.assertNotAlmostEqual(got, math.sin(0.5) / math.pi, places=6)
        self.assertNotAlmostEqual(got, math.cos(math.pi * 0.5) / math.pi, places=6)

    def test_endpoints_are_zero(self) -> None:
        self.assertEqual(m.aldous_volatility(0.0), 0.0)
        self.assertAlmostEqual(m.aldous_volatility(1.0), 0.0, places=12)

    def test_not_linear_belief_volatility(self) -> None:
        # sigma_I(0.5) = 0.25, which is not sin(pi/2)/pi.
        got = m.aldous_volatility(0.5)
        self.assertNotAlmostEqual(got, 0.25, places=6)

    def test_nulls(self) -> None:
        self.assertIsNone(m.aldous_volatility(None))
        self.assertIsNone(m.aldous_volatility(float("nan")))
        self.assertIsNone(m.aldous_volatility(float("inf")))


if __name__ == "__main__":
    unittest.main()