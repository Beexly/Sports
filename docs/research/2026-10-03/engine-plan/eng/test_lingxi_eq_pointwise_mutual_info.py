"""Kill test for lingxi_eq_pointwise_mutual_info.

Fails if log2 of the ratio is replaced by ln, by the product
without the joint, or by P(x)P(y)/P(x,y).
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_pointwise_mutual_info as m


class TestPointwiseMutualInfo(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("pointwise_mutual_info",)
        )

    def test_printed_log2_ratio(self) -> None:
        # P(x,y)=0.1, P(x)=0.2, P(y)=0.5 -> log2(0.1/0.1)=0
        got = m.pointwise_mutual_info(0.1, 0.2, 0.5)
        self.assertAlmostEqual(got, 0.0)
        got2 = m.pointwise_mutual_info(0.2, 0.4, 0.25)
        self.assertAlmostEqual(got2, math.log2(0.2 / (0.4 * 0.25)))
        self.assertNotAlmostEqual(got2, math.log(0.2 / (0.4 * 0.25)))
        self.assertNotAlmostEqual(got2, 0.4 * 0.25)
        self.assertNotAlmostEqual(got2, math.log2((0.4 * 0.25) / 0.2))

    def test_independence_zero(self) -> None:
        self.assertAlmostEqual(
            m.pointwise_mutual_info(0.06, 0.3, 0.2), 0.0
        )

    def test_positive_association(self) -> None:
        got = m.pointwise_mutual_info(0.2, 0.4, 0.4)
        self.assertGreater(got, 0.0)
        self.assertAlmostEqual(got, math.log2(0.2 / 0.16))

    def test_nulls(self) -> None:
        self.assertIsNone(m.pointwise_mutual_info(None, 0.2, 0.2))
        self.assertIsNone(m.pointwise_mutual_info(0.1, None, 0.2))
        self.assertIsNone(m.pointwise_mutual_info(0.1, 0.2, None))
        self.assertIsNone(m.pointwise_mutual_info(0.0, 0.2, 0.2))
        self.assertIsNone(m.pointwise_mutual_info(0.3, 0.2, 0.2))  # j>px
        self.assertIsNone(m.pointwise_mutual_info(0.1, 1.1, 0.2))
        self.assertIsNone(m.pointwise_mutual_info(0.1, 0.2, float("nan")))


if __name__ == "__main__":
    unittest.main()
