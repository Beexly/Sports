"""Tests for cutmix_box_height (Yun et al. ICCV 2019 Eq. 2)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_cutmix_box_height import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    cutmix_box_height,
)


class TestCutmixBoxHeight(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("cutmix_box_height", COLUMN_BACKED_FUNCS)

    def test_half_lambda(self) -> None:
        # H=100, λ=0.75 → r_h = 100 * √0.25 = 50
        self.assertAlmostEqual(cutmix_box_height(100.0, 0.75), 50.0)

    def test_endpoints(self) -> None:
        self.assertAlmostEqual(cutmix_box_height(64.0, 0.0), 64.0)
        self.assertAlmostEqual(cutmix_box_height(64.0, 1.0), 0.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(cutmix_box_height(None, 0.5))
        self.assertIsNone(cutmix_box_height(64.0, None))
        self.assertIsNone(cutmix_box_height(0.0, 0.5))
        self.assertIsNone(cutmix_box_height(-1.0, 0.5))
        self.assertIsNone(cutmix_box_height(64.0, 1.5))
        self.assertIsNone(cutmix_box_height(64.0, float("nan")))
        self.assertIsNone(cutmix_box_height(float("inf"), 0.5))


if __name__ == "__main__":
    unittest.main()
