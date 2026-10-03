"""Tests for adadelta_delta_sq_avg (Ruder arXiv:1609.04747 Eq. 15)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_adadelta_delta_sq_avg import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    adadelta_delta_sq_avg,
)


class TestAdadeltaDeltaSqAvg(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("adadelta_delta_sq_avg", COLUMN_BACKED_FUNCS)

    def test_basic(self) -> None:
        # E=1, Δθ=1, γ=0.9 → 0.9 + 0.1 = 1.0
        self.assertAlmostEqual(adadelta_delta_sq_avg(1.0, 1.0, 0.9), 1.0)

    def test_from_zero(self) -> None:
        # E=0, Δθ=2, γ=0.9 → 0.1 * 4 = 0.4
        self.assertAlmostEqual(adadelta_delta_sq_avg(0.0, 2.0, 0.9), 0.4)

    def test_null_guards(self) -> None:
        self.assertIsNone(adadelta_delta_sq_avg(None, 1.0, 0.9))
        self.assertIsNone(adadelta_delta_sq_avg(1.0, None, 0.9))
        self.assertIsNone(adadelta_delta_sq_avg(1.0, 1.0, 0.0))
        self.assertIsNone(adadelta_delta_sq_avg(1.0, 1.0, 1.0))
        self.assertIsNone(adadelta_delta_sq_avg(-0.1, 1.0, 0.9))
        self.assertIsNone(adadelta_delta_sq_avg(1.0, float("nan"), 0.9))


if __name__ == "__main__":
    unittest.main()
