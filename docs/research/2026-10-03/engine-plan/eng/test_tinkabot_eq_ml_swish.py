"""Offline identity tests for tinkabot_eq_ml_swish. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_swish as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("swish",))
        self.assertTrue(callable(m.swish))

    def test_no_forbidden_copies(self):
        for name in ("softmax", "elu", "gelu", "relu", "logistic_sigmoid"):
            self.assertFalse(hasattr(m, name), name)


class TestSwish(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.swish(0.0), 0.0)
        # x=1 → 1/(1+e^{-1})
        self.assertAlmostEqual(m.swish(1.0), 1.0 / (1.0 + math.exp(-1.0)))
        # x=-1 → -1 * σ(-1) = -1/(1+e)
        self.assertAlmostEqual(m.swish(-1.0), -1.0 / (1.0 + math.exp(1.0)))

    def test_null_missing(self):
        self.assertIsNone(m.swish(None))

    def test_large_positive_near_identity(self):
        self.assertAlmostEqual(m.swish(20.0), 20.0, places=6)


if __name__ == "__main__":
    unittest.main()
