"""Tests for soft_margin."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_soft_margin import COLUMN_BACKED_FUNCS, IDENTITY, soft_margin


class TestSoftMargin(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("soft_margin", COLUMN_BACKED_FUNCS)

    def test_zero_score(self) -> None:
        self.assertAlmostEqual(soft_margin(1.0, 0.0), math.log(2.0), places=12)

    def test_confident(self) -> None:
        # y=1, z large positive → near 0
        self.assertLess(soft_margin(1.0, 20.0), 1e-8)

    def test_basic(self) -> None:
        expected = math.log(1.0 + math.exp(-1.0 * 1.0))
        self.assertAlmostEqual(soft_margin(1.0, 1.0), expected, places=12)

    def test_null_guards(self) -> None:
        self.assertIsNone(soft_margin(None, 1.0))
        self.assertIsNone(soft_margin(0.0, 1.0))
        self.assertIsNone(soft_margin(2.0, 1.0))
        self.assertIsNone(soft_margin(1.0, float("nan")))


if __name__ == "__main__":
    unittest.main()
