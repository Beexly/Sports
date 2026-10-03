"""Offline identity tests for tinkabot_eq_physics_buoyant_force. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_buoyant_force as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("buoyant_force",))
        self.assertTrue(callable(m.buoyant_force))

    def test_no_forbidden_copies(self):
        for name in (
            "period_from_frequency",
            "capacitance",
            "pressure",
            "density",
            "electrical_power",
            "wave_speed",
            "gravitational_potential_energy",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestBuoyant(unittest.TestCase):
    def test_stated_form(self):
        # 1000 kg/m³ * 0.002 m³ * 9.8 m/s² = 19.6 N
        self.assertAlmostEqual(m.buoyant_force(1000.0, 0.002, 9.8), 19.6)
        self.assertEqual(m.buoyant_force(1000.0, 0.0, 9.8), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.buoyant_force(None, 0.002, 9.8))
        self.assertIsNone(m.buoyant_force(1000.0, None, 9.8))
        self.assertIsNone(m.buoyant_force(1000.0, 0.002, None))


if __name__ == "__main__":
    unittest.main()
