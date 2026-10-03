"""Offline identity tests for tinkabot_eq_physics_angular_velocity. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_angular_velocity as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("angular_velocity",))
        self.assertTrue(callable(m.angular_velocity))

    def test_no_forbidden_copies(self):
        for name in (
            "average_acceleration",
            "average_velocity",
            "buoyant_force",
            "period_from_frequency",
            "capacitance",
            "pressure",
            "density",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAngVel(unittest.TestCase):
    def test_stated_form(self):
        # π rad / 2 s = π/2 rad/s
        self.assertAlmostEqual(m.angular_velocity(3.141592653589793, 2.0), 1.5707963267948966)
        self.assertEqual(m.angular_velocity(0.0, 2.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.angular_velocity(None, 2.0))
        self.assertIsNone(m.angular_velocity(1.0, None))

    def test_null_zero_dt(self):
        self.assertIsNone(m.angular_velocity(1.0, 0.0))


if __name__ == "__main__":
    unittest.main()
