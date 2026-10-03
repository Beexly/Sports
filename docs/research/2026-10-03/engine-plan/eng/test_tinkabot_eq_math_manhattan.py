"""Offline identity tests for tinkabot_eq_math_manhattan. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_math_manhattan as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("manhattan_distance",))
        self.assertTrue(callable(m.manhattan_distance))

    def test_no_forbidden_copies(self):
        for name in (
            "leaky_relu",
            "frobenius_norm",
            "chebyshev_distance",
            "euclidean_distance",
            "mahalanobis_distance",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestManhattan(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.manhattan_distance([1.0, 2.0], [4.0, 0.0]), 5.0)
        self.assertEqual(m.manhattan_distance([0.0], [-3.0]), 3.0)
        self.assertEqual(m.manhattan_distance([1.0, 1.0], [1.0, 1.0]), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.manhattan_distance(None, [1.0]))
        self.assertIsNone(m.manhattan_distance([1.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.manhattan_distance([], []))
        self.assertIsNone(m.manhattan_distance([1.0], [1.0, 2.0]))


if __name__ == "__main__":
    unittest.main()
