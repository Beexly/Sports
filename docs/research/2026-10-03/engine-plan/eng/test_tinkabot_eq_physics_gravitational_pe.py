"""Offline identity tests for tinkabot_eq_physics_gravitational_pe. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_gravitational_pe as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("gravitational_potential_energy",)
        )
        self.assertTrue(callable(m.gravitational_potential_energy))

    def test_no_forbidden_copies(self):
        for name in (
            "root_mean_squared_error",
            "mean_squared_error",
            "mean_absolute_error",
            "kinetic_energy",
            "group_norm",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPE(unittest.TestCase):
    def test_stated_form(self):
        # 2 kg * 9.8 m/s² * 3 m = 58.8 J
        self.assertAlmostEqual(
            m.gravitational_potential_energy(2.0, 9.8, 3.0), 58.8
        )
        self.assertEqual(m.gravitational_potential_energy(0.0, 9.8, 10.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.gravitational_potential_energy(None, 9.8, 1.0))
        self.assertIsNone(m.gravitational_potential_energy(1.0, None, 1.0))
        self.assertIsNone(m.gravitational_potential_energy(1.0, 9.8, None))


if __name__ == "__main__":
    unittest.main()
