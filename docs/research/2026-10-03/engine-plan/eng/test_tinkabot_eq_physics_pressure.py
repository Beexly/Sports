"""Offline identity tests for tinkabot_eq_physics_pressure. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_pressure as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("pressure",))
        self.assertTrue(callable(m.pressure))

    def test_no_forbidden_copies(self):
        for name in (
            "density",
            "linear_momentum",
            "impulse",
            "centripetal_force",
            "mechanical_work",
            "electrical_power",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPressure(unittest.TestCase):
    def test_stated_form(self):
        # 100 N / 0.5 m² = 200 Pa
        self.assertEqual(m.pressure(100.0, 0.5), 200.0)
        self.assertEqual(m.pressure(0.0, 1.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.pressure(None, 1.0))
        self.assertIsNone(m.pressure(100.0, None))

    def test_null_bad_area(self):
        self.assertIsNone(m.pressure(100.0, 0.0))
        self.assertIsNone(m.pressure(100.0, -1.0))


if __name__ == "__main__":
    unittest.main()
