"""Offline identity tests for tinkabot_eq_math_minkowski. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_math_minkowski as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("minkowski_distance",))
        self.assertTrue(callable(m.minkowski_distance))

    def test_no_forbidden_copies(self):
        for name in (
            "chebyshev_distance",
            "leaky_relu",
            "manhattan_distance",
            "euclidean_distance",
            "frobenius_norm",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestMinkowski(unittest.TestCase):
    def test_stated_form(self):
        # p=1 → Manhattan 5
        self.assertEqual(m.minkowski_distance([1.0, 2.0], [4.0, 0.0], 1.0), 5.0)
        # p=2 → Euclidean 5 for 3-4-5
        self.assertEqual(m.minkowski_distance([0.0, 0.0], [3.0, 4.0], 2.0), 5.0)
        # p=3: (|3|^3+|4|^3)^{1/3} = (27+64)^{1/3}=91^{1/3}
        self.assertAlmostEqual(
            m.minkowski_distance([0.0, 0.0], [3.0, 4.0], 3.0),
            91.0 ** (1.0 / 3.0),
        )

    def test_null_missing(self):
        self.assertIsNone(m.minkowski_distance(None, [1.0], 2.0))
        self.assertIsNone(m.minkowski_distance([1.0], None, 2.0))
        self.assertIsNone(m.minkowski_distance([1.0], [0.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.minkowski_distance([], [], 2.0))
        self.assertIsNone(m.minkowski_distance([1.0], [1.0, 2.0], 2.0))
        self.assertIsNone(m.minkowski_distance([1.0], [0.0], 0.0))
        self.assertIsNone(m.minkowski_distance([1.0], [0.0], -1.0))


if __name__ == "__main__":
    unittest.main()
