"""Kill test for lingxi_eq_pearson_chi_squared.

Fails if Hellinger (1/2)Σ(√p−√q)², KL Σ p log(p/q), or
Σ (p−q)²/q (roles swapped) is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_pearson_chi_squared as m


class TestPearsonChiSquared(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("pearson_chi_squared",))

    def test_printed_chi2(self) -> None:
        p = [0.5, 0.5]
        q = [1.0, 0.0]
        # (1−0.5)²/0.5 + (0−0.5)²/0.5 = 0.5 + 0.5 = 1.0
        got = m.pearson_chi_squared(p, q)
        self.assertAlmostEqual(got, 1.0)
        h2 = 0.5 * (
            (math.sqrt(0.5) - 1.0) ** 2 + (math.sqrt(0.5) - 0.0) ** 2
        )
        self.assertNotAlmostEqual(got, h2)  # not Hellinger
        swapped = (0.5 - 1.0) ** 2 / 1.0 + (0.5 - 0.0) ** 2 / 1e-12
        self.assertNotAlmostEqual(got, swapped)  # not Σ(p−q)²/q

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.pearson_chi_squared([0.2, 0.8], [0.2, 0.8]), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.pearson_chi_squared(None, [0.5, 0.5]))
        self.assertIsNone(m.pearson_chi_squared([0.0, 1.0], [0.5, 0.5]))
        self.assertIsNone(m.pearson_chi_squared([0.5], [0.5, 0.5]))
        self.assertIsNone(m.pearson_chi_squared([0.5, float("nan")], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()