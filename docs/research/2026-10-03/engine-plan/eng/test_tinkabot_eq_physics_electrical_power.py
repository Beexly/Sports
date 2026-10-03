"""Offline identity tests for tinkabot_eq_physics_electrical_power. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_electrical_power as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("electrical_power",))
        self.assertTrue(callable(m.electrical_power))

    def test_no_forbidden_copies(self):
        for name in (
            "doppler_frequency_stationary_observer",
            "gravitational_potential_energy",
            "root_mean_squared_error",
            "mean_squared_error",
            "ohm",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPower(unittest.TestCase):
    def test_stated_form(self):
        # 2 A * 120 V = 240 W
        self.assertEqual(m.electrical_power(2.0, 120.0), 240.0)
        self.assertEqual(m.electrical_power(0.0, 120.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.electrical_power(None, 120.0))
        self.assertIsNone(m.electrical_power(2.0, None))


if __name__ == "__main__":
    unittest.main()
