"""Offline identity tests for tinkabot_eq_ml_mish. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_mish as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("mish",))
        self.assertTrue(callable(m.mish))

    def test_no_forbidden_copies(self):
        for name in ("focal_loss", "swish", "softmax", "elu", "gelu", "softplus"):
            self.assertFalse(hasattr(m, name), name)


class TestMish(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.mish(0.0), 0.0)
        # x=1 → 1 * tanh(ln(1+e))
        expected = 1.0 * math.tanh(math.log1p(math.exp(1.0)))
        self.assertAlmostEqual(m.mish(1.0), expected)
        expected_neg = -1.0 * math.tanh(math.log1p(math.exp(-1.0)))
        self.assertAlmostEqual(m.mish(-1.0), expected_neg)

    def test_null_missing(self):
        self.assertIsNone(m.mish(None))

    def test_large_positive_near_identity(self):
        self.assertAlmostEqual(m.mish(10.0), 10.0, places=5)


if __name__ == "__main__":
    unittest.main()
