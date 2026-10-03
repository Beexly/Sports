"""Offline identity tests for tinkabot_eq_physics_impulse. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_impulse as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("impulse",))
        self.assertTrue(callable(m.impulse))

    def test_no_forbidden_copies(self):
        for name in (
            "centripetal_force",
            "mechanical_work",
            "electrical_power",
            "doppler_frequency_stationary_observer",
            "gravitational_potential_energy",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestImpulse(unittest.TestCase):
    def test_stated_form(self):
        # 50 N * 0.1 s = 5 N·s
        self.assertAlmostEqual(m.impulse(50.0, 0.1), 5.0)
        self.assertEqual(m.impulse(0.0, 2.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.impulse(None, 0.1))
        self.assertIsNone(m.impulse(50.0, None))


if __name__ == "__main__":
    unittest.main()
