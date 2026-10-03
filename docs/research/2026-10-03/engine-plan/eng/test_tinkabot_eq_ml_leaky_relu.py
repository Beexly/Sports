"""Offline identity tests for tinkabot_eq_ml_leaky_relu. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_leaky_relu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("leaky_relu",))
        self.assertTrue(callable(m.leaky_relu))

    def test_no_forbidden_copies(self):
        for name in ("selu", "frobenius_norm", "relu", "elu", "mahalanobis_distance"):
            self.assertFalse(hasattr(m, name), name)


class TestLeakyRelu(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.leaky_relu(3.0, 0.01), 3.0)
        self.assertEqual(m.leaky_relu(-2.0, 0.1), -0.2)
        self.assertEqual(m.leaky_relu(0.0, 0.01), 0.0)
        self.assertEqual(m.leaky_relu(-4.0, 0.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.leaky_relu(None, 0.01))
        self.assertIsNone(m.leaky_relu(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.leaky_relu(1.0, -0.01))


if __name__ == "__main__":
    unittest.main()
