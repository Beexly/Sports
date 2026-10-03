"""Offline identity tests for tinkabot_eq_math_euclidean_distance. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_math_euclidean_distance as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("euclidean_distance",))
        self.assertTrue(callable(m.euclidean_distance))

    def test_no_forbidden_copies(self):
        for name in (
            "cosine_similarity",
            "tanh",
            "snells_law_n2",
            "kinetic_energy",
            "ohms_law",
            "logistic_sigmoid",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestEuclidean(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.euclidean_distance(0.0, 0.0, 3.0, 4.0), 5.0)
        self.assertEqual(m.euclidean_distance(1.0, 1.0, 1.0, 1.0), 0.0)
        self.assertAlmostEqual(
            m.euclidean_distance(0.0, 0.0, 1.0, 1.0),
            math.sqrt(2.0),
            places=12,
        )

    def test_null_missing(self):
        self.assertIsNone(m.euclidean_distance(None, 0.0, 1.0, 0.0))
        self.assertIsNone(m.euclidean_distance(0.0, None, 1.0, 0.0))
        self.assertIsNone(m.euclidean_distance(0.0, 0.0, None, 0.0))
        self.assertIsNone(m.euclidean_distance(0.0, 0.0, 1.0, None))


if __name__ == "__main__":
    unittest.main()
