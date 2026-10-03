"""Offline identity tests for tinkabot_eq_math_mahalanobis. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_math_mahalanobis as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("mahalanobis_distance",))
        self.assertTrue(callable(m.mahalanobis_distance))

    def test_no_forbidden_copies(self):
        for name in ("pearson_r", "mish", "euclidean_distance", "focal_loss"):
            self.assertFalse(hasattr(m, name), name)


class TestMahalanobis(unittest.TestCase):
    def test_stated_form(self):
        # x=[3], μ=[0], var=[1] → √9 = 3
        self.assertEqual(m.mahalanobis_distance([3.0], [0.0], [1.0]), 3.0)
        # x=[3,4], μ=[0,0], var=[1,1] → √(9+16)=5
        self.assertEqual(m.mahalanobis_distance([3.0, 4.0], [0.0, 0.0], [1.0, 1.0]), 5.0)
        # var=[9,16]: √(9/9 + 16/16)=√2
        self.assertAlmostEqual(
            m.mahalanobis_distance([3.0, 4.0], [0.0, 0.0], [9.0, 16.0]),
            math.sqrt(2.0),
        )

    def test_null_missing(self):
        self.assertIsNone(m.mahalanobis_distance(None, [0.0], [1.0]))
        self.assertIsNone(m.mahalanobis_distance([1.0], None, [1.0]))
        self.assertIsNone(m.mahalanobis_distance([1.0], [0.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.mahalanobis_distance([], [], []))
        self.assertIsNone(m.mahalanobis_distance([1.0], [0.0], [0.0]))
        self.assertIsNone(m.mahalanobis_distance([1.0, 2.0], [0.0], [1.0]))


if __name__ == "__main__":
    unittest.main()
