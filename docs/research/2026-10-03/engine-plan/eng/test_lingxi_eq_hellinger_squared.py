"""Kill test for lingxi_eq_hellinger_squared.

Fails if Σ(√p−√q)² without 1/2, if 1−Σ√(pq) is swapped for non-unit
masses incorrectly vs stated form, or if KL-style Σ p log(p/q) is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_hellinger_squared as m


class TestHellingerSquared(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("hellinger_squared",))

    def test_printed_h2(self) -> None:
        p = [0.5, 0.5]
        q = [1.0, 0.0]
        # (1/2)[(√0.5−1)² + (√0.5−0)²]
        expected = 0.5 * (
            (math.sqrt(0.5) - 1.0) ** 2 + (math.sqrt(0.5) - 0.0) ** 2
        )
        got = m.hellinger_squared(p, q)
        self.assertAlmostEqual(got, expected)
        without_half = (math.sqrt(0.5) - 1.0) ** 2 + (math.sqrt(0.5) - 0.0) ** 2
        self.assertNotAlmostEqual(got, without_half)  # not missing 1/2
        # not KL
        kl = 0.5 * math.log(0.5 / 1.0) + 0.5 * math.log(0.5 / 1e-12)
        self.assertNotAlmostEqual(got, kl)

    def test_identical_zero(self) -> None:
        self.assertAlmostEqual(m.hellinger_squared([0.25, 0.75], [0.25, 0.75]), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.hellinger_squared(None, [0.5, 0.5]))
        self.assertIsNone(m.hellinger_squared([0.5], [0.5, 0.5]))
        self.assertIsNone(m.hellinger_squared([-0.1, 1.1], [0.5, 0.5]))
        self.assertIsNone(m.hellinger_squared([0.5, float("nan")], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()