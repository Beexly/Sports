"""Offline identity tests for tinkabot_eq_physics_capacitance. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_capacitance as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("capacitance",))
        self.assertTrue(callable(m.capacitance))

    def test_no_forbidden_copies(self):
        for name in (
            "pressure",
            "density",
            "linear_momentum",
            "impulse",
            "centripetal_force",
            "mechanical_work",
            "electrical_power",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCapacitance(unittest.TestCase):
    def test_stated_form(self):
        # 10 C / 5 V = 2 F
        self.assertEqual(m.capacitance(10.0, 5.0), 2.0)
        self.assertEqual(m.capacitance(0.0, 5.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.capacitance(None, 5.0))
        self.assertIsNone(m.capacitance(10.0, None))

    def test_null_zero_voltage(self):
        self.assertIsNone(m.capacitance(10.0, 0.0))


if __name__ == "__main__":
    unittest.main()
