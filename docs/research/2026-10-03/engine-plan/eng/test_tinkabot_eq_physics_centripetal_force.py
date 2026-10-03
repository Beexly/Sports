"""Offline identity tests for tinkabot_eq_physics_centripetal_force. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_centripetal_force as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("centripetal_force",))
        self.assertTrue(callable(m.centripetal_force))

    def test_no_forbidden_copies(self):
        for name in (
            "mechanical_work",
            "electrical_power",
            "doppler_frequency_stationary_observer",
            "gravitational_potential_energy",
            "root_mean_squared_error",
            "mean_squared_error",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCentripetal(unittest.TestCase):
    def test_stated_form(self):
        # 2 kg * (3 m/s)² / 1.5 m = 2*9/1.5 = 12 N
        self.assertAlmostEqual(m.centripetal_force(2.0, 3.0, 1.5), 12.0)
        self.assertEqual(m.centripetal_force(1.0, 0.0, 2.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.centripetal_force(None, 3.0, 1.0))
        self.assertIsNone(m.centripetal_force(1.0, None, 1.0))
        self.assertIsNone(m.centripetal_force(1.0, 3.0, None))

    def test_null_bad_radius(self):
        self.assertIsNone(m.centripetal_force(1.0, 3.0, 0.0))
        self.assertIsNone(m.centripetal_force(1.0, 3.0, -1.0))


if __name__ == "__main__":
    unittest.main()
