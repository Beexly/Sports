"""Offline identity tests for tinkabot_eq_physics_heat_capacity. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_heat_capacity as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("heat_for_temperature_change",)
        )
        self.assertTrue(callable(m.heat_for_temperature_change))

    def test_no_forbidden_copies(self):
        for name in (
            "mechanical_power",
            "electrical_power",
            "torque_perpendicular",
            "angular_velocity",
            "average_acceleration",
            "average_velocity",
            "buoyant_force",
            "period_from_frequency",
            "capacitance",
            "pressure",
            "density",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestHeat(unittest.TestCase):
    def test_stated_form(self):
        # 2 kg * 4186 J/(kg·°C) * 5 °C = 41860 J
        self.assertEqual(m.heat_for_temperature_change(2.0, 4186.0, 5.0), 41860.0)
        self.assertEqual(m.heat_for_temperature_change(1.0, 100.0, 0.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.heat_for_temperature_change(None, 4186.0, 5.0))
        self.assertIsNone(m.heat_for_temperature_change(2.0, None, 5.0))
        self.assertIsNone(m.heat_for_temperature_change(2.0, 4186.0, None))


if __name__ == "__main__":
    unittest.main()
