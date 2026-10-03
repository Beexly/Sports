"""Offline identity tests for tinkabot_eq_physics_kinetic_energy. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_kinetic_energy as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("kinetic_energy",))
        self.assertTrue(callable(m.kinetic_energy))

    def test_no_forbidden_copies(self):
        for name in (
            "ohms_law",
            "logistic_sigmoid",
            "relu",
            "beer_lambert",
            "hookes_law",
            "softplus",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestKE(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.kinetic_energy(2.0, 3.0), 9.0)  # 0.5*2*9
        self.assertEqual(m.kinetic_energy(4.0, 0.0), 0.0)
        self.assertEqual(m.kinetic_energy(1.0, -2.0), 2.0)

    def test_null_missing(self):
        self.assertIsNone(m.kinetic_energy(None, 1.0))
        self.assertIsNone(m.kinetic_energy(1.0, None))

    def test_null_bad_m(self):
        self.assertIsNone(m.kinetic_energy(0.0, 1.0))
        self.assertIsNone(m.kinetic_energy(-1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
