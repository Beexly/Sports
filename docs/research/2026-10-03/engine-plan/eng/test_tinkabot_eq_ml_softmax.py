"""Offline identity tests for tinkabot_eq_ml_softmax. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_softmax as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("softmax",))
        self.assertTrue(callable(m.softmax))

    def test_no_forbidden_copies(self):
        for name in ("elu", "gelu", "relu", "tanh", "logistic_sigmoid"):
            self.assertFalse(hasattr(m, name), name)


class TestSoftmax(unittest.TestCase):
    def test_stated_form(self):
        out = m.softmax([0.0, 0.0])
        self.assertIsNotNone(out)
        self.assertEqual(len(out), 2)
        self.assertAlmostEqual(out[0], 0.5)
        self.assertAlmostEqual(out[1], 0.5)
        # [1, 2]: exp(1)/(e+e²), exp(2)/(e+e²)
        e1 = math.exp(1.0)
        e2 = math.exp(2.0)
        s = e1 + e2
        out2 = m.softmax([1.0, 2.0])
        self.assertAlmostEqual(out2[0], e1 / s)
        self.assertAlmostEqual(out2[1], e2 / s)
        self.assertAlmostEqual(sum(out2), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.softmax(None))

    def test_null_bad(self):
        self.assertIsNone(m.softmax([]))
        self.assertIsNone(m.softmax([float("nan")]))
        self.assertIsNone(m.softmax([float("inf")]))


if __name__ == "__main__":
    unittest.main()
