"""Offline identity tests for tinkabot_eq_math_circle_area. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_math_circle_area as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("circle_area",))
        self.assertTrue(callable(m.circle_area))

    def test_no_forbidden_copies(self):
        for name in (
            "newtons_second_law",
            "wave_speed",
            "mean_absolute_error",
            "euclidean_distance",
            "photon_energy",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCircleArea(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.circle_area(0.0), 0.0)
        self.assertAlmostEqual(m.circle_area(1.0), math.pi)
        self.assertAlmostEqual(m.circle_area(2.0), 4.0 * math.pi)

    def test_null_missing(self):
        self.assertIsNone(m.circle_area(None))

    def test_null_bad(self):
        self.assertIsNone(m.circle_area(-1.0))


if __name__ == "__main__":
    unittest.main()
