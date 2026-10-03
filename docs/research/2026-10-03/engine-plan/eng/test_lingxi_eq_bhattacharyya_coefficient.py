"""Kill test for lingxi_eq_bhattacharyya_coefficient.

Fails if Hellinger (1/2)Σ(√p−√q)², if 1−BC, or if Σ p q is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_bhattacharyya_coefficient as m


class TestBhattacharyyaCoefficient(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bhattacharyya_coefficient",))

    def test_printed_bc(self) -> None:
        p = [0.5, 0.5]
        q = [1.0, 0.0]
        # √(0.5·1)+√(0.5·0)=√0.5
        got = m.bhattacharyya_coefficient(p, q)
        self.assertAlmostEqual(got, math.sqrt(0.5))
        h2 = 0.5 * (
            (math.sqrt(0.5) - 1.0) ** 2 + (math.sqrt(0.5) - 0.0) ** 2
        )
        self.assertNotAlmostEqual(got, h2)  # not Hellinger
        self.assertNotAlmostEqual(got, 1.0 - math.sqrt(0.5))  # not 1−BC
        self.assertNotAlmostEqual(got, 0.5 * 1.0 + 0.5 * 0.0)  # not Σpq

    def test_identical(self) -> None:
        self.assertAlmostEqual(m.bhattacharyya_coefficient([0.25, 0.75], [0.25, 0.75]), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bhattacharyya_coefficient(None, [0.5, 0.5]))
        self.assertIsNone(m.bhattacharyya_coefficient([0.5], [0.5, 0.5]))
        self.assertIsNone(m.bhattacharyya_coefficient([-0.1, 1.1], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()