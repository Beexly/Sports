"""Offline identity tests for tinkabot_eq_math_frobenius. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_math_frobenius as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("frobenius_norm",))
        self.assertTrue(callable(m.frobenius_norm))

    def test_no_forbidden_copies(self):
        for name in ("selu", "mahalanobis_distance", "euclidean_distance", "pearson_r"):
            self.assertFalse(hasattr(m, name), name)


class TestFrobenius(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.frobenius_norm([3.0, 4.0]), 5.0)
        self.assertEqual(m.frobenius_norm([1.0, -2.0, 2.0]), 3.0)
        self.assertAlmostEqual(m.frobenius_norm([1.0]), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.frobenius_norm(None))

    def test_null_bad(self):
        self.assertIsNone(m.frobenius_norm([]))


if __name__ == "__main__":
    unittest.main()
