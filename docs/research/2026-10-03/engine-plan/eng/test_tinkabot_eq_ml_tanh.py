"""Offline identity tests for tinkabot_eq_ml_tanh. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_tanh as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("tanh",))
        self.assertTrue(callable(m.tanh))

    def test_no_forbidden_copies(self):
        for name in (
            "snells_law_n2",
            "kinetic_energy",
            "ohms_law",
            "logistic_sigmoid",
            "relu",
            "softplus",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestTanh(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.tanh(0.0), 0.0)
        x = 1.0
        want = (math.exp(x) - math.exp(-x)) / (math.exp(x) + math.exp(-x))
        self.assertAlmostEqual(m.tanh(x), want, places=12)
        self.assertAlmostEqual(m.tanh(-x), -want, places=12)

    def test_null_missing(self):
        self.assertIsNone(m.tanh(None))


if __name__ == "__main__":
    unittest.main()
