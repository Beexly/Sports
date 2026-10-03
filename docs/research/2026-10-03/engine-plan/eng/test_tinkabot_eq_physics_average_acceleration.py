"""Offline identity tests for tinkabot_eq_physics_average_acceleration. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_average_acceleration as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("average_acceleration",))
        self.assertTrue(callable(m.average_acceleration))

    def test_no_forbidden_copies(self):
        for name in (
            "average_velocity",
            "buoyant_force",
            "period_from_frequency",
            "capacitance",
            "pressure",
            "density",
            "newtons_second",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestAvgAcc(unittest.TestCase):
    def test_stated_form(self):
        # 10 m/s / 2 s = 5 m/s²
        self.assertEqual(m.average_acceleration(10.0, 2.0), 5.0)
        self.assertEqual(m.average_acceleration(0.0, 2.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.average_acceleration(None, 2.0))
        self.assertIsNone(m.average_acceleration(10.0, None))

    def test_null_zero_dt(self):
        self.assertIsNone(m.average_acceleration(10.0, 0.0))


if __name__ == "__main__":
    unittest.main()
