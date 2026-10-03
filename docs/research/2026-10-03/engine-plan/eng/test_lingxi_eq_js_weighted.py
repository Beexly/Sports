"""Kill test for lingxi_eq_js_weighted.

Fails if weights are ignored (equal-weight log 2), natural log is
replaced by log2, or a one-hot weight fails to return 0.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_js_weighted as m


def _binary_entropy(pi: float) -> float:
    if pi == 0.0 or pi == 1.0:
        return 0.0
    return -(pi * math.log(pi) + (1.0 - pi) * math.log(1.0 - pi))


class TestWeightedJS(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("js_pi", "js_pi_n"))

    def test_quarter_weight_is_not_equal_weight(self) -> None:
        p1 = [1.0, 0.0]
        p2 = [0.0, 1.0]
        got = m.js_pi(p1, p2, 0.25, 0.75)
        self.assertAlmostEqual(got, _binary_entropy(0.25), places=12)
        self.assertNotAlmostEqual(got, math.log(2.0), places=6)
        self.assertNotAlmostEqual(got, 1.0, places=6)

    def test_one_hot_weight_is_zero(self) -> None:
        got = m.js_pi([1.0, 0.0], [0.0, 1.0], 1.0, 0.0)
        self.assertEqual(got, 0.0)
        self.assertNotAlmostEqual(got, math.log(2.0), places=6)

    def test_nary_keeps_entropy_weight(self) -> None:
        # Mixture is uniform, H(c)=log 2, weight 1/3, so JS = (2/3) log 2.
        dists = ([1.0, 0.0], [0.0, 1.0], [0.5, 0.5])
        got = m.js_pi_n(dists, (1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0))
        self.assertAlmostEqual(got, (2.0 / 3.0) * math.log(2.0), places=12)
        self.assertNotAlmostEqual(got, 0.0, places=6)

    def test_nulls(self) -> None:
        p1 = [1.0, 0.0]
        p2 = [0.0, 1.0]
        self.assertIsNone(m.js_pi(None, p2, 0.5, 0.5))
        self.assertIsNone(m.js_pi(p1, None, 0.5, 0.5))
        self.assertIsNone(m.js_pi(p1, p2, None, 0.5))
        self.assertIsNone(m.js_pi(p1, p2, 0.5, None))
        self.assertIsNone(m.js_pi(p1, p2, 0.2, 0.2))
        self.assertIsNone(m.js_pi(p1, p2, -0.1, 1.1))
        self.assertIsNone(m.js_pi(p1, [0.0, 1.0, 0.0], 0.5, 0.5))
        self.assertIsNone(m.js_pi_n(None, (0.5, 0.5)))
        self.assertIsNone(m.js_pi_n((p1, p2), (0.2, 0.2)))
        self.assertIsNone(m.js_pi_n((p1,), (1.0,)))


if __name__ == "__main__":
    unittest.main()