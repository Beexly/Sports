"""Offline identity tests for tinkabot_eq_physics_newtons_second. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_newtons_second as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("newtons_second_law",))
        self.assertTrue(callable(m.newtons_second_law))

    def test_no_forbidden_copies(self):
        for name in (
            "photon_energy",
            "wave_speed",
            "coulomb_force",
            "ideal_gas_pressure",
            "kinetic_energy",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestNewtonsSecond(unittest.TestCase):
    def test_stated_form(self):
        # m=2, a=3 → F=6
        self.assertEqual(m.newtons_second_law(2.0, 3.0), 6.0)
        self.assertEqual(m.newtons_second_law(5.0, -2.0), -10.0)

    def test_null_missing(self):
        self.assertIsNone(m.newtons_second_law(None, 1.0))
        self.assertIsNone(m.newtons_second_law(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.newtons_second_law(0.0, 1.0))
        self.assertIsNone(m.newtons_second_law(-1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
