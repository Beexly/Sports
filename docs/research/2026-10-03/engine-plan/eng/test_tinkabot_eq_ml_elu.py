"""Offline identity tests for tinkabot_eq_ml_elu. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_elu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("elu",))
        self.assertTrue(callable(m.elu))

    def test_no_forbidden_copies(self):
        for name in ("gelu", "circle_area", "mean_absolute_error", "relu", "softplus"):
            self.assertFalse(hasattr(m, name), name)


class TestElu(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.elu(2.0, 1.0), 2.0)
        self.assertEqual(m.elu(0.0, 1.0), 1.0 * (math.exp(0.0) - 1.0))
        self.assertAlmostEqual(m.elu(-1.0, 1.0), math.exp(-1.0) - 1.0)
        self.assertAlmostEqual(m.elu(-1.0, 2.0), 2.0 * (math.exp(-1.0) - 1.0))

    def test_null_missing(self):
        self.assertIsNone(m.elu(None, 1.0))
        self.assertIsNone(m.elu(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.elu(1.0, 0.0))
        self.assertIsNone(m.elu(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
