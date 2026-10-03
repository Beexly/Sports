"""Offline identity tests for tinkabot_eq_math_chebyshev. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_math_chebyshev as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("chebyshev_distance",))
        self.assertTrue(callable(m.chebyshev_distance))

    def test_no_forbidden_copies(self):
        for name in (
            "frobenius_norm",
            "selu",
            "leaky_relu",
            "euclidean_distance",
            "mahalanobis_distance",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestChebyshev(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.chebyshev_distance([1.0, 2.0], [4.0, 0.0]), 3.0)
        self.assertEqual(m.chebyshev_distance([0.0], [5.0]), 5.0)
        self.assertEqual(m.chebyshev_distance([1.0, 1.0], [1.0, 1.0]), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.chebyshev_distance(None, [1.0]))
        self.assertIsNone(m.chebyshev_distance([1.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.chebyshev_distance([], []))
        self.assertIsNone(m.chebyshev_distance([1.0], [1.0, 2.0]))


if __name__ == "__main__":
    unittest.main()
