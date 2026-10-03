"""Offline identity tests for tinkabot_eq_physics_wave_speed. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_wave_speed as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("wave_speed",))
        self.assertTrue(callable(m.wave_speed))

    def test_no_forbidden_copies(self):
        for name in (
            "photon_energy",
            "coulomb_force",
            "ideal_gas_pressure",
            "euclidean_distance",
            "bradley_terry",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestWaveSpeed(unittest.TestCase):
    def test_stated_form(self):
        # f=2, λ=3 → v=6
        self.assertEqual(m.wave_speed(2.0, 3.0), 6.0)
        self.assertEqual(m.wave_speed(440.0, 0.78), 343.2)

    def test_null_missing(self):
        self.assertIsNone(m.wave_speed(None, 1.0))
        self.assertIsNone(m.wave_speed(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.wave_speed(0.0, 1.0))
        self.assertIsNone(m.wave_speed(-1.0, 1.0))
        self.assertIsNone(m.wave_speed(1.0, 0.0))
        self.assertIsNone(m.wave_speed(1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
