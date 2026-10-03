"""Offline identity tests for tinkabot_eq_physics_period. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_period as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("period_from_frequency",))
        self.assertTrue(callable(m.period_from_frequency))

    def test_no_forbidden_copies(self):
        for name in (
            "capacitance",
            "pressure",
            "density",
            "linear_momentum",
            "impulse",
            "electrical_power",
            "wave_speed",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPeriod(unittest.TestCase):
    def test_stated_form(self):
        # f = 2 Hz → T = 0.5 s
        self.assertEqual(m.period_from_frequency(2.0), 0.5)
        self.assertEqual(m.period_from_frequency(0.5), 2.0)

    def test_null_missing(self):
        self.assertIsNone(m.period_from_frequency(None))

    def test_null_bad(self):
        self.assertIsNone(m.period_from_frequency(0.0))
        self.assertIsNone(m.period_from_frequency(-1.0))


if __name__ == "__main__":
    unittest.main()
