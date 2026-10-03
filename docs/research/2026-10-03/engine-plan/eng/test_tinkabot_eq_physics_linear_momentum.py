"""Offline identity tests for tinkabot_eq_physics_linear_momentum. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_linear_momentum as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("linear_momentum",))
        self.assertTrue(callable(m.linear_momentum))

    def test_no_forbidden_copies(self):
        for name in (
            "impulse",
            "centripetal_force",
            "mechanical_work",
            "electrical_power",
            "doppler_frequency_stationary_observer",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestMomentum(unittest.TestCase):
    def test_stated_form(self):
        # 3 kg * 4 m/s = 12 kg·m/s
        self.assertEqual(m.linear_momentum(3.0, 4.0), 12.0)
        self.assertEqual(m.linear_momentum(2.0, 0.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.linear_momentum(None, 4.0))
        self.assertIsNone(m.linear_momentum(3.0, None))


if __name__ == "__main__":
    unittest.main()
