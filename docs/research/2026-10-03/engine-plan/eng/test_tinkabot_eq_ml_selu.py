"""Offline identity tests for tinkabot_eq_ml_selu. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_selu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("selu",))
        self.assertTrue(callable(m.selu))

    def test_no_forbidden_copies(self):
        for name in (
            "mahalanobis_distance",
            "pearson_r",
            "elu",
            "mish",
            "relu",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSelu(unittest.TestCase):
    def test_stated_form(self):
        # x>0: λx
        self.assertEqual(m.selu(2.0, 1.5, 1.0), 3.0)
        # x<=0: λ α (exp(x)-1)
        self.assertAlmostEqual(
            m.selu(-1.0, 1.0, 1.0),
            1.0 * 1.0 * (math.exp(-1.0) - 1.0),
        )
        self.assertAlmostEqual(
            m.selu(0.0, 2.0, 3.0),
            2.0 * 3.0 * (math.exp(0.0) - 1.0),
        )

    def test_null_missing(self):
        self.assertIsNone(m.selu(None, 1.0, 1.0))
        self.assertIsNone(m.selu(1.0, None, 1.0))
        self.assertIsNone(m.selu(1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.selu(1.0, 0.0, 1.0))
        self.assertIsNone(m.selu(1.0, -1.0, 1.0))
        self.assertIsNone(m.selu(1.0, 1.0, 0.0))
        self.assertIsNone(m.selu(1.0, 1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
