"""Offline identity tests for tinkabot_eq_physics_torque. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_torque as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("torque_perpendicular",))
        self.assertTrue(callable(m.torque_perpendicular))

    def test_no_forbidden_copies(self):
        for name in (
            "angular_velocity",
            "average_acceleration",
            "average_velocity",
            "buoyant_force",
            "period_from_frequency",
            "capacitance",
            "pressure",
            "density",
            "mechanical_work",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestTorque(unittest.TestCase):
    def test_stated_form(self):
        # 0.5 m * 20 N = 10 N·m
        self.assertEqual(m.torque_perpendicular(0.5, 20.0), 10.0)
        self.assertEqual(m.torque_perpendicular(0.0, 20.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.torque_perpendicular(None, 20.0))
        self.assertIsNone(m.torque_perpendicular(0.5, None))


if __name__ == "__main__":
    unittest.main()
