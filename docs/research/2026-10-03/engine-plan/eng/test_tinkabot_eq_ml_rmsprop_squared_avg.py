"""Tests for rmsprop_squared_avg (Ruder arXiv:1609.04747 Eq. 18)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_rmsprop_squared_avg import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    rmsprop_squared_avg,
)


class TestRmspropSquaredAvg(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("rmsprop_squared_avg", COLUMN_BACKED_FUNCS)

    def test_hinton_defaults(self) -> None:
        # E=1, g=1, γ=0.9 → 0.9*1 + 0.1*1 = 1.0
        self.assertAlmostEqual(rmsprop_squared_avg(1.0, 1.0, 0.9), 1.0)

    def test_from_zero(self) -> None:
        # E=0, g=2, γ=0.9 → 0.1 * 4 = 0.4
        self.assertAlmostEqual(rmsprop_squared_avg(0.0, 2.0, 0.9), 0.4)

    def test_null_guards(self) -> None:
        self.assertIsNone(rmsprop_squared_avg(None, 1.0, 0.9))
        self.assertIsNone(rmsprop_squared_avg(1.0, None, 0.9))
        self.assertIsNone(rmsprop_squared_avg(1.0, 1.0, 0.0))
        self.assertIsNone(rmsprop_squared_avg(1.0, 1.0, 1.0))
        self.assertIsNone(rmsprop_squared_avg(-0.1, 1.0, 0.9))
        self.assertIsNone(rmsprop_squared_avg(1.0, float("nan"), 0.9))


if __name__ == "__main__":
    unittest.main()
