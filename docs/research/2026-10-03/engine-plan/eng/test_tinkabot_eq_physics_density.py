"""Offline identity tests for tinkabot_eq_physics_density. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_density as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("density",))
        self.assertTrue(callable(m.density))

    def test_no_forbidden_copies(self):
        for name in (
            "linear_momentum",
            "impulse",
            "centripetal_force",
            "mechanical_work",
            "electrical_power",
            "doppler_frequency_stationary_observer",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestDensity(unittest.TestCase):
    def test_stated_form(self):
        # 10 kg / 2 m³ = 5 kg/m³
        self.assertEqual(m.density(10.0, 2.0), 5.0)
        self.assertEqual(m.density(0.0, 1.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.density(None, 2.0))
        self.assertIsNone(m.density(10.0, None))

    def test_null_bad_volume(self):
        self.assertIsNone(m.density(10.0, 0.0))
        self.assertIsNone(m.density(10.0, -1.0))


if __name__ == "__main__":
    unittest.main()
