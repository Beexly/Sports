"""Offline identity tests for tinkabot_eq_ml_gelu. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_gelu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("gelu",))
        self.assertTrue(callable(m.gelu))

    def test_no_forbidden_copies(self):
        for name in (
            "circle_area",
            "mean_absolute_error",
            "newtons_second_law",
            "wave_speed",
            "relu",
            "softplus",
            "tanh",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestGelu(unittest.TestCase):
    def test_stated_form(self):
        # x=0 → 0 * Φ(0) = 0
        self.assertEqual(m.gelu(0.0), 0.0)
        # x=1 → 1 * Φ(1) = 0.5*(1+erf(1/√2))
        expected = 0.5 * (1.0 + math.erf(1.0 / math.sqrt(2.0)))
        self.assertAlmostEqual(m.gelu(1.0), expected)
        # negative: x=-1 → -1 * Φ(-1)
        expected_neg = -1.0 * 0.5 * (1.0 + math.erf(-1.0 / math.sqrt(2.0)))
        self.assertAlmostEqual(m.gelu(-1.0), expected_neg)

    def test_null_missing(self):
        self.assertIsNone(m.gelu(None))

    def test_large_positive_near_identity(self):
        # Φ(large) → 1, so gelu(x) ≈ x
        self.assertAlmostEqual(m.gelu(8.0), 8.0, places=6)


if __name__ == "__main__":
    unittest.main()
