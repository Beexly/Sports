"""Kill test for lingxi_eq_h_threshold.

Fails if the absolute value is dropped, the second term is omitted, or
log is taken base 10.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_h_threshold as m


class TestHThreshold(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("h_threshold",))

    def test_unit_log_includes_second_term(self) -> None:
        # |log(e^{-1})| = 1, alpha = 1/2 -> 1 * (1 + 1) = 2, not 1 and not -2.
        got = m.h_threshold(math.exp(-1.0), 0.5)
        self.assertEqual(got, 2.0)
        self.assertNotEqual(got, 1.0)
        self.assertNotEqual(got, -2.0)

    def test_not_log10(self) -> None:
        # |log(e^{-4})| = 4, 4 * (1 + 4^{-1/2}) = 6.
        got = m.h_threshold(math.exp(-4.0), 0.5)
        self.assertAlmostEqual(got, 6.0, places=12)
        magnitude10 = abs(math.log10(math.exp(-4.0)))
        self.assertNotAlmostEqual(got, magnitude10 * (1.0 + magnitude10 ** (-0.5)), places=6)

    def test_nulls(self) -> None:
        self.assertIsNone(m.h_threshold(None, 0.5))
        self.assertIsNone(m.h_threshold(0.5, None))
        self.assertIsNone(m.h_threshold(0.0, 0.5))
        self.assertIsNone(m.h_threshold(-1.0, 0.5))
        self.assertIsNone(m.h_threshold(1.0, 0.5))
        self.assertIsNone(m.h_threshold(0.5, 0.0))
        self.assertIsNone(m.h_threshold(0.5, 1.0))
        self.assertIsNone(m.h_threshold(float("nan"), 0.5))


if __name__ == "__main__":
    unittest.main()