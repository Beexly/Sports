"""Tests for momentum_param (Sutskever et al. ICML 2013 Eq. 1)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_momentum_param import COLUMN_BACKED_FUNCS, IDENTITY, momentum_param


class TestMomentumParam(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("momentum_param", COLUMN_BACKED_FUNCS)

    def test_basic_step(self) -> None:
        self.assertAlmostEqual(momentum_param(1.0, -0.25), 0.75)

    def test_zero_velocity(self) -> None:
        self.assertAlmostEqual(momentum_param(3.5, 0.0), 3.5)

    def test_null_guards(self) -> None:
        self.assertIsNone(momentum_param(None, 0.1))
        self.assertIsNone(momentum_param(1.0, None))
        self.assertIsNone(momentum_param(float("nan"), 0.1))
        self.assertIsNone(momentum_param(1.0, float("inf")))


if __name__ == "__main__":
    unittest.main()
