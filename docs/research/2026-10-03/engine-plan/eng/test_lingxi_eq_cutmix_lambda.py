"""Kill test for lingxi_eq_cutmix_lambda.

Fails if (rw rh)/(W H) is returned without 1−, if r_w=W√(1−λ) shape
is returned, or if mixup convex combo is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_cutmix_lambda as m


class TestCutmixLambda(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cutmix_lambda",))

    def test_printed_area_identity(self) -> None:
        # rw=50, rh=50, W=100, H=100 → ratio=0.25 → λ=0.75
        got = m.cutmix_lambda(50.0, 50.0, 100.0, 100.0)
        self.assertAlmostEqual(got, 0.75)
        self.assertNotAlmostEqual(got, 0.25)  # not bare area ratio
        # not box-width formula W√(1−λ) evaluated at λ=0.75 → 50
        self.assertNotAlmostEqual(got, 100.0 * math.sqrt(0.25))
        # not mixup 0.5*a+0.5*b style on these args
        self.assertNotAlmostEqual(got, 0.5 * 50.0 + 0.5 * 100.0)

    def test_full_image_crop_is_zero(self) -> None:
        self.assertAlmostEqual(m.cutmix_lambda(64.0, 64.0, 64.0, 64.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.cutmix_lambda(None, 50.0, 100.0, 100.0))
        self.assertIsNone(m.cutmix_lambda(50.0, 50.0, 0.0, 100.0))
        self.assertIsNone(m.cutmix_lambda(150.0, 50.0, 100.0, 100.0))
        self.assertIsNone(m.cutmix_lambda(-1.0, 50.0, 100.0, 100.0))
        self.assertIsNone(m.cutmix_lambda(float("nan"), 50.0, 100.0, 100.0))


if __name__ == "__main__":
    unittest.main()
