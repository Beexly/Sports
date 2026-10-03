"""Offline identity tests for tinkabot_eq_physics_mechanical_work. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_mechanical_work as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("mechanical_work",))
        self.assertTrue(callable(m.mechanical_work))

    def test_no_forbidden_copies(self):
        for name in (
            "electrical_power",
            "doppler_frequency_stationary_observer",
            "gravitational_potential_energy",
            "root_mean_squared_error",
            "mean_squared_error",
            "kinetic_energy",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestWork(unittest.TestCase):
    def test_stated_form(self):
        # 10 N * 2 m = 20 J
        self.assertEqual(m.mechanical_work(10.0, 2.0), 20.0)
        self.assertEqual(m.mechanical_work(0.0, 5.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.mechanical_work(None, 2.0))
        self.assertIsNone(m.mechanical_work(10.0, None))


if __name__ == "__main__":
    unittest.main()
