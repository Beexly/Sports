"""Kill test for lingxi_eq_cutmix_box_width.

Fails if mixup convex combo is returned, if W·(1−λ) without sqrt,
or if W·√λ (inverted) is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_cutmix_box_width as m


class TestCutmixBoxWidth(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cutmix_box_width",))

    def test_printed_eq2(self) -> None:
        # W=100, λ=0.75 → rw = 100 * sqrt(0.25) = 50
        got = m.cutmix_box_width(100.0, 0.75)
        self.assertAlmostEqual(got, 50.0)
        self.assertNotAlmostEqual(got, 100.0 * 0.25)  # not without sqrt
        self.assertNotAlmostEqual(got, 100.0 * math.sqrt(0.75))  # not √λ
        # not mixup-style λW+(1−λ)·0
        self.assertNotAlmostEqual(got, 0.75 * 100.0)

    def test_lambda_one_is_zero(self) -> None:
        self.assertAlmostEqual(m.cutmix_box_width(64.0, 1.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.cutmix_box_width(None, 0.5))
        self.assertIsNone(m.cutmix_box_width(100.0, None))
        self.assertIsNone(m.cutmix_box_width(0.0, 0.5))
        self.assertIsNone(m.cutmix_box_width(-1.0, 0.5))
        self.assertIsNone(m.cutmix_box_width(100.0, -0.1))
        self.assertIsNone(m.cutmix_box_width(100.0, 1.1))
        self.assertIsNone(m.cutmix_box_width(float("nan"), 0.5))


if __name__ == "__main__":
    unittest.main()
